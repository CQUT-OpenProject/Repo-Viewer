/**
 * @fileoverview 仓库搜索 Hook
 *
 * 提供 GitHub 仓库内容的搜索功能，采用合并执行策略：
 * 1. 默认分支：使用 GitHub Code Search API（内容 + 路径全文搜索，支持 CJK）
 * 2. 非默认分支：使用 GitHub Trees API 路径搜索（Code Search 仅索引默认分支）
 *
 * 结果按 Code Search 优先合并去重，Code Search 失败时保留 Trees 结果。
 *
 * @module hooks/github/useRepoSearch/useRepoSearch
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { GitHub } from "@/services/github";
import { logger, trackEvent } from "@/utils/logging/logger";
import { isAbortError } from "@/utils/network/abort";
import { requestManager } from "@/utils/request/requestManager";

import { DEFAULT_SEARCH_LIMIT } from "./constants";
import type {
  RepoSearchApiItem,
  RepoSearchCodeItem,
  RepoSearchError,
  RepoSearchExecutionResult,
  RepoSearchItem,
  RepoSearchState,
  UseRepoSearchOptions,
} from "./types";
import {
  normalizeSearchError,
  resolveBranchSelection,
  sanitizeBranchList,
  sanitizeExtensions,
  type BranchSelectionMode,
} from "./utils";

const SEARCH_REQUEST_KEY = "repo-search";

interface RepoSearchInputFilters {
  keyword: string;
  manualBranches: string[];
  pathPrefix: string;
  extensions: string[];
}

/**
 * 仓库搜索 Hook
 *
 * 提供完整的仓库内容搜索功能，自动合并默认分支的 Code Search 结果
 * 与非默认分支的 Trees API 路径搜索结果。
 *
 * @param options - 搜索配置选项
 * @param options.currentBranch - 当前分支名称
 * @param options.defaultBranch - 默认分支名称
 * @param options.branches - 可用分支列表
 * @returns 搜索状态和操作函数
 */
