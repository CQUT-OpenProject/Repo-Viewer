import { SearchIndexError, SearchIndexErrorCode } from "@/services/github/core/searchIndex";

import type { RepoSearchError, RepoSearchFallbackReason, RepoSearchMode } from "./types";

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

interface ResolveModeAndFallbackOptions {
  preferredMode: RepoSearchMode;
  indexFeatureEnabled: boolean;
  indexReady: boolean;
  hasIndexError: boolean;
  effectiveBranches: string[];
  isBranchIndexed: (branch: string) => boolean;
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

export function resolveModeAndFallback({
  preferredMode,
  indexFeatureEnabled,
  indexReady,
  hasIndexError,
  effectiveBranches,
  isBranchIndexed,
}: ResolveModeAndFallbackOptions): {
  effectiveMode: RepoSearchMode;
  fallbackReason: RepoSearchFallbackReason | null;
} {
  if (preferredMode !== "search-index") {
    return {
      effectiveMode: preferredMode,
      fallbackReason: null,
    };
  }

  if (!indexFeatureEnabled) {
    return {
      effectiveMode: "github-api",
      fallbackReason: "index-disabled",
    };
  }

  if (hasIndexError) {
    return {
      effectiveMode: "github-api",
      fallbackReason: "index-error",
    };
  }

  if (!indexReady) {
    return {
      effectiveMode: "github-api",
      fallbackReason: "index-not-ready",
    };
  }

  if (
    effectiveBranches.length > 0 &&
    !effectiveBranches.some((branch) => isBranchIndexed(branch))
  ) {
    return {
      effectiveMode: "github-api",
      fallbackReason: "branch-not-indexed",
    };
  }

  return {
    effectiveMode: "search-index",
    fallbackReason: null,
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

export function normalizeSearchIndexError(error: unknown): RepoSearchError {
  if (error instanceof SearchIndexError) {
    return {
      source: "index",
      code: error.code,
      message: error.message,
      details: error.details,
      raw: error,
    } satisfies RepoSearchError;
  }

  const message = error instanceof Error ? error.message : "Unknown search index error";
  return {
    source: "index",
    message,
    raw: error,
  } satisfies RepoSearchError;
}

export function normalizeSearchError(error: unknown, mode: RepoSearchMode): RepoSearchError {
  if (error instanceof SearchIndexError) {
    return {
      source: "search",
      code: error.code,
      message: error.message,
      details: error.details,
      raw: error,
    } satisfies RepoSearchError;
  }

  const message = error instanceof Error ? error.message : "Unknown search error";
  const base: RepoSearchError = {
    source: "search",
    message,
    raw: error,
  };

  if (mode === "search-index") {
    return {
      ...base,
      code: SearchIndexErrorCode.INDEX_FILE_NOT_FOUND,
    } satisfies RepoSearchError;
  }

  return base;
}
