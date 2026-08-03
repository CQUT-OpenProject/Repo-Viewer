import { beforeEach, describe, expect, it, vi } from "vitest";
import { createImageLoadingState, handleImageError, tryDirectImageLoad } from "./imageUtils";

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
});
