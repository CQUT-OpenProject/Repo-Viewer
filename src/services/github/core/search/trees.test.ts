import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { axiosGet } = vi.hoisted(() => ({
  axiosGet: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    get: axiosGet,
  },
}));

vi.mock("../../config", () => ({
  shouldUseServerAPI: vi.fn(() => true),
}));

vi.mock("../Auth", () => ({
  getAuthHeaders: vi.fn(() => ({})),
}));

import { clearBranchTreeCache, getBranchTree } from "./trees";

describe("getBranchTree", () => {
  beforeEach(() => {
    clearBranchTreeCache();
    axiosGet.mockReset();
  });

  it("reuses the cached tree when the branch head SHA is unchanged", async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url.includes("action=getGitRef")) {
        return Promise.resolve({
          data: {
            object: {
              sha: "commit-1",
            },
          },
        });
      }

      if (url.includes("action=getTree")) {
        return Promise.resolve({
          data: {
            tree: [{ path: "src/main.ts", type: "blob", sha: "blob-1" }],
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const first = await getBranchTree("main");
    const second = await getBranchTree("main");

    expect(second).toBe(first);
    expect(
      axiosGet.mock.calls.filter(([url]) => String(url).includes("action=getTree")),
    ).toHaveLength(1);
    expect(
      axiosGet.mock.calls.filter(([url]) => String(url).includes("action=getGitRef")),
    ).toHaveLength(2);
  });

  it("invalidates the cached tree when the branch head SHA changes", async () => {
    let currentSha = "commit-1";
    let treeVersion = 0;

    axiosGet.mockImplementation((url: string) => {
      if (url.includes("action=getGitRef")) {
        return Promise.resolve({
          data: {
            object: {
              sha: currentSha,
            },
          },
        });
      }

      if (url.includes("action=getTree")) {
        treeVersion += 1;

        return Promise.resolve({
          data: {
            tree: [
              {
                path: `src/file-${treeVersion.toString()}.ts`,
                type: "blob",
                sha: `blob-${treeVersion.toString()}`,
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const first = await getBranchTree("main");
    currentSha = "commit-2";
    const second = await getBranchTree("main");

    expect(second).not.toBe(first);
    expect(second).toEqual([{ path: "src/file-2.ts", type: "blob", sha: "blob-2" }]);
    expect(
      axiosGet.mock.calls.filter(([url]) => String(url).includes("action=getTree")),
    ).toHaveLength(2);
  });
});
