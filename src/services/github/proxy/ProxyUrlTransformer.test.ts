import { describe, expect, it, vi } from "vitest";

vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return {
    ...actual,
    getGithubConfig: () => ({ repoOwner: "o", repoName: "r", repoBranch: "main" }),
    getRuntimeConfig: () => ({ isDev: false }),
  };
});

vi.mock("../core/Config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/Config")>();
  return {
    ...actual,
    getCurrentBranch: () => "main",
  };
});

import { ProxyUrlTransformer } from "./ProxyUrlTransformer";

describe("ProxyUrlTransformer.applyProxyToUrl", () => {
  it("encodes CJK path segments", () => {
    const result = ProxyUrlTransformer.applyProxyToUrl(
      "https://raw.githubusercontent.com/o/r/main/图片.png",
      "https://gh-proxy.com",
    );
    expect(result).toBe(
      "https://gh-proxy.com/raw.githubusercontent.com/o/r/main/%E5%9B%BE%E7%89%87.png",
    );
  });

  it("preserves query strings when encoding special characters", () => {
    const result = ProxyUrlTransformer.applyProxyToUrl(
      "https://raw.githubusercontent.com/o/r/main/pic.svg?sanitize=true",
      "https://gh-proxy.com",
    );
    expect(result).toBe(
      "https://gh-proxy.com/raw.githubusercontent.com/o/r/main/pic.svg?sanitize=true",
    );
  });

  it("preserves query strings and fragments with CJK paths", () => {
    const result = ProxyUrlTransformer.applyProxyToUrl(
      "https://raw.githubusercontent.com/o/r/main/图.svg?raw=true#sec",
      "https://gh-proxy.com",
    );
    expect(result).toBe(
      "https://gh-proxy.com/raw.githubusercontent.com/o/r/main/%E5%9B%BE.svg?raw=true#sec",
    );
  });
});
