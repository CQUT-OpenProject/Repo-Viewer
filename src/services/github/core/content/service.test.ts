import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createAbortError } from "@/utils/network/abort";

const { axiosGetMock, getCurrentProxyServiceMock, applyProxyToUrlMock } = vi.hoisted(() => ({
  axiosGetMock: vi.fn(),
  getCurrentProxyServiceMock: vi.fn(() => "https://proxy.example.com"),
  applyProxyToUrlMock: vi.fn(
    (url: string, proxyUrl: string) => `${proxyUrl}/${url.replace(/^https?:\/\//u, "")}`,
  ),
}));

vi.mock("axios", () => ({
  default: {
    get: axiosGetMock,
  },
}));

vi.mock("@/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../config", () => ({
  getForceServerProxy: vi.fn(() => false),
  shouldUseServerAPI: vi.fn(() => false),
}));

vi.mock("../Auth", () => ({
  getAuthHeaders: vi.fn(() => ({ Authorization: "Bearer test-token" })),
}));

vi.mock("../Config", () => ({
  USE_TOKEN_MODE: false,
  getApiUrl: vi.fn((path: string, branch: string) => `https://api.example.com/${branch}/${path}`),
  getCurrentBranch: vi.fn(() => "main"),
}));

vi.mock("../../schemas", () => ({
  safeValidateGitHubContentsResponse: vi.fn((data: unknown) => ({ success: true, data })),
  filterAndNormalizeGitHubContents: vi.fn((data: unknown) => data),
  transformGitHubContentsResponse: vi.fn((data: unknown) => data),
  validateGitHubContentsArray: vi.fn(() => ({ isValid: true, invalidItems: [] })),
}));

vi.mock("../../proxy", () => ({
  getCurrentProxyService: getCurrentProxyServiceMock,
  ProxyUrlTransformer: {
    applyProxyToUrl: applyProxyToUrlMock,
  },
}));

vi.mock("./cacheState", () => ({
  ensureCacheInitialized: vi.fn(async () => {}),
  getCachedDirectoryContents: vi.fn(async () => null),
  getCachedFileContent: vi.fn(async () => null),
  isCacheAvailable: vi.fn(() => false),
  storeDirectoryContents: vi.fn(async () => {}),
  storeFileContent: vi.fn(async () => {}),
}));

vi.mock("./cacheKeys", () => ({
  buildContentsCacheKey: vi.fn((path: string, branch: string) => `${branch}:${path}`),
}));

vi.mock("./hydrationStore", () => ({
  consumeHydratedDirectory: vi.fn(async () => null),
  consumeHydratedFile: vi.fn(async () => null),
  hydrateInitialContent: vi.fn(),
  INITIAL_CONTENT_EXCLUDE_FILES: [],
}));

if (typeof window === "undefined") {
  vi.stubGlobal("window", globalThis);
}

import { getForceServerProxy, shouldUseServerAPI } from "../../config";
const { clearBatcherCache, getContents, getFileContent } = await import("./service");

describe("content service abort handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("window", globalThis);
    clearBatcherCache();
    vi.mocked(shouldUseServerAPI).mockReturnValue(false);
    vi.mocked(getForceServerProxy).mockReturnValue(false);
    getCurrentProxyServiceMock.mockReturnValue("https://proxy.example.com");
    applyProxyToUrlMock.mockImplementation(
      (url: string, proxyUrl: string) => `${proxyUrl}/${url.replace(/^https?:\/\//u, "")}`,
    );
  });

  it("propagates abort to direct fetch requests", async () => {
    let fetchSignal: AbortSignal | undefined;
    let resolveFetchStarted: (() => void) | null = null;
    const fetchStarted = new Promise<void>((resolve) => {
      resolveFetchStarted = resolve;
    });
    const fetchMock = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
      fetchSignal = init?.signal;
      resolveFetchStarted?.();

      return new Promise<Response>((_, reject) => {
        fetchSignal?.addEventListener("abort", () => reject(createAbortError("Request aborted")), {
          once: true,
        });
      });
    });
    const controller = new AbortController();
    vi.stubGlobal("fetch", fetchMock);

    const promise = getContents("docs", controller.signal);
    await fetchStarted;
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchSignal?.aborted).toBe(true);
  });

  it("propagates abort to server proxy axios requests", async () => {
    vi.mocked(shouldUseServerAPI).mockReturnValue(true);
    const controller = new AbortController();
    let resolveAxiosStarted: (() => void) | null = null;
    const axiosStarted = new Promise<void>((resolve) => {
      resolveAxiosStarted = resolve;
    });

    axiosGetMock.mockImplementationOnce(async (_url, config) => {
      const signal = config?.signal as AbortSignal | undefined;
      resolveAxiosStarted?.();

      return new Promise((_, reject) => {
        signal?.addEventListener(
          "abort",
          () =>
            reject(
              Object.assign(new Error("canceled"), {
                name: "CanceledError",
                code: "ERR_CANCELED",
              }),
            ),
          { once: true },
        );
      });
    });

    const promise = getContents("docs", controller.signal);
    await axiosStarted;
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(axiosGetMock).toHaveBeenCalledWith(
      "/api/github?action=getContents&path=docs&branch=main",
      {
        signal: controller.signal,
      },
    );
  });

  it("propagates abort to file content fetch requests", async () => {
    let fetchSignal: AbortSignal | undefined;
    let resolveFetchStarted: (() => void) | null = null;
    const fetchStarted = new Promise<void>((resolve) => {
      resolveFetchStarted = resolve;
    });
    const fetchMock = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
      fetchSignal = init?.signal;
      resolveFetchStarted?.();

      return new Promise<Response>((_, reject) => {
        fetchSignal?.addEventListener("abort", () => reject(createAbortError("Request aborted")), {
          once: true,
        });
      });
    });
    const controller = new AbortController();
    vi.stubGlobal("fetch", fetchMock);

    const promise = getFileContent(
      "https://raw.githubusercontent.com/test-owner/test-repo/main/docs/readme.md",
      controller.signal,
    );
    await fetchStarted;
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchSignal?.aborted).toBe(true);
  });

  it("prefers direct proxy URL for file content requests", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "proxy content",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const content = await getFileContent(
      "https://raw.githubusercontent.com/test-owner/test-repo/main/docs/readme.md",
    );

    expect(content).toBe("proxy content");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://proxy.example.com/raw.githubusercontent.com/test-owner/test-repo/main/docs/readme.md",
    );
  });

  it("falls back to server API when direct proxy request fails in force mode", async () => {
    vi.mocked(getForceServerProxy).mockReturnValue(true);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "fallback content",
      });
    vi.stubGlobal("fetch", fetchMock);

    const content = await getFileContent(
      "https://raw.githubusercontent.com/test-owner/test-repo/main/docs/readme.md",
    );

    expect(content).toBe("fallback content");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://proxy.example.com/raw.githubusercontent.com/test-owner/test-repo/main/docs/readme.md",
    );
    expect(String(fetchMock.mock.calls[1]?.[0] ?? "")).toContain(
      "/api/github?action=getGitHubAsset&url=",
    );
  });
});
