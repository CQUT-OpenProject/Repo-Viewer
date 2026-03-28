import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/services/github/core/searchIndex", () => {
  class MockSearchIndexError extends Error {
    code: string;
    details?: unknown;

    constructor(code: string, message: string, details?: unknown) {
      super(message);
      this.code = code;
      this.details = details;
    }
  }

  return {
    SearchIndexError: MockSearchIndexError,
    SearchIndexErrorCode: {
      INDEX_FILE_NOT_FOUND: "INDEX_FILE_NOT_FOUND",
    },
  };
});

import { resolveBranchSelection, resolveModeAndFallback } from "./utils";

const createBranchContext = (branches: string[]) => {
  const availableBranches = new Set<string>();
  const branchOrder = new Map<string, number>();

  branches.forEach((branch, index) => {
    availableBranches.add(branch);
    branchOrder.set(branch, index);
  });

  return {
    availableBranches,
    branchOrder,
  };
};

describe("useRepoSearch utils", () => {
  it("auto 模式会跟随 currentBranch 变化", () => {
    const context = createBranchContext(["main", "dev"]);

    const first = resolveBranchSelection({
      selectionMode: "auto",
      manualBranches: [],
      currentBranch: "main",
      defaultBranch: "main",
      ...context,
    });

    const second = resolveBranchSelection({
      selectionMode: "auto",
      manualBranches: [],
      currentBranch: "dev",
      defaultBranch: "main",
      ...context,
    });

    expect(first.effectiveBranches).toEqual(["main"]);
    expect(second.effectiveBranches).toEqual(["dev"]);
  });

  it("manual 模式不会被 currentBranch 覆盖", () => {
    const context = createBranchContext(["main", "dev", "release"]);

    const result = resolveBranchSelection({
      selectionMode: "manual",
      manualBranches: ["release"],
      currentBranch: "dev",
      defaultBranch: "main",
      ...context,
    });

    expect(result.effectiveSelectionMode).toBe("manual");
    expect(result.manualBranches).toEqual(["release"]);
    expect(result.effectiveBranches).toEqual(["release"]);
  });

  it("index disabled 时会自动降级到 github-api", () => {
    const result = resolveModeAndFallback({
      preferredMode: "search-index",
      indexFeatureEnabled: false,
      indexReady: true,
      hasIndexError: false,
      effectiveBranches: ["main"],
      isBranchIndexed: () => true,
    });

    expect(result.effectiveMode).toBe("github-api");
    expect(result.fallbackReason).toBe("index-disabled");
  });

  it("空分支筛选时回退到 current/default 分支", () => {
    const context = createBranchContext(["main", "feature"]);

    const byCurrentBranch = resolveBranchSelection({
      selectionMode: "auto",
      manualBranches: [],
      currentBranch: "feature",
      defaultBranch: "main",
      ...context,
    });

    const byDefaultBranch = resolveBranchSelection({
      selectionMode: "auto",
      manualBranches: [],
      currentBranch: "",
      defaultBranch: "main",
      ...context,
    });

    expect(byCurrentBranch.effectiveBranches).toEqual(["feature"]);
    expect(byDefaultBranch.effectiveBranches).toEqual(["main"]);
  });
});
