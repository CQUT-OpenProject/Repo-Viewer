import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartCache } from "./SmartCache";

afterEach(() => {
  vi.useRealTimers();
});

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

  it("expires based on creation time even when accessed repeatedly", () => {
    vi.useFakeTimers();
    const cache = new SmartCache<string, number>({ maxSize: 10, ttl: 5000 });
    cache.set("a", 1);

    vi.advanceTimersByTime(3000);
    expect(cache.get("a")).toBe(1);

    vi.advanceTimersByTime(3000);
    expect(cache.get("a")).toBeNull();
  });

  it("supports sliding TTL mode for long-lived entries", () => {
    vi.useFakeTimers();
    const cache = new SmartCache<string, number>({
      maxSize: 10,
      ttl: 5000,
      ttlMode: "sliding",
    });
    cache.set("a", 1);

    vi.advanceTimersByTime(3000);
    expect(cache.get("a")).toBe(1);

    vi.advanceTimersByTime(3000);
    expect(cache.get("a")).toBe(1);

    vi.advanceTimersByTime(6000);
    expect(cache.get("a")).toBeNull();
  });
});
