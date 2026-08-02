import { describe, expect, it } from "vite-plus/test";

import { normalizeSearchError, resolveBranchSelection, sanitizeExtensions } from "./utils";

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

  it("sanitizeExtensions 会去除点号、去重并转小写", () => {
    expect(sanitizeExtensions([".TS", "ts", "py", ".PY"])).toEqual(["ts", "py"]);
    expect(sanitizeExtensions(" md ")).toEqual(["md"]);
    expect(sanitizeExtensions([".", ""])).toEqual([]);
  });

  it("normalizeSearchError 会包裹为 RepoSearchError", () => {
    const rawError = new Error("boom");
    const result = normalizeSearchError(rawError);

    expect(result.source).toBe("search");
    expect(result.message).toBe("boom");
    expect(result.raw).toBe(rawError);

    expect(normalizeSearchError("not-an-error").message).toBe("未知搜索错误");
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
