import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createImageLoadingState,
  handleImageError,
  handleImageLoad,
  tryDirectImageLoad,
} from "./imageUtils";

const markProxyServiceFailedMock = vi.fn();
const getCurrentProxyServiceMock = vi.fn();

vi.mock("@/services/github", () => ({
  GitHub: {
    Proxy: {
      markProxyServiceFailed: (...args: unknown[]) => markProxyServiceFailedMock(...args),
      getCurrentProxyService: () => getCurrentProxyServiceMock(),
    },
  },
}));

const getGithubConfigMock = vi.fn();
vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return {
    ...actual,
    getGithubConfig: () => getGithubConfigMock(),
  };
});

const PROXIED_SRC = "https://gh-proxy.com/https://raw.githubusercontent.com/o/r/main/img.png";

beforeEach(() => {
  markProxyServiceFailedMock.mockReset();
  getCurrentProxyServiceMock.mockReset();
  getGithubConfigMock.mockReset();
  getGithubConfigMock.mockReturnValue({ repoOwner: "CQUT-OpenProject", repoName: "Repo-Viewer" });
  vi.stubGlobal("window", {
    setTimeout: (fn: () => void) => setTimeout(fn, 0) as unknown as number,
    clearTimeout: (id: number) => clearTimeout(id as unknown as NodeJS.Timeout),
    location: { href: "https://app.example.com/view" },
  });
});

describe("tryDirectImageLoad", () => {
  it("builds the jsDelivr URL from the configured repository", () => {
    getGithubConfigMock.mockReturnValue({ repoOwner: "Royfor12", repoName: "Repo-Viewer" });

    const result = tryDirectImageLoad(PROXIED_SRC);

    expect(result).toBe("https://cdn.jsdelivr.net/gh/Royfor12/Repo-Viewer@main/img.png");
  });
});

describe("handleImageError", () => {
  it("marks the failed proxy and returns null when a different proxy is available", () => {
    getCurrentProxyServiceMock.mockReturnValue("https://proxy-b.com");
    const imageState = createImageLoadingState();
    const setIsImageFailed = vi.fn();

    const result = handleImageError(PROXIED_SRC, PROXIED_SRC, imageState, setIsImageFailed);

    expect(markProxyServiceFailedMock).toHaveBeenCalledWith("https://gh-proxy.com");
    expect(setIsImageFailed).toHaveBeenCalledWith(false);
    expect(result).toBeNull();
  });

  it("falls back to the jsDelivr direct URL when no other proxy is available", () => {
    getCurrentProxyServiceMock.mockReturnValue("https://gh-proxy.com");
    const imageState = createImageLoadingState();
    const setIsImageFailed = vi.fn();

    const result = handleImageError(PROXIED_SRC, PROXIED_SRC, imageState, setIsImageFailed);

    expect(markProxyServiceFailedMock).toHaveBeenCalledWith("https://gh-proxy.com");
    expect(result).toContain("cdn.jsdelivr.net/gh");
    expect(result).toContain("img.png");
  });

  it("tries the original source after a transformed URL fails", () => {
    getCurrentProxyServiceMock.mockReturnValue("https://gh-proxy.com");
    const imageState = createImageLoadingState();
    const setIsImageFailed = vi.fn();

    const result = handleImageError(
      "https://proxy.example.com/x.png",
      "https://raw.example.com/img.png",
      imageState,
      setIsImageFailed,
    );

    expect(result).toBe("https://raw.example.com/img.png");
  });

  it("resolves a relative original source against the page URL before returning it", () => {
    getCurrentProxyServiceMock.mockReturnValue("https://gh-proxy.com");
    const imageState = createImageLoadingState();
    const setIsImageFailed = vi.fn();

    const result = handleImageError(
      "https://proxy.example.com/x.png",
      "img.png",
      imageState,
      setIsImageFailed,
    );

    expect(result).toBe("https://app.example.com/img.png");
  });

  describe("fallback load that succeeds", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.stubGlobal("window", {
        setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms ?? 0) as unknown as number,
        clearTimeout: (id: number) => clearTimeout(id as unknown as NodeJS.Timeout),
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not mark failure when the jsDelivr fallback loads", () => {
      getCurrentProxyServiceMock.mockReturnValue("https://gh-proxy.com");
      const imageState = createImageLoadingState();
      const setIsImageFailed = vi.fn();

      const directSrc = handleImageError(PROXIED_SRC, PROXIED_SRC, imageState, setIsImageFailed);
      expect(directSrc).toContain("cdn.jsdelivr.net/gh");

      // The <img> fires onLoad with the URL actually loaded (the fallback)
      handleImageLoad(directSrc as string, imageState, vi.fn());

      vi.advanceTimersByTime(16_000);

      expect(setIsImageFailed).not.toHaveBeenCalledWith(true);
      expect(imageState.failedImages.has(PROXIED_SRC)).toBe(false);
    });

    it("does not mark failure when the original src fallback loads", () => {
      getCurrentProxyServiceMock.mockReturnValue("https://gh-proxy.com");
      const imageState = createImageLoadingState();
      const setIsImageFailed = vi.fn();

      const originalSrc = "https://raw.example.com/img.png";
      const result = handleImageError(
        "https://proxy.example.com/x.png",
        originalSrc,
        imageState,
        setIsImageFailed,
      );
      expect(result).toBe(originalSrc);

      // The <img> fires onLoad with the URL actually loaded (the fallback)
      handleImageLoad(result as string, imageState, vi.fn());

      vi.advanceTimersByTime(16_000);

      expect(setIsImageFailed).not.toHaveBeenCalledWith(true);
      expect(imageState.failedImages.has("https://proxy.example.com/x.png")).toBe(false);
    });

    it("clears the pending fallback timer once the fallback URL loads", () => {
      getCurrentProxyServiceMock.mockReturnValue("https://gh-proxy.com");
      const imageState = createImageLoadingState();
      const setIsImageFailed = vi.fn();

      const directSrc = handleImageError(PROXIED_SRC, PROXIED_SRC, imageState, setIsImageFailed);
      expect(directSrc).toContain("cdn.jsdelivr.net/gh");
      expect(imageState.imageTimers.size).toBe(1);

      handleImageLoad(directSrc as string, imageState, vi.fn());

      expect(imageState.imageTimers.size).toBe(0);
    });

    it("still marks failure when the fallback never loads", () => {
      getCurrentProxyServiceMock.mockReturnValue("https://gh-proxy.com");
      const imageState = createImageLoadingState();
      const setIsImageFailed = vi.fn();

      handleImageError(PROXIED_SRC, PROXIED_SRC, imageState, setIsImageFailed);

      vi.advanceTimersByTime(16_000);

      expect(setIsImageFailed).toHaveBeenCalledWith(true);
      expect(imageState.failedImages.has(PROXIED_SRC)).toBe(true);
    });
  });
});
