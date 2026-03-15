import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createAbortError } from "@/utils/network/abort";

const { axiosGetMock } = vi.hoisted(() => ({
  axiosGetMock: vi.fn(),
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

import { shouldUseServerAPI } from "../../config";
const { clearBatcherCache, getContents } = await import("./service");

describe("content service abort handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("window", globalThis);
    clearBatcherCache();
    vi.mocked(shouldUseServerAPI).mockReturnValue(false);
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
});
