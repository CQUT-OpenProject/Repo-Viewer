import { afterEach, describe, expect, it } from "vitest";
import {
  assertGitHubContentsPayload,
  createOfflineContentError,
  getNetworkAwareErrorMessage,
  isMisroutedApiResponseError,
} from "./apiResponseGuards";

describe("assertGitHubContentsPayload", () => {
  it("accepts arrays and GitHub-like objects", () => {
    expect(() => assertGitHubContentsPayload([])).not.toThrow();
    expect(() =>
      assertGitHubContentsPayload({
        name: "README.md",
        path: "README.md",
        sha: "abc",
        url: "https://example.com",
        html_url: "https://example.com",
        git_url: "https://example.com",
        download_url: null,
        type: "file",
      }),
    ).not.toThrow();
  });

  it("throws for HTML responses", () => {
    expect(() => assertGitHubContentsPayload("<!doctype html><html></html>")).toThrow(
      "HTML 页面而非 API 数据",
    );
  });

  it("throws for API error envelopes", () => {
    expect(() =>
      assertGitHubContentsPayload({ error: "Failed to fetch content", message: "timeout" }),
    ).toThrow("timeout");
  });
});

describe("offline helpers", () => {
  it("creates offline content errors", () => {
    expect(createOfflineContentError("获取目录内容失败").message).toContain("离线状态");
  });

  it("detects misrouted API response errors", () => {
    expect(isMisroutedApiResponseError("获取内容失败: API响应格式错误: ...")).toBe(true);
    expect(isMisroutedApiResponseError("获取内容失败: timeout")).toBe(false);
  });
});

describe("getNetworkAwareErrorMessage", () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: originalOnLine,
    });
  });

  it("returns offline guidance when navigator is offline", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    expect(getNetworkAwareErrorMessage(new Error("boom"), "获取目录内容失败")).toBe(
      "获取目录内容失败：当前处于离线状态，请检查网络连接后重试。",
    );
  });

  it("returns network failure guidance for fetch errors", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    expect(getNetworkAwareErrorMessage(new Error("Failed to fetch"), "获取目录内容失败")).toBe(
      "获取目录内容失败：网络或服务响应异常，请检查连接后重试。",
    );
  });

  it("returns friendly guidance for misrouted API responses", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    expect(
      getNetworkAwareErrorMessage(
        new Error("获取内容失败: API响应格式错误: ..."),
        "获取目录内容失败",
      ),
    ).toBe("获取目录内容失败：网络或服务响应异常，请检查连接后重试。");
  });

  it("returns the original error message for non-network failures", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    expect(getNetworkAwareErrorMessage(new Error("权限不足"), "获取目录内容失败")).toBe(
      "获取目录内容失败: 权限不足",
    );
  });
});
