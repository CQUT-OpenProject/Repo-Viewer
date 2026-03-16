import { saveAs } from "file-saver";
import { Zip, ZipDeflate } from "fflate";

import { createAbortError, isAbortError } from "@/utils/network/abort";

const ZIP_MIME_TYPE = "application/zip";
const DEFAULT_COMPRESSION_LEVEL = 6;

interface SaveAsLike {
  (data: Blob, filename: string): void;
}

interface SaveFilePickerOptionsLike {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}

type ShowSaveFilePickerLike = (
  options?: SaveFilePickerOptionsLike,
) => Promise<FileSystemFileHandle>;

export interface FolderDownloadEntry {
  path: string;
  url: string;
  size?: number;
}

export interface ZipOutputSink {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(reason?: unknown): Promise<void>;
}

export interface DownloadFolderAsZipOptions {
  files: FolderDownloadEntry[];
  signal: AbortSignal;
  archiveName: string;
  outputSink?: ZipOutputSink;
  compressionLevel?: number;
  onFileComplete?: (processedCount: number, totalFiles: number) => void;
  onFileError?: (file: FolderDownloadEntry, error: Error) => void;
  fetchImpl?: typeof fetch;
  saveAsImpl?: SaveAsLike;
  showSaveFilePickerImpl?: ShowSaveFilePickerLike | null;
}

class BlobZipOutputSink implements ZipOutputSink {
  private readonly chunks: Uint8Array[] = [];
  private closed = false;
  private aborted = false;

  constructor(
    private readonly archiveName: string,
    private readonly saveAsImpl: SaveAsLike,
  ) {}

  async write(chunk: Uint8Array): Promise<void> {
    if (this.closed || this.aborted) {
      return;
    }

    this.chunks.push(chunk);
  }

  async close(): Promise<void> {
    if (this.closed || this.aborted) {
      return;
    }

    this.closed = true;
    this.saveAsImpl(new Blob(this.chunks, { type: ZIP_MIME_TYPE }), this.archiveName);
    this.chunks.length = 0;
  }

  async abort(): Promise<void> {
    this.aborted = true;
    this.chunks.length = 0;
  }
}

class NativeFileZipOutputSink implements ZipOutputSink {
  private closed = false;
  private aborted = false;

  constructor(private readonly writable: FileSystemWritableFileStream) {}

  async write(chunk: Uint8Array): Promise<void> {
    if (this.closed || this.aborted) {
      return;
    }

    await this.writable.write(chunk);
  }

  async close(): Promise<void> {
    if (this.closed || this.aborted) {
      return;
    }

    this.closed = true;
    await this.writable.close();
  }

  async abort(reason?: unknown): Promise<void> {
    if (this.closed || this.aborted) {
      return;
    }

    this.aborted = true;

    try {
      await this.writable.abort(reason);
    } catch {
      try {
        await this.writable.close();
      } catch {
        // Ignore close failures during abort cleanup.
      }
    }
  }
}

class ZipChunkWriter {
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly sink: ZipOutputSink,
    private readonly signal: AbortSignal,
  ) {}

  enqueue(chunk: Uint8Array): Promise<void> {
    this.pending = this.pending.then(async () => {
      throwIfAborted(this.signal);
      await this.sink.write(chunk);
    });

    return this.pending;
  }

  async flush(): Promise<void> {
    await this.pending;
  }
}

const throwIfAborted = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw createAbortError("Download aborted");
  }
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
};

const getDefaultFetch = (): typeof fetch => {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("Fetch API is unavailable");
  }

  return globalThis.fetch.bind(globalThis);
};

const getDefaultShowSaveFilePicker = (): ShowSaveFilePickerLike | null => {
  const picker = (
    globalThis as typeof globalThis & {
      showSaveFilePicker?: ShowSaveFilePickerLike;
    }
  ).showSaveFilePicker;

  return typeof picker === "function" ? picker.bind(globalThis) : null;
};

