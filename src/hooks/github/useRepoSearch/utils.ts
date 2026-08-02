import type { RepoSearchError } from "./types";

export type BranchSelectionMode = "auto" | "manual";

interface ResolveBranchSelectionOptions {
  selectionMode: BranchSelectionMode;
  manualBranches: string[];
  currentBranch: string;
  defaultBranch: string;
  availableBranches: Set<string>;
  branchOrder: Map<string, number>;
}

interface BranchSelectionResolution {
  manualBranches: string[];
  effectiveBranches: string[];
  effectiveSelectionMode: BranchSelectionMode;
}

export function sanitizeBranchList(
  branches: string[],
  availableBranches: Set<string>,
  branchOrder: Map<string, number>,
): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawName of branches) {
    const trimmed = rawName.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (!availableBranches.has(trimmed)) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized.sort((a, b) => {
    const rankA = branchOrder.get(a);
    const rankB = branchOrder.get(b);

    if (rankA !== undefined && rankB !== undefined) {
      return rankA - rankB;
    }
    if (rankA !== undefined) {
      return -1;
    }
    if (rankB !== undefined) {
      return 1;
    }

    return a.localeCompare(b, "zh-CN");
  });
}

export function resolveBranchSelection({
  selectionMode,
  manualBranches,
  currentBranch,
  defaultBranch,
  availableBranches,
  branchOrder,
}: ResolveBranchSelectionOptions): BranchSelectionResolution {
  const normalizedManualBranches = sanitizeBranchList(
    manualBranches,
    availableBranches,
    branchOrder,
  );

  if (selectionMode === "manual" && normalizedManualBranches.length > 0) {
    return {
      manualBranches: normalizedManualBranches,
      effectiveBranches: normalizedManualBranches,
      effectiveSelectionMode: "manual",
    };
  }

  const fallbackCandidates: string[] = [];
  const trimmedCurrentBranch = currentBranch.trim();
  const trimmedDefaultBranch = defaultBranch.trim();

  if (trimmedCurrentBranch.length > 0) {
    fallbackCandidates.push(trimmedCurrentBranch);
  } else if (trimmedDefaultBranch.length > 0) {
    fallbackCandidates.push(trimmedDefaultBranch);
  }

  return {
    manualBranches: normalizedManualBranches,
    effectiveBranches: sanitizeBranchList(fallbackCandidates, availableBranches, branchOrder),
    effectiveSelectionMode: "auto",
  };
}

export function sanitizeExtensions(extensions: string[] | string): string[] {
  const values = Array.isArray(extensions) ? extensions : [extensions];
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of values) {
    const trimmed = rawValue.trim().toLowerCase();
    if (trimmed.length === 0) {
      continue;
    }
    const extension = trimmed.startsWith(".") ? trimmed.slice(1) : trimmed;
    if (extension.length === 0 || seen.has(extension)) {
      continue;
    }
    seen.add(extension);
    normalized.push(extension);
  }

  return normalized;
}

export function normalizeSearchError(error: unknown): RepoSearchError {
  const message = error instanceof Error ? error.message : "未知搜索错误";
  return {
    source: "search",
    message,
    raw: error,
  } satisfies RepoSearchError;
}
