import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeMock = vi.fn();
const clearAllCachesMock = vi.fn();

vi.mock("./CacheManager", () => ({
  CacheManager: {
    initialize: () => initializeMock(),
    clearAllCaches: () => clearAllCachesMock(),
  },
}));

vi.mock("../proxy/ProxyService", () => ({
  resetFailedProxyServices: vi.fn(),
}));

vi.mock("../core/content/service", () => ({
  clearBatcherCache: vi.fn(),
}));

vi.mock("../core/search/trees", () => ({
  clearBranchTreeCache: vi.fn(),
}));

const STALE_ITEMS = [{ name: "stale.txt", path: "stale.txt", type: "file", sha: "s" }];

describe("clearCaches", () => {
  beforeEach(() => {
    vi.resetModules();
    initializeMock.mockReset();
    clearAllCachesMock.mockReset();
  });

  it("clears the memory fallback cache used in degraded mode", async () => {
    // 模拟主缓存（IndexedDB/LocalStorage）不可用，触发降级到内存缓存
    initializeMock.mockRejectedValue(new Error("indexeddb unavailable"));
    const cacheState = await import("../core/content/cacheState");
    await cacheState.ensureCacheInitialized();
    await cacheState.ensureCacheInitialized();
    await cacheState.ensureCacheInitialized();
    expect(cacheState.isCacheAvailable()).toBe(false);

    await cacheState.storeDirectoryContents("dir:main:", STALE_ITEMS);
    expect(await cacheState.getCachedDirectoryContents("dir:main:")).toEqual(STALE_ITEMS);

    const { clearCaches } = await import("./clearCaches");
    await clearCaches();

    expect(await cacheState.getCachedDirectoryContents("dir:main:")).toBeNull();
  });
});
