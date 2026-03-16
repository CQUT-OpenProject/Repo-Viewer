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

import { RequestBatcher } from "./RequestBatcher";

declare global {
  interface Window {
    setInterval: typeof globalThis.setInterval;
    setTimeout: typeof globalThis.setTimeout;
  }
}

beforeEach(() => {
  if (typeof window === "undefined") {
    vi.stubGlobal("window", globalThis);
  }
});

describe("RequestBatcher", () => {
  it("reuses fingerprint cache for identical completed requests", async () => {
    const batcher = new RequestBatcher();
    const executeRequest = vi.fn(async () => ({ value: Date.now() }));

    const firstResult = await batcher.enqueue("https://example.com/repos", executeRequest, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const secondResult = await batcher.enqueue("https://example.com/repos", executeRequest, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    expect(executeRequest).toHaveBeenCalledTimes(1);
    expect(secondResult).toBe(firstResult);
  });

  it("bypasses fingerprint cache when requested", async () => {
    const batcher = new RequestBatcher();
    const executeRequest = vi
      .fn<() => Promise<{ value: number }>>()
      .mockResolvedValueOnce({ value: 1 })
      .mockResolvedValueOnce({ value: 2 });

    const firstResult = await batcher.enqueue("https://example.com/repos", executeRequest, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondResult = await batcher.enqueue("https://example.com/repos", executeRequest, {
      method: "GET",
      headers: { Accept: "application/json" },
      fingerprintCache: "bypass",
    });

    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(firstResult).toEqual({ value: 1 });
    expect(secondResult).toEqual({ value: 2 });
  });

  it("still merges in-flight requests when only fingerprint cache is bypassed", async () => {
    const batcher = new RequestBatcher();
    let releaseRequest: (() => void) | null = null;
    const executeRequest = vi.fn(
      () =>
        new Promise<{ value: number }>((resolve) => {
          releaseRequest = () => resolve({ value: 1 });
        }),
    );

    const firstPromise = batcher.enqueue("https://example.com/repos", executeRequest, {
      method: "GET",
      headers: { Accept: "application/json" },
      fingerprintCache: "bypass",
    });

    const secondPromise = batcher.enqueue("https://example.com/repos", executeRequest, {
      method: "GET",
      headers: { Accept: "application/json" },
      fingerprintCache: "bypass",
    });

    expect(executeRequest).toHaveBeenCalledTimes(1);
    releaseRequest?.();

    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
    expect(firstResult).toEqual({ value: 1 });
    expect(secondResult).toEqual({ value: 1 });
  });

  it("does not retry aborted requests", async () => {
    const batcher = new RequestBatcher();
    const executeRequest = vi.fn(async () => {
      throw createAbortError("Request aborted");
    });

    await expect(
      batcher.enqueue("https://example.com/repos", executeRequest, {
        method: "GET",
        headers: { Accept: "application/json" },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(executeRequest).toHaveBeenCalledTimes(1);
  });
});
