import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenRotator } from "./tokenRotator";

afterEach(() => {
  vi.useRealTimers();
});

describe("TokenRotator", () => {
  it("rotates through tokens and skips failed ones", () => {
    const rotator = new TokenRotator();
    rotator.setTokens(["a", "b", "c"]);
    rotator.markTokenFailed("b");

    expect(rotator.getNextToken()).toBe("c");
    expect(rotator.getNextToken()).toBe("a");
    expect(rotator.getNextToken()).toBe("c");
  });

  it("re-admits a failed token after the backoff window", () => {
    vi.useFakeTimers();
    const rotator = new TokenRotator();
    rotator.setTokens(["a", "b"]);
    rotator.markTokenFailed("a");

    expect(rotator.isFailed("a")).toBe(true);
    expect(rotator.getNextToken()).toBe("b");

    vi.advanceTimersByTime(300001);
    expect(rotator.isFailed("a")).toBe(false);
    expect(rotator.getNextToken()).toBe("a");
    expect(rotator.getNextToken()).toBe("b");
  });

  it("returns empty string when every token is currently failed", () => {
    vi.useFakeTimers();
    const rotator = new TokenRotator();
    rotator.setTokens(["a"]);
    rotator.markTokenFailed("a");

    expect(rotator.getNextToken()).toBe("");
  });
});
