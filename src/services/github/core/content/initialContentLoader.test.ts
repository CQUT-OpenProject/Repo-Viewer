import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/config", () => ({
  getGithubConfig: () => ({
    repoOwner: "octo",
    repoName: "repo-viewer",
    repoBranch: "main",
  }),
}));

vi.mock("@/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { __initialContentLoaderTestUtils, loadInitialContentPayload } from "./initialContentLoader";

describe("initialContentLoader", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates manifest shape", () => {
    expect(
      __initialContentLoaderTestUtils.isInitialContentManifest({
        version: 1,
        generatedAt: "2026-03-15T00:00:00.000Z",
        repo: {
          owner: "octo",
          name: "repo-viewer",
        },
        branches: {
          main: {
            payloadPath: "/initial-content/main.json",
          },
        },
      }),
    ).toBe(true);

    expect(
      __initialContentLoaderTestUtils.isInitialContentManifest({
        version: 1,
        generatedAt: "2026-03-15T00:00:00.000Z",
        repo: {
          owner: "octo",
        },
        branches: {},
      }),
    ).toBe(false);
  });

  it("returns null when manifest is missing", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadInitialContentPayload()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/initial-content/manifest.json", {
      method: "GET",
      signal: null,
    });
  });

  it("loads payload for the configured branch", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        input instanceof URL
          ? input.toString()
          : typeof input === "string"
            ? input
            : input.url;

      if (url === "/initial-content/manifest.json") {
        return new Response(
          JSON.stringify({
            version: 1,
            generatedAt: "2026-03-15T00:00:00.000Z",
            repo: {
              owner: "octo",
              name: "repo-viewer",
            },
            branches: {
              main: {
                payloadPath: "/initial-content/main.json",
              },
            },
          }),
          { status: 200 },
        );
      }

      if (url === "/initial-content/main.json") {
        return new Response(
          JSON.stringify({
            version: 1,
            generatedAt: "2026-03-15T00:00:00.000Z",
            branch: "main",
            repo: {
              owner: "octo",
              name: "repo-viewer",
            },
            directories: [
              {
                path: "",
                contents: [],
              },
            ],
            files: [],
            metadata: {
              allowReadmeHydration: true,
            },
          }),
          { status: 200 },
        );
      }

      return new Response(null, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(loadInitialContentPayload()).resolves.toEqual({
      version: 1,
      generatedAt: "2026-03-15T00:00:00.000Z",
      branch: "main",
      repo: {
        owner: "octo",
        name: "repo-viewer",
      },
      directories: [
        {
          path: "",
          contents: [],
        },
      ],
      files: [],
      metadata: {
        allowReadmeHydration: true,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