export function useRepoSearch({
  currentBranch,
  defaultBranch,
  branches,
}: UseRepoSearchOptions): RepoSearchState {
  const { availableBranchSet, availableBranches, branchOrder } = useMemo(() => {
    const set = new Set<string>();
    const order = new Map<string, number>();
    const list: string[] = [];

    const appendBranch = (candidate: string): void => {
      const trimmed = candidate.trim();
      if (trimmed.length === 0 || set.has(trimmed)) {
        return;
      }

      set.add(trimmed);
      order.set(trimmed, list.length);
      list.push(trimmed);
    };

    for (const branch of branches) {
      appendBranch(branch);
    }

    appendBranch(defaultBranch);
    appendBranch(currentBranch);

    return {
      availableBranchSet: set,
      availableBranches: list,
      branchOrder: order,
    };
  }, [branches, currentBranch, defaultBranch]);

  const [inputFilters, setInputFilters] = useState<RepoSearchInputFilters>(() => ({
    keyword: "",
    manualBranches: [],
    pathPrefix: "",
    extensions: [],
  }));
  const [branchSelectionMode, setBranchSelectionMode] = useState<BranchSelectionMode>("auto");

  const branchSelection = useMemo(
    () =>
      resolveBranchSelection({
        selectionMode: branchSelectionMode,
        manualBranches: inputFilters.manualBranches,
        currentBranch,
        defaultBranch,
        availableBranches: availableBranchSet,
        branchOrder,
      }),
    [
      branchSelectionMode,
      inputFilters.manualBranches,
      currentBranch,
      defaultBranch,
      availableBranchSet,
      branchOrder,
    ],
  );

  const branchFilter = useMemo<string[]>(
    () =>
      branchSelection.effectiveSelectionMode === "manual" ? branchSelection.manualBranches : [],
    [branchSelection.effectiveSelectionMode, branchSelection.manualBranches],
  );
  const effectiveBranches = branchSelection.effectiveBranches;

  const [searchResult, setSearchResult] = useState<RepoSearchExecutionResult | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<RepoSearchError | null>(null);
  const activeSearchIdRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      requestManager.cancel(SEARCH_REQUEST_KEY);
    };
  }, []);

  const setKeyword = (value: string) => {
    setInputFilters((prev) => ({
      ...prev,
      keyword: value,
    }));
  };

  const setBranchFilter = (branchesOrBranch: string[] | string) => {
    const normalized = sanitizeBranchList(
      Array.isArray(branchesOrBranch) ? branchesOrBranch : [branchesOrBranch],
      availableBranchSet,
      branchOrder,
    );

    setInputFilters((prev) => ({
      ...prev,
      manualBranches: normalized,
    }));
    setBranchSelectionMode(normalized.length > 0 ? "manual" : "auto");
  };

  const setExtensionFilter = (extensions: string[] | string) => {
    const normalized = sanitizeExtensions(extensions);
    setInputFilters((prev) => ({
      ...prev,
      extensions: normalized,
    }));
  };

  const setPathPrefix = (prefix: string) => {
    setInputFilters((prev) => ({
      ...prev,
      pathPrefix: prefix.trim(),
    }));
  };

  const resetFilters = () => {
    setInputFilters({
      keyword: "",
      manualBranches: [],
      pathPrefix: "",
      extensions: [],
    });
    setBranchSelectionMode("auto");
  };

  const clearResults = () => {
    setSearchResult(null);
    setSearchError(null);
  };

  const search = async (options) => {
    const searchId = activeSearchIdRef.current + 1;
    activeSearchIdRef.current = searchId;

    const keyword = (options?.keyword ?? inputFilters.keyword).trim();
    const pathPrefixRaw = (options?.pathPrefix ?? inputFilters.pathPrefix).trim();
    const sanitizedExtensions = sanitizeExtensions(options?.extensions ?? inputFilters.extensions);
    const sanitizedBranches = sanitizeBranchList(
      options?.branches ?? branchFilter,
      availableBranchSet,
      branchOrder,
    );
    const resolvedBranches = sanitizedBranches.length > 0 ? sanitizedBranches : effectiveBranches;

    if (keyword.length === 0) {
      requestManager.cancel(SEARCH_REQUEST_KEY);
      if (searchId === activeSearchIdRef.current) {
        setSearchLoading(false);
      }

      const emptyResult: RepoSearchExecutionResult = {
        mode: "github-api",
        items: [],
        took: 0,
        filters: {
          keyword,
          branches: resolvedBranches,
          pathPrefix: pathPrefixRaw,
          extensions: sanitizedExtensions,
        },
        completedAt: Date.now(),
      };

      setSearchResult(emptyResult);
      setSearchError(null);
      return emptyResult;
    }

    setSearchLoading(true);
    setSearchError(null);

    const startedAt = performance.now();

    try {
      const execution = await requestManager.request(SEARCH_REQUEST_KEY, async (signal) => {
        const trimmedDefaultBranch = defaultBranch.trim();
        const useCodeSearch = resolvedBranches.includes(trimmedDefaultBranch);
        const nonDefaultBranches = resolvedBranches.filter(
          (branch) => branch !== trimmedDefaultBranch,
        );

        const treesPromise =
          nonDefaultBranches.length > 0
            ? GitHub.Search.searchMultipleBranchesWithTreesApi(
                keyword,
                nonDefaultBranches,
                pathPrefixRaw,
                sanitizedExtensions,
                signal,
              )
            : Promise.resolve([]);

        let codeItems: RepoSearchCodeItem[] = [];
        let codeSearchError: unknown = null;

        if (useCodeSearch) {
          try {
            const results = await GitHub.Search.searchCode({
              keyword,
              branch: trimmedDefaultBranch,
              pathPrefix: pathPrefixRaw === "" ? undefined : pathPrefixRaw,
              extensions: sanitizedExtensions.length > 0 ? sanitizedExtensions : undefined,
              limit: DEFAULT_SEARCH_LIMIT,
              signal,
            });
            codeItems = results.map((item) => ({
              ...item,
              source: "code-search" as const,
            }));
          } catch (error) {
            if (isAbortError(error)) {
              throw error;
            }
            codeSearchError = error;
            logger.warn(`[RepoSearch] Code Search 失败，回退到 Trees 结果: ${keyword}`, error);
          }
        }

        const branchResults = await treesPromise;
        const treesItems: RepoSearchApiItem[] = branchResults.flatMap(({ branch, results }) =>
          results.map((item) => ({
            ...item,
            source: "github-api" as const,
            branch,
          })),
        );

        if (useCodeSearch && codeSearchError !== null && treesItems.length === 0) {
          throw codeSearchError;
        }

        const seenPaths = new Set(codeItems.map((item) => item.path));
        const items: RepoSearchItem[] = [
          ...codeItems,
          ...treesItems.filter((item) => !seenPaths.has(item.path)),
        ];

        return {
          mode: useCodeSearch ? "code-search" : "github-api",
          items,
          took: performance.now() - startedAt,
          filters: {
            keyword,
            branches: resolvedBranches,
            pathPrefix: pathPrefixRaw,
            extensions: sanitizedExtensions,
          },
          completedAt: Date.now(),
        } satisfies RepoSearchExecutionResult;
      });

      if (searchId !== activeSearchIdRef.current) {
        return null;
      }

      setSearchResult(execution);
      trackEvent("search_completed", {
        query: execution.filters.keyword,
        mode: execution.mode,
        resultCount: execution.items.length,
        took: Math.round(execution.took),
        branches: execution.filters.branches.join(","),
        pathPrefix: execution.filters.pathPrefix ?? null,
        extensions: execution.filters.extensions.join(","),
      });
      return execution;
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return null;
      }

      const normalized = normalizeSearchError(error);
      if (searchId === activeSearchIdRef.current) {
        setSearchError(normalized);
      }

      const enrichedError = new Error(normalized.message);
      enrichedError.name = "RepoSearchError";
      Object.assign(enrichedError, {
        source: normalized.source,
        cause: normalized.raw,
      });

      throw enrichedError;
    } finally {
      if (searchId === activeSearchIdRef.current) {
        setSearchLoading(false);
      }
    }
  };

  return {
    keyword: inputFilters.keyword,
    setKeyword,
    branchFilter,
    setBranchFilter,
    extensionFilter: inputFilters.extensions,
    setExtensionFilter,
    pathPrefix: inputFilters.pathPrefix,
    setPathPrefix,
    availableBranches,
    searchResult,
    searchLoading,
    searchError,
    search,
    clearResults,
    resetFilters,
  } satisfies RepoSearchState;
}
