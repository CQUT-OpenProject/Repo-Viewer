import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return {
    ...actual,
    getProxyConfig: () => ({ urls: ["https://gh-proxy.com"], recoveryTime: 60_000 }),
  };
});

import { getCurrentProxyService } from "./ProxyService";
import { proxyHealthManager } from "./ProxyHealthManager";

describe("ProxyHealthManager", () => {
  beforeEach(() => {
    proxyHealthManager.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string when every proxy is down", () => {
    proxyHealthManager.recordFailure("https://gh-proxy.com");
    proxyHealthManager.recordFailure("https://gh-proxy.com");
    proxyHealthManager.recordFailure("https://gh-proxy.com");

    expect(proxyHealthManager.getBestProxy()).toBe("");
    expect(getCurrentProxyService()).toBe("");
  });

  it("allows retrying a down proxy after the recovery window", () => {
    vi.useFakeTimers();
    proxyHealthManager.recordFailure("https://gh-proxy.com");
    proxyHealthManager.recordFailure("https://gh-proxy.com");
    proxyHealthManager.recordFailure("https://gh-proxy.com");

    vi.advanceTimersByTime(61_000);

    expect(proxyHealthManager.getBestProxy()).toBe("https://gh-proxy.com");
  });
});
