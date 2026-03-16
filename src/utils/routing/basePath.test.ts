import { describe, expect, it } from "vite-plus/test";

import {
  buildAbsoluteAppUrl,
  buildAppPath,
  getAppBasePath,
  normalizeBaseUrl,
  stripBasePath,
} from "./basePath";

describe("basePath", () => {
  it("normalizes configured base urls", () => {
    expect(normalizeBaseUrl("repo-viewer")).toBe("/repo-viewer/");
    expect(normalizeBaseUrl("/repo-viewer")).toBe("/repo-viewer/");
    expect(normalizeBaseUrl("/repo-viewer/")).toBe("/repo-viewer/");
    expect(normalizeBaseUrl("/")).toBe("/");
  });

  it("builds app-local paths with base prefix", () => {
    expect(getAppBasePath("/repo-viewer/")).toBe("/repo-viewer");
    expect(buildAppPath("", "/repo-viewer/")).toBe("/repo-viewer/");
    expect(buildAppPath("docs/guide", "/repo-viewer/")).toBe("/repo-viewer/docs/guide");
    expect(buildAppPath("/docs/guide", "/repo-viewer/")).toBe("/repo-viewer/docs/guide");
  });

  it("strips the configured base from window pathname values", () => {
    expect(stripBasePath("/repo-viewer/docs/guide", "/repo-viewer/")).toBe("/docs/guide");
    expect(stripBasePath("/repo-viewer", "/repo-viewer/")).toBe("/");
    expect(stripBasePath("/docs/guide", "/repo-viewer/")).toBe("/docs/guide");
  });

  it("builds absolute app urls from the configured base", () => {
    expect(
      buildAbsoluteAppUrl("search-index/manifest.json", {
        baseUrl: "/repo-viewer/",
        origin: "https://example.com",
      }),
    ).toBe("https://example.com/repo-viewer/search-index/manifest.json");
  });
});