const createZipOutputSink = async (
  archiveName: string,
  saveAsImpl: SaveAsLike,
  showSaveFilePickerImpl: ShowSaveFilePickerLike | null,
): Promise<ZipOutputSink> => {
  if (showSaveFilePickerImpl === null) {
    return new BlobZipOutputSink(archiveName, saveAsImpl);
  }

  try {
    const fileHandle = await showSaveFilePickerImpl({
      suggestedName: archiveName,
      types: [
        {
          description: "ZIP archive",
          accept: {
            [ZIP_MIME_TYPE]: [".zip"],
          },
        },
      ],
    });

    const writable = await fileHandle.createWritable();
    return new NativeFileZipOutputSink(writable);
  } catch (error) {
    if (isAbortError(error)) {
      throw createAbortError("Download aborted");
    }

    throw error;
  }
};

export const prepareZipOutputSink = async ({
  archiveName,
  saveAsImpl = saveAs,
  showSaveFilePickerImpl = getDefaultShowSaveFilePicker(),
}: Pick<
  DownloadFolderAsZipOptions,
  "archiveName" | "saveAsImpl" | "showSaveFilePickerImpl"
>): Promise<ZipOutputSink> => createZipOutputSink(archiveName, saveAsImpl, showSaveFilePickerImpl);

const appendFileToZip = async (
  zip: Zip,
  writer: ZipChunkWriter,
  file: FolderDownloadEntry,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
  compressionLevel: number,
): Promise<void> => {
  throwIfAborted(signal);

  const response = await fetchImpl(file.url, { signal });

  if (!response.ok) {
    throw new Error(`下载失败: ${String(response.status)} ${response.statusText}`);
  }

  if (response.body === null) {
    throw new Error("当前浏览器不支持流式读取下载内容");
  }

  const zipEntry = new ZipDeflate(file.path, { level: compressionLevel });
  zip.add(zipEntry);

  const reader = response.body.getReader();

  try {
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();

      if (done) {
        zipEntry.push(new Uint8Array(0), true);
        await writer.flush();
        return;
      }

      if (value !== undefined && value.length > 0) {
        zipEntry.push(value, false);
        await writer.flush();
      }
    }
  } catch (error) {
    try {
      await reader.cancel(error);
    } catch {
      // Ignore reader cancellation failures during cleanup.
    }

    throw error;
  } finally {
    reader.releaseLock();
  }
};

export const downloadFolderAsZip = async ({
  files,
  signal,
  archiveName,
  outputSink,
  compressionLevel = DEFAULT_COMPRESSION_LEVEL,
  onFileComplete,
  onFileError,
  fetchImpl = getDefaultFetch(),
  saveAsImpl = saveAs,
  showSaveFilePickerImpl = getDefaultShowSaveFilePicker(),
}: DownloadFolderAsZipOptions): Promise<void> => {
  throwIfAborted(signal);

  const sink =
    outputSink ?? (await createZipOutputSink(archiveName, saveAsImpl, showSaveFilePickerImpl));
  const writer = new ZipChunkWriter(sink, signal);
  let zipCallbackError: Error | null = null;

  const zip = new Zip((error, chunk) => {
    if (error !== null) {
      zipCallbackError = toError(error);
      return;
    }

    void writer.enqueue(chunk).catch((writerError) => {
      zipCallbackError = toError(writerError);
    });
  });

  try {
    let processedCount = 0;

    for (const file of files) {
      throwIfAborted(signal);

      try {
        await appendFileToZip(zip, writer, file, fetchImpl, signal, compressionLevel);
        processedCount += 1;
        onFileComplete?.(processedCount, files.length);
      } catch (error) {
        if (isAbortError(error)) {
          throw createAbortError("Download aborted");
        }

        onFileError?.(file, toError(error));
      }

      if (zipCallbackError !== null) {
        throw zipCallbackError;
      }
    }

    zip.end();
    await writer.flush();

    if (zipCallbackError !== null) {
      throw zipCallbackError;
    }

    await sink.close();
  } catch (error) {
    zip.terminate();
    await sink.abort(error);

    if (isAbortError(error)) {
      throw createAbortError("Download aborted");
    }

    throw toError(error);
  }
};
