import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createAbortError } from "@/utils/network/abort";

vi.mock("@/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { RequestManager } from "./requestManager";

describe("RequestManager", () => {
  let manager: RequestManager;

  beforeEach(() => {
    manager = new RequestManager();
  });

  it("aborts the previous request when a new request with the same key starts", async () => {
    let resolveFirstStarted: (() => void) | null = null;
    const firstStarted = new Promise<void>((resolve) => {
      resolveFirstStarted = resolve;
    });
    const firstFetcher = vi.fn((signal: AbortSignal) => {
      resolveFirstStarted?.();
      return new Promise<string>((_, reject) => {
        signal.addEventListener("abort", () => reject(createAbortError("Request aborted")), {
          once: true,
        });
      });
    });
    const secondFetcher = vi.fn(async () => "latest-result");

    const firstPromise = manager.request("repo-search", firstFetcher);
    await firstStarted;
    const secondPromise = manager.request("repo-search", secondFetcher);

    await expect(firstPromise).rejects.toMatchObject({ name: "AbortError" });
    await expect(secondPromise).resolves.toBe("latest-result");
    expect(firstFetcher).toHaveBeenCalledTimes(1);
    expect(secondFetcher).toHaveBeenCalledTimes(1);
  });

  it("does not delete active request controller when previous aborted request finishes cleanup", async () => {
    let resolveFirstStarted: (() => void) | null = null;
    const firstStarted = new Promise<void>((resolve) => {
      resolveFirstStarted = resolve;
    });

    const firstFetcher = vi.fn((signal: AbortSignal) => {
      resolveFirstStarted?.();
      return new Promise<string>((_, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            setTimeout(() => reject(createAbortError("Aborted 1")), 0);
          },
          { once: true },
        );
      });
    });

    let resolveSecondStarted: (() => void) | null = null;
    const secondStarted = new Promise<void>((resolve) => {
      resolveSecondStarted = resolve;
    });

    const secondFetcher = vi.fn((signal: AbortSignal) => {
      resolveSecondStarted?.();
      return new Promise<string>((_, reject) => {
        signal.addEventListener("abort", () => reject(createAbortError("Aborted 2")), {
          once: true,
        });
      });
    });

    const firstPromise = manager.request("test-key", firstFetcher);
    await firstStarted;

    const secondPromise = manager.request("test-key", secondFetcher);
    await secondStarted;

    await expect(firstPromise).rejects.toMatchObject({ name: "AbortError" });

    const canceled = manager.cancel("test-key");

    expect(canceled).toBe(true);
    await expect(secondPromise).rejects.toMatchObject({ name: "AbortError" });
  });
});
