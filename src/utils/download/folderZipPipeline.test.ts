import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { unzipSync } from "fflate";

import { createAbortError } from "@/utils/network/abort";

import { downloadFolderAsZip, prepareZipOutputSink } from "./folderZipPipeline";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const createStreamResponse = (
  chunks: string[],
  options: {
    blobSpy?: ReturnType<typeof vi.fn>;
  } = {},
): Response => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return {
    ok: true,
    status: 200,
    statusText: "OK",
    body: stream,
    blob: options.blobSpy ?? vi.fn(),
  } as unknown as Response;
};

const concatChunks = (chunks: Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
};

describe("downloadFolderAsZip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to Blob download and streams file chunks into the zip", async () => {
    const saveAsImpl = vi.fn();
    const blobSpy = vi.fn();
    const fetchImpl = vi.fn(async () => createStreamResponse(["hello ", "world"], { blobSpy }));

    await downloadFolderAsZip({
      files: [{ path: "docs/readme.txt", url: "https://example.com/readme.txt" }],
      signal: new AbortController().signal,
      archiveName: "docs.zip",
      fetchImpl,
      saveAsImpl,
      showSaveFilePickerImpl: null,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(blobSpy).not.toHaveBeenCalled();
    expect(saveAsImpl).toHaveBeenCalledTimes(1);

    const [savedBlob, savedName] = saveAsImpl.mock.calls[0] as [Blob, string];
    expect(savedName).toBe("docs.zip");

    const unzipped = unzipSync(new Uint8Array(await savedBlob.arrayBuffer()));
    expect(decoder.decode(unzipped["docs/readme.txt"])).toBe("hello world");
  });

  it("can prepare the native output sink before downloads start", async () => {
    const writtenChunks: Uint8Array[] = [];
    const saveAsImpl = vi.fn();
    const write = vi.fn(async (chunk: Uint8Array) => {
      writtenChunks.push(chunk);
    });
    const close = vi.fn(async () => {});
    const abort = vi.fn(async () => {});
    const writable = {
      write,
      close,
      abort,
    } as unknown as FileSystemWritableFileStream;
    const createWritable = vi.fn(async () => writable);
    const showSaveFilePickerImpl = vi.fn(async () => ({
      createWritable,
    })) as unknown as (options?: unknown) => Promise<FileSystemFileHandle>;
    const fetchImpl = vi.fn(async () => createStreamResponse(["native sink"]));
    const outputSink = await prepareZipOutputSink({
      archiveName: "native.zip",
      saveAsImpl,
      showSaveFilePickerImpl,
    });

    expect(showSaveFilePickerImpl).toHaveBeenCalledTimes(1);
    expect(createWritable).toHaveBeenCalledTimes(1);

    await downloadFolderAsZip({
      files: [{ path: "docs/native.txt", url: "https://example.com/native.txt" }],
      signal: new AbortController().signal,
      archiveName: "native.zip",
      outputSink,
      fetchImpl,
      saveAsImpl,
      showSaveFilePickerImpl,
    });

    expect(showSaveFilePickerImpl).toHaveBeenCalledTimes(1);
    expect(saveAsImpl).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);

    const unzipped = unzipSync(concatChunks(writtenChunks));
    expect(decoder.decode(unzipped["docs/native.txt"])).toBe("native sink");
  });

  it("continues when a single file download fails", async () => {
    const saveAsImpl = vi.fn();
    const onFileError = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const target = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;

      if (target.includes("missing")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
          body: null,
        } as unknown as Response;
      }

      return createStreamResponse(["kept"]);
    });

    await downloadFolderAsZip({
      files: [
        { path: "docs/missing.txt", url: "https://example.com/missing.txt" },
        { path: "docs/kept.txt", url: "https://example.com/kept.txt" },
      ],
      signal: new AbortController().signal,
      archiveName: "partial.zip",
      fetchImpl,
      saveAsImpl,
      showSaveFilePickerImpl: null,
      onFileError,
    });

    expect(onFileError).toHaveBeenCalledTimes(1);
    const [savedBlob] = saveAsImpl.mock.calls[0] as [Blob, string];
    const unzipped = unzipSync(new Uint8Array(await savedBlob.arrayBuffer()));

    expect(Object.keys(unzipped)).toEqual(["docs/kept.txt"]);
    expect(decoder.decode(unzipped["docs/kept.txt"])).toBe("kept");
  });

  it("aborts the active reader and sink when cancellation happens mid-stream", async () => {
    const abortController = new AbortController();
    const cancel = vi.fn(async () => {});
    const releaseLock = vi.fn();
    const write = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    const abort = vi.fn(async () => {});
    let resolveSecondReadStart: (() => void) | null = null;
    const secondReadStarted = new Promise<void>((resolve) => {
      resolveSecondReadStart = resolve;
    });
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: encoder.encode("chunk-1") })
        .mockImplementationOnce(
          () =>
            new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
              resolveSecondReadStart?.();
              abortController.signal.addEventListener(
                "abort",
                () => reject(createAbortError("Download aborted")),
                { once: true },
              );
            }),
        ),
      cancel,
      releaseLock,
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      body: {
        getReader: () => reader,
      },
    })) as typeof fetch;
    const showSaveFilePickerImpl = vi.fn(async () => ({
      createWritable: async () =>
        ({
          write,
          close,
          abort,
        }) as unknown as FileSystemWritableFileStream,
    })) as unknown as (options?: unknown) => Promise<FileSystemFileHandle>;

    const promise = downloadFolderAsZip({
      files: [{ path: "docs/stream.txt", url: "https://example.com/stream.txt" }],
      signal: abortController.signal,
      archiveName: "stream.zip",
      fetchImpl,
      showSaveFilePickerImpl,
    });

    await secondReadStarted;
    abortController.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
    expect(abort).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it("treats picker cancellation as an abort without starting any fetches", async () => {
    const fetchImpl = vi.fn();
    const showSaveFilePickerImpl = vi.fn(async () => {
      throw createAbortError("User cancelled");
    }) as unknown as (options?: unknown) => Promise<FileSystemFileHandle>;

    await expect(
      downloadFolderAsZip({
        files: [{ path: "docs/ignored.txt", url: "https://example.com/ignored.txt" }],
        signal: new AbortController().signal,
        archiveName: "ignored.zip",
        fetchImpl: fetchImpl as typeof fetch,
        showSaveFilePickerImpl,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
