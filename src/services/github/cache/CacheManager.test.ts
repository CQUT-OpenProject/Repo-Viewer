import { afterEach, describe, expect, it, vi } from "vitest";

import { AdvancedCache } from "./AdvancedCache";
import { CacheManager } from "./CacheManager";

describe("CacheManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes persistence exactly once per cache", async () => {
    const initSpy = vi.spyOn(AdvancedCache.prototype, "initializePersistence");

    await CacheManager.initialize();

    expect(initSpy).toHaveBeenCalledTimes(2);
  });
});
