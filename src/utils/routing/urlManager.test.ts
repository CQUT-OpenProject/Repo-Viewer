import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { getPathFromUrl, getPreviewFromUrl, updateUrlWithHistory } from "./urlManager";

describe("urlManager special character handling flow", () => {
  let currentUrl: URL;
  let historyState: unknown = null;
  const globalObj = globalThis as unknown as { window: unknown };
  const originalWindow = globalObj.window;

  beforeEach(() => {
    currentUrl = new URL("http://localhost/");
    historyState = null;

    const mockWindow = {
      location: {
        get href() {
          return currentUrl.href;
        },
        get pathname() {
          return currentUrl.pathname;
        },
        get search() {
          return currentUrl.search;
        },
        get hash() {
          return currentUrl.hash;
        },
      },
      history: {
        get state() {
          return historyState;
        },
        pushState: (state: unknown, _title: string, url?: string | null) => {
          historyState = state;
          if (url) {
            currentUrl = new URL(url, currentUrl.href);
          }
        },
        replaceState: (state: unknown, _title: string, url?: string | null) => {
          historyState = state;
          if (url) {
            currentUrl = new URL(url, currentUrl.href);
          }
        },
      },
    };

    globalObj.window = mockWindow;
  });

  afterEach(() => {
    globalObj.window = originalWindow;
  });

  it("fails to preserve path containing '#' when updating URL and reading it back", () => {
    const specialPath = "docs/C#/README.md";
    updateUrlWithHistory(specialPath);

    // Get back the path from window.location
    const parsedPath = getPathFromUrl();
    expect(parsedPath).toBe(specialPath);
  });

  it("fails to preserve path containing '?' when updating URL and reading it back", () => {
    const specialPath = "faq/what?why.md";
    updateUrlWithHistory(specialPath);

    const parsedPath = getPathFromUrl();
    expect(parsedPath).toBe(specialPath);
  });

  it("fails to preserve preview parameter when path contains '#'", () => {
    const specialPath = "docs/C#";
    const previewFile = "docs/C#/README.md";
    updateUrlWithHistory(specialPath, previewFile);

    const parsedPath = getPathFromUrl();
    const parsedPreview = getPreviewFromUrl();

    expect(parsedPath).toBe(specialPath);
    expect(parsedPreview).toBe("README.md");
  });
});
