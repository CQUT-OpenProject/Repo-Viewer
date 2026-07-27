import { describe, expect, it } from "vitest";
import { SmartCache } from "./SmartCache";

describe("SmartCache bug verification", () => {
  it("fails to evict items when cache size is small because Math.floor(size * ratio) evaluates to 0", () => {
    // Small cache: maxSize = 4, cleanupThreshold = 0.75 (threshold = 3), cleanupRatio = 0.2
    const cache = new SmartCache<string, number>({
      maxSize: 4,
      cleanupThreshold: 0.75,
      cleanupRatio: 0.2,
    });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    // Setting 4th item triggers cleanup when size (3) >= maxSize * threshold (3)
    cache.set("d", 4);

    // Because Math.floor(3 * 0.2) = 0, no items were evicted before adding "d".
    // Size becomes 4 instead of evicting at least 1 item.
    expect(cache.size).toBeLessThan(4);
  });
});
