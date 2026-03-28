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

import { useEffect, useMemo, useRef, useState } from "react";

import { GitHub } from "@/services/github";
import { SearchIndexError, SearchIndexErrorCode } from "@/services/github/core/searchIndex";
import { logger } from "@/utils";
import { isAbortError } from "@/utils/network/abort";
import { requestManager } from "@/utils/request/requestManager";
import type { GitHubContent } from "@/types";

import { SEARCH_INDEX_DEFAULT_LIMIT } from "./constants";
import type {
  RepoSearchError,
  RepoSearchExecutionResult,
  RepoSearchIndexStatus,
  RepoSearchItem,
  RepoSearchMode,
  RepoSearchState,
  UseRepoSearchOptions,
} from "./types";
import {
  normalizeSearchError,
  normalizeSearchIndexError,
  resolveBranchSelection,
  resolveModeAndFallback,
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

  const [inputFilters, setInputFilters] = useState<RepoSearchInputFilters>(() => ({
    keyword: "",
    manualBranches: [],
    pathPrefix: "",
    extensions: [],
  }));
  const [branchSelectionMode, setBranchSelectionMode] = useState<BranchSelectionMode>("auto");

  const [preferredMode, setPreferredMode] = useState<RepoSearchMode>(
    indexFeatureEnabled ? "search-index" : "github-api",
  );

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

  const initializeIndex = () => {
    setIndexInitialized(true);
  };

  const refreshIndexStatus = () => {
    GitHub.SearchIndex.invalidateCache();
    prefetchedBranchesRef.current.clear();
    setIndexRefreshToken((token) => token + 1);
  };

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

  const { effectiveMode, fallbackReason } = useMemo(
    () =>
      resolveModeAndFallback({
        preferredMode,
        indexFeatureEnabled,
        indexReady: indexStatus.ready,
        hasIndexError: indexStatus.error !== null,
        effectiveBranches,
        isBranchIndexed: (branch) => indexStatus.indexedBranches.includes(branch),
      }),
    [
      preferredMode,
      indexFeatureEnabled,
      indexStatus.ready,
      indexStatus.error,
      effectiveBranches,
      indexStatus.indexedBranches,
    ],
  );

  useEffect(() => {
    if (preferredMode !== "search-index") {
      return;
    }

    if (!indexFeatureEnabled || !indexStatus.ready || !indexInitialized) {
      return;
    }

    const branchesToPrefetch = effectiveBranches.filter((branch) => {
      if (!indexStatus.indexedBranches.includes(branch)) {
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
    effectiveBranches,
    indexStatus.indexedBranches,
  ]);

  const [searchResult, setSearchResult] = useState<RepoSearchExecutionResult | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<RepoSearchError | null>(null);
  const activeSearchIdRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      requestManager.cancel(SEARCH_REQUEST_KEY);
    };
  }, []);

  const availableModes = useMemo<RepoSearchMode[]>(() => {
    if (indexFeatureEnabled) {
      return ["search-index", "github-api"];
    }
    return ["github-api"];
  }, [indexFeatureEnabled]);

  const isBranchIndexed = (branch: string): boolean => indexStatus.indexedBranches.includes(branch);

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

    const modeToUse = options?.mode ?? effectiveMode;
    const resolvedMode: RepoSearchMode =
      modeToUse === "search-index" && fallbackReason !== null ? "github-api" : modeToUse;

    if (keyword.length === 0) {
      requestManager.cancel(SEARCH_REQUEST_KEY);
      if (searchId === activeSearchIdRef.current) {
        setSearchLoading(false);
      }

      const emptyResult: RepoSearchExecutionResult = {
        mode: resolvedMode,
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
        if (resolvedMode === "search-index") {
          const indexedBranches = resolvedBranches.filter((branch) => isBranchIndexed(branch));

          if (indexedBranches.length === 0) {
            throw new SearchIndexError(
              SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED,
              "None of the selected branches have available search indexes",
              { branch: resolvedBranches.join(", ") },
            );
          }

          const pathPrefix = pathPrefixRaw === "" ? undefined : pathPrefixRaw;

          const searchIndexOptions: Parameters<typeof GitHub.SearchIndex.search>[0] = {
            keyword,
            branches: indexedBranches,
            limit: SEARCH_INDEX_DEFAULT_LIMIT,
            signal,
          };

          if (pathPrefix !== undefined) {
            searchIndexOptions.pathPrefix = pathPrefix;
          }

          if (sanitizedExtensions.length > 0) {
            searchIndexOptions.extensions = sanitizedExtensions;
          }

          const results = await GitHub.SearchIndex.search(searchIndexOptions);
          const items: RepoSearchItem[] = results.map((item) => ({
            ...item,
            source: "search-index" as const,
          }));

          return {
            mode: "search-index",
            items,
            took: performance.now() - startedAt,
            filters: {
              keyword,
              branches: indexedBranches,
              pathPrefix: pathPrefixRaw,
              extensions: sanitizedExtensions,
            },
            completedAt: Date.now(),
          } satisfies RepoSearchExecutionResult;
        }

        let targetBranches = resolvedBranches;
        if (targetBranches.length === 0) {
          targetBranches = resolveBranchSelection({
            selectionMode: "auto",
            manualBranches: [],
            currentBranch,
            defaultBranch,
            availableBranches: availableBranchSet,
            branchOrder,
          }).effectiveBranches;
        }

        const branchResults = await GitHub.Search.searchMultipleBranchesWithTreesApi(
          keyword,
          targetBranches,
          pathPrefixRaw,
          sanitizedExtensions,
          signal,
        );

        const items: RepoSearchItem[] = branchResults.flatMap(
          ({ branch, results }: { branch: string; results: GitHubContent[] }) =>
            results.map((item: GitHubContent) => ({
              ...item,
              source: "github-api" as const,
              branch,
            })),
        );

        return {
          mode: "github-api",
          items,
          took: performance.now() - startedAt,
          filters: {
            keyword,
            branches: targetBranches,
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
      return execution;
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return null;
      }

      const normalized = normalizeSearchError(error, resolvedMode);
      if (searchId === activeSearchIdRef.current) {
        setSearchError(normalized);
      }

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
