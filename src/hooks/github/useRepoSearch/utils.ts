import { SearchIndexError, SearchIndexErrorCode } from "@/services/github/core/searchIndex";

import type { RepoSearchError, RepoSearchMode } from "./types";

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
