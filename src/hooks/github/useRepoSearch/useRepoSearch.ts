/**
 * @fileoverview 仓库搜索 Hook
 *
 * 提供 GitHub 仓库内容的搜索功能，支持两种搜索模式：
 * 1. 搜索索引模式（search-index）：使用本地构建的搜索索引，速度快
 * 2. GitHub API 模式（github-api）：使用 GitHub Trees API，支持更大范围搜索
 *
 * 自动处理搜索模式降级（当索引不可用时自动切换到 API 模式），
 * 支持多分支搜索、路径前缀过滤和文件扩展名过滤。
 *
 * @module hooks/github/useRepoSearch/useRepoSearch
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GitHub } from "@/services/github";
import { SearchIndexError, SearchIndexErrorCode } from "@/services/github/core/searchIndex";
import { logger } from "@/utils";
import type { GitHubContent } from "@/types";

import { SEARCH_INDEX_DEFAULT_LIMIT } from "./constants";
import type {
  RepoSearchError,
  RepoSearchExecutionResult,
  RepoSearchFallbackReason,
  RepoSearchFilters,
  RepoSearchIndexStatus,
  RepoSearchItem,
  RepoSearchMode,
  RepoSearchState,
  UseRepoSearchOptions,
} from "./types";
import {
  normalizeSearchError,
  normalizeSearchIndexError,
  sanitizeBranchList,
  sanitizeExtensions,
} from "./utils";

/**
 * 仓库搜索 Hook
 *
 * 提供完整的仓库内容搜索功能，包括搜索索引管理、搜索执行和结果处理。
 * 自动根据搜索索引状态选择合适的搜索模式。
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
  const indexFeatureEnabled = GitHub.SearchIndex.isEnabled();

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

  const [filters, setFilters] = useState<RepoSearchFilters>(() => ({
    keyword: "",
    branches: currentBranch !== "" ? [currentBranch] : [],
    pathPrefix: "",
    extensions: [],
  }));

  useEffect(() => {
    setFilters((prev) => {
      const sanitizedBranches = sanitizeBranchList(prev.branches, availableBranchSet, branchOrder);
      const unchanged =
        sanitizedBranches.length === prev.branches.length &&
        sanitizedBranches.every((branch, index) => branch === prev.branches[index]);

      if (unchanged) {
        return prev;
      }

      return {
        ...prev,
        branches: sanitizedBranches,
      } satisfies RepoSearchFilters;
    });
  }, [availableBranchSet, branchOrder]);

  const previousBranchRef = useRef<string>(currentBranch);

  useEffect(() => {
    const previous = previousBranchRef.current;
    if (currentBranch === previous) {
      return;
    }

    previousBranchRef.current = currentBranch;

    setFilters((prev) => {
      const hasCustomSelection = prev.branches.length > 1 && previous !== "";
      const branchMatched = prev.branches.length === 1 && prev.branches[0] === previous;

      if (!hasCustomSelection && branchMatched) {
        const nextBranches = currentBranch !== "" ? [currentBranch] : [];
        return {
          ...prev,
          branches: nextBranches,
        } satisfies RepoSearchFilters;
      }

      if (prev.branches.length === 0) {
        const nextBranches = currentBranch !== "" ? [currentBranch] : [];
        return {
          ...prev,
          branches: nextBranches,
        } satisfies RepoSearchFilters;
      }

      return prev;
    });
  }, [currentBranch]);

  const [preferredMode, setPreferredMode] = useState<RepoSearchMode>(
    indexFeatureEnabled ? "search-index" : "github-api",
  );

  useEffect(() => {
    if (!indexFeatureEnabled && preferredMode !== "github-api") {
      setPreferredMode("github-api");
    }
  }, [indexFeatureEnabled, preferredMode]);

  const [indexStatus, setIndexStatus] = useState<RepoSearchIndexStatus>(() => ({
    enabled: indexFeatureEnabled,
    ready: false,
    loading: false,
    error: null,
    indexedBranches: [],
  }));

  const prefetchedBranchesRef = useRef<Set<string>>(new Set());
  const [indexRefreshToken, setIndexRefreshToken] = useState<number>(0);
  const [indexInitialized, setIndexInitialized] = useState<boolean>(false);

  const initializeIndex = useCallback(() => {
    setIndexInitialized(true);
  }, []);

  const refreshIndexStatus = useCallback(() => {
    GitHub.SearchIndex.invalidateCache();
    prefetchedBranchesRef.current.clear();
    setIndexRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!indexFeatureEnabled) {
      setIndexStatus({
        enabled: false,
        ready: false,
        loading: false,
        error: null,
        indexedBranches: [],
      });
      return;
    }

    // 只有在索引被初始化后才执行检测
    if (!indexInitialized) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    setIndexStatus((prev) => ({
      ...prev,
      enabled: true,
      loading: true,
      error: null,
    }));

    (async () => {
      try {
        await GitHub.SearchIndex.ensureReady(signal);
        const indexedBranches = await GitHub.SearchIndex.getIndexedBranches(signal);

        if (signal.aborted) {
          return;
        }

        setIndexStatus({
          enabled: true,
          ready: true,
          loading: false,
          error: null,
          indexedBranches,
          lastUpdatedAt: Date.now(),
        });
      } catch (error: unknown) {
        if (signal.aborted) {
          return;
        }

        const normalized = normalizeSearchIndexError(error);
        setIndexStatus({
          enabled: true,
          ready: false,
          loading: false,
          error: normalized,
          indexedBranches: [],
          lastUpdatedAt: Date.now(),
        });
      }
    })().catch((error: unknown) => {
      if (!signal.aborted) {
        logger.error("[RepoSearch] 意外的索引状态刷新错误", error);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [indexFeatureEnabled, indexRefreshToken, indexInitialized]);

  const isBranchIndexed = useCallback(
    (branch: string) => indexStatus.indexedBranches.includes(branch),
    [indexStatus.indexedBranches],
  );

  const computeEffectiveBranches = useCallback((): string[] => {
    if (filters.branches.length > 0) {
      return sanitizeBranchList(filters.branches, availableBranchSet, branchOrder);
    }

    const fallbackCandidates: string[] = [];
    if (currentBranch !== "") {
      fallbackCandidates.push(currentBranch);
    } else if (defaultBranch !== "") {
      fallbackCandidates.push(defaultBranch);
    }

    return sanitizeBranchList(fallbackCandidates, availableBranchSet, branchOrder);
  }, [filters.branches, availableBranchSet, branchOrder, currentBranch, defaultBranch]);

  const fallbackReason = useMemo<RepoSearchFallbackReason | null>(() => {
    if (preferredMode !== "search-index") {
      return null;
    }

    if (!indexFeatureEnabled) {
      return "index-disabled";
    }

    if (indexStatus.error !== null) {
      return "index-error";
    }

    if (!indexStatus.ready) {
      return "index-not-ready";
    }

    const targetBranches = computeEffectiveBranches();

    if (targetBranches.length === 0) {
      return null;
    }

    if (!targetBranches.some((branch) => isBranchIndexed(branch))) {
      return "branch-not-indexed";
    }

    return null;
  }, [
    preferredMode,
    indexFeatureEnabled,
    indexStatus.error,
    indexStatus.ready,
    computeEffectiveBranches,
    isBranchIndexed,
  ]);

  const effectiveMode: RepoSearchMode =
    preferredMode === "search-index" && fallbackReason !== null ? "github-api" : preferredMode;

  useEffect(() => {
    if (preferredMode !== "search-index") {
      return;
    }

    if (!indexFeatureEnabled || !indexStatus.ready || !indexInitialized) {
      return;
    }

    const candidateBranches = computeEffectiveBranches();

    const branchesToPrefetch = candidateBranches.filter((branch) => {
      if (!isBranchIndexed(branch)) {
        return false;
      }
      return !prefetchedBranchesRef.current.has(branch);
    });

    if (branchesToPrefetch.length === 0) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    (async () => {
      await Promise.allSettled(
        branchesToPrefetch.map(async (branch) => {
          try {
            const success = await GitHub.SearchIndex.prefetchBranch(branch, signal);
            if (!signal.aborted && success) {
              prefetchedBranchesRef.current.add(branch);
            }
          } catch (error: unknown) {
            if (!signal.aborted) {
              logger.warn(`[RepoSearch] 预加载索引失败: ${branch}`, error);
            }
          }
        }),
      );
    })().catch((error: unknown) => {
      if (!signal.aborted) {
        logger.warn("[RepoSearch] 预加载索引时出现未捕获异常", error);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [
    preferredMode,
    indexFeatureEnabled,
    indexStatus.ready,
    indexInitialized,
    computeEffectiveBranches,
    isBranchIndexed,
  ]);

  const [searchResult, setSearchResult] = useState<RepoSearchExecutionResult | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<RepoSearchError | null>(null);

  const availableModes = useMemo<RepoSearchMode[]>(() => {
    if (indexFeatureEnabled) {
      return ["search-index", "github-api"];
    }
    return ["github-api"];
  }, [indexFeatureEnabled]);

  const setKeyword = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      keyword: value,
    }));
  }, []);

  const setBranchFilter = useCallback(
    (branchesOrBranch: string[] | string) => {
      const normalized = sanitizeBranchList(
        Array.isArray(branchesOrBranch) ? branchesOrBranch : [branchesOrBranch],
        availableBranchSet,
        branchOrder,
      );
      setFilters((prev) => ({
        ...prev,
        branches: normalized,
      }));
    },
    [availableBranchSet, branchOrder],
  );

  const setExtensionFilter = useCallback((extensions: string[] | string) => {
    const normalized = sanitizeExtensions(extensions);
    setFilters((prev) => ({
      ...prev,
      extensions: normalized,
    }));
  }, []);

  const setPathPrefix = useCallback((prefix: string) => {
    setFilters((prev) => ({
      ...prev,
      pathPrefix: prefix.trim(),
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      keyword: "",
      branches:
        currentBranch !== ""
          ? sanitizeBranchList([currentBranch], availableBranchSet, branchOrder)
          : [],
      pathPrefix: "",
      extensions: [],
    });
  }, [currentBranch, availableBranchSet, branchOrder]);

  const clearResults = useCallback(() => {
    setSearchResult(null);
    setSearchError(null);
  }, []);

  const search = useCallback<RepoSearchState["search"]>(
    async (options) => {
      const mergedFilters: RepoSearchFilters = {
        keyword: options?.keyword ?? filters.keyword,
        branches: options?.branches ?? filters.branches,
        pathPrefix: options?.pathPrefix ?? filters.pathPrefix,
        extensions: options?.extensions ?? filters.extensions,
      };

      const sanitizedBranches = sanitizeBranchList(
        mergedFilters.branches,
        availableBranchSet,
        branchOrder,
      );
      const sanitizedExtensions = sanitizeExtensions(mergedFilters.extensions);
      const keyword = mergedFilters.keyword.trim();

      if (keyword.length === 0) {
        const emptyResult: RepoSearchExecutionResult = {
          mode: effectiveMode,
          items: [],
          took: 0,
          filters: {
            keyword,
            branches: sanitizedBranches,
            pathPrefix: mergedFilters.pathPrefix.trim(),
            extensions: sanitizedExtensions,
          },
          completedAt: Date.now(),
        };
        setSearchResult(emptyResult);
        setSearchError(null);
        return emptyResult;
      }

      const modeToUse = options?.mode ?? effectiveMode;
      const resolvedMode: RepoSearchMode =
        modeToUse === "search-index" && fallbackReason !== null ? "github-api" : modeToUse;

      setSearchLoading(true);
      setSearchError(null);

      const startedAt = performance.now();

      try {
        if (resolvedMode === "search-index") {
          const candidateBranches =
            sanitizedBranches.length > 0 ? sanitizedBranches : computeEffectiveBranches();

          const indexedBranches = candidateBranches.filter((branch) => isBranchIndexed(branch));

          if (indexedBranches.length === 0) {
            throw new SearchIndexError(
              SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED,
              "None of the selected branches have available search indexes",
              { branch: candidateBranches.join(", ") },
            );
          }

          const pathPrefixRaw = mergedFilters.pathPrefix.trim();
          const pathPrefix = pathPrefixRaw === "" ? undefined : pathPrefixRaw;

          const searchIndexOptions: Parameters<typeof GitHub.SearchIndex.search>[0] = {
            keyword,
            branches: indexedBranches,
            limit: SEARCH_INDEX_DEFAULT_LIMIT,
          };

          if (pathPrefix !== undefined) {
            searchIndexOptions.pathPrefix = pathPrefix;
          }

          if (sanitizedExtensions.length > 0) {
            searchIndexOptions.extensions = sanitizedExtensions;
          }

          const results = await GitHub.SearchIndex.search(searchIndexOptions);

          const took = performance.now() - startedAt;
          const items: RepoSearchItem[] = results.map((item) => ({
            ...item,
            source: "search-index" as const,
          }));

          const execution: RepoSearchExecutionResult = {
            mode: "search-index",
            items,
            took,
            filters: {
              keyword,
              branches: indexedBranches,
              pathPrefix: pathPrefixRaw,
              extensions: sanitizedExtensions,
            },
            completedAt: Date.now(),
          };

          setSearchResult(execution);
          return execution;
        }

        // 确定要搜索的分支列表
        let targetBranches = sanitizedBranches;
        if (targetBranches.length === 0) {
          if (currentBranch !== "") {
            targetBranches = [currentBranch];
          } else if (defaultBranch !== "") {
            targetBranches = [defaultBranch];
          } else {
            targetBranches = [defaultBranch];
          }
        }

        const pathPrefixRaw = mergedFilters.pathPrefix.trim();

        // 使用 Trees API 进行多分支搜索
        const branchResults = await GitHub.Search.searchMultipleBranchesWithTreesApi(
          keyword,
          targetBranches,
          pathPrefixRaw,
          sanitizedExtensions,
        );

        const allItems: RepoSearchItem[] = branchResults.flatMap(
          ({ branch, results }: { branch: string; results: GitHubContent[] }) =>
            results.map((item: GitHubContent) => ({
              ...item,
              source: "github-api" as const,
              branch,
            })),
        );

        const took = performance.now() - startedAt;

        const execution: RepoSearchExecutionResult = {
          mode: "github-api",
          items: allItems,
          took,
          filters: {
            keyword,
            branches: targetBranches,
            pathPrefix: pathPrefixRaw,
            extensions: sanitizedExtensions,
          },
          completedAt: Date.now(),
        };

        setSearchResult(execution);
        return execution;
      } catch (error: unknown) {
        const normalized = normalizeSearchError(error, resolvedMode);
        setSearchError(normalized);

        const enrichedError = new Error(normalized.message);
        enrichedError.name = "RepoSearchError";
        Object.assign(enrichedError, {
          code: normalized.code,
          details: normalized.details,
          source: normalized.source,
          cause: normalized.raw,
        });

        throw enrichedError;
      } finally {
        setSearchLoading(false);
      }
    },
    [
      filters,
      availableBranchSet,
      branchOrder,
      effectiveMode,
      fallbackReason,
      computeEffectiveBranches,
      currentBranch,
      defaultBranch,
      isBranchIndexed,
    ],
  );

  return {
    keyword: filters.keyword,
    setKeyword,
    branchFilter: filters.branches,
    setBranchFilter,
    extensionFilter: filters.extensions,
    setExtensionFilter,
    pathPrefix: filters.pathPrefix,
    setPathPrefix,
    availableBranches,
    availableModes,
    preferredMode,
    setPreferredMode,
    mode: effectiveMode,
    fallbackReason,
    indexStatus,
    searchResult,
    searchLoading,
    searchError,
    search,
    clearResults,
    resetFilters,
    isBranchIndexed,
    refreshIndexStatus,
    initializeIndex,
  } satisfies RepoSearchState;
}
