import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./trees", () => ({
  getBranchTree: vi.fn(),
}));

vi.mock("../content", () => ({
  getContents: vi.fn(),
}));

import { searchMultipleBranchesWithTreesApi } from "./local";
import { getBranchTree } from "./trees";

const mockedGetBranchTree = vi.mocked(getBranchTree);

describe("searchMultipleBranchesWithTreesApi", () => {
  beforeEach(() => {
    mockedGetBranchTree.mockReset();
  });

  it("applies all extension filters in Trees API fallback", async () => {
    mockedGetBranchTree.mockResolvedValue([
      { path: "docs/readme.md", type: "blob", sha: "1", url: "https://example.com/1" },
      { path: "src/readme.ts", type: "blob", sha: "2", url: "https://example.com/2" },
      { path: "src/readme.js", type: "blob", sha: "3", url: "https://example.com/3" },
      { path: "docs/guide.md", type: "blob", sha: "4", url: "https://example.com/4" },
    ]);

    const results = await searchMultipleBranchesWithTreesApi("readme", ["main"], "", ["md", ".TS"]);

    expect(results).toHaveLength(1);
    expect(results[0]?.results.map((item) => item.path)).toEqual([
      "docs/readme.md",
      "src/readme.ts",
    ]);
  });

  it("keeps single-extension filtering behavior compatible", async () => {
    mockedGetBranchTree.mockResolvedValue([
      { path: "src/component.tsx", type: "blob", sha: "1", url: "https://example.com/1" },
      { path: "src/component.ts", type: "blob", sha: "2", url: "https://example.com/2" },
    ]);

    const results = await searchMultipleBranchesWithTreesApi("component", ["main"], "", "tsx");

    expect(results[0]?.results.map((item) => item.path)).toEqual(["src/component.tsx"]);
  });
});
