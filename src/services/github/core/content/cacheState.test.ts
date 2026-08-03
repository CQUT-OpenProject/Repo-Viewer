import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeMock = vi.fn();

vi.mock("../../cache/CacheManager", () => ({
  CacheManager: {
    initialize: () => initializeMock(),
  },
}));

import {
  ensureCacheInitialized,
  isCacheAvailable,
} from "./cacheState";

describe("ensureCacheInitialized", () => {
  beforeEach(() => {
    vi.resetModules();
    initializeMock.mockReset();
  });

  const load = async (): Promise<typeof import("./cacheState")> => import("./cacheState");

  it("shares a single initialization across concurrent callers", async () => {
    let resolveInit: (() => void) | undefined;
    initializeMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        }),
    );

    const mod = await load();
    const first = mod.ensureCacheInitialized();
    const second = mod.ensureCacheInitialized();

    resolveInit?.();
    await Promise.all([first, second]);

    expect(initializeMock).toHaveBeenCalledTimes(1);
  });

  it("retries initialization after a failure and becomes available on success", async () => {
    initializeMock.mockRejectedValueOnce(new Error("boom"));
    const mod = await load();

    await mod.ensureCacheInitialized();
    expect(mod.isCacheAvailable()).toBe(false);

    initializeMock.mockResolvedValueOnce(undefined);
    await mod.ensureCacheInitialized();
    expect(mod.isCacheAvailable()).toBe(true);
    expect(initializeMock).toHaveBeenCalledTimes(2);
  });

  it("gives up permanently after reaching the maximum attempt count", async () => {
    initializeMock.mockRejectedValue(new Error("boom"));
    const mod = await load();

    await mod.ensureCacheInitialized();
    await mod.ensureCacheInitialized();
    await mod.ensureCacheInitialized();
    await mod.ensureCacheInitialized();

    expect(initializeMock).toHaveBeenCalledTimes(3);
    expect(mod.isCacheAvailable()).toBe(false);
  });

  it("does not initialize again once available", async () => {
    initializeMock.mockResolvedValue(undefined);
    const mod = await load();

    await mod.ensureCacheInitialized();
    await mod.ensureCacheInitialized();

    expect(initializeMock).toHaveBeenCalledTimes(1);
    expect(mod.isCacheAvailable()).toBe(true);
  });
});
