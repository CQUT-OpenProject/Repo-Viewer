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
});
