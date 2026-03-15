/**
 * GitHub 服务模块
 *
 * 提供分组导出和扁平化导出两种方式，以满足不同的使用场景。
 */

// 导入各个服务模块
import * as ContentServiceModule from "./github/core/content";
import * as AuthModule from "./github/core/Auth";
import * as ConfigModule from "./github/core/Config";
import { getSearchIndexConfig } from "@/config";
import { CacheManager as CacheManagerClass } from "./github/cache";
import { GitHubTokenManager } from "./github/TokenManager";
import {
  getProxiedUrl as proxyGetProxiedUrl,
  getProxiedUrlSync as proxyGetProxiedUrlSync,
  markProxyServiceFailed as proxyMarkProxyServiceFailed,
  getCurrentProxyService as proxyGetCurrentProxyService,
  resetFailedProxyServices as proxyResetFailedProxyServices,
  getProxyHealthStats as proxyGetProxyHealthStats,
  transformImageUrl as proxyTransformImageUrl,
} from "./github/proxy";
import { RequestBatcher as RequestBatcherClass } from "./github/RequestBatcher";

type SearchServiceModule = typeof import("./github/core/search");
type SearchIndexServiceModule = typeof import("./github/core/searchIndex");
type BranchServiceModule = typeof import("./github/core/BranchService");
type StatsServiceModule = typeof import("./github/core/StatsService");
type PrefetchServiceModule = typeof import("./github/core/PrefetchService");

const loadSearchService = (() => {
  let modulePromise: Promise<SearchServiceModule> | null = null;
  return (): Promise<SearchServiceModule> => {
    modulePromise ??= import("./github/core/search");
    return modulePromise;
  };
})();

const loadSearchIndexService = (() => {
  let modulePromise: Promise<SearchIndexServiceModule> | null = null;
  return (): Promise<SearchIndexServiceModule> => {
    modulePromise ??= import("./github/core/searchIndex");
    return modulePromise;
  };
})();

const loadBranchService = (() => {
  let modulePromise: Promise<BranchServiceModule> | null = null;
  return (): Promise<BranchServiceModule> => {
    modulePromise ??= import("./github/core/BranchService");
    return modulePromise;
  };
})();

const loadStatsService = (() => {
  let modulePromise: Promise<StatsServiceModule> | null = null;
  return (): Promise<StatsServiceModule> => {
    modulePromise ??= import("./github/core/StatsService");
    return modulePromise;
  };
})();

const loadPrefetchService = (() => {
  let modulePromise: Promise<PrefetchServiceModule> | null = null;
  return (): Promise<PrefetchServiceModule> => {
    modulePromise ??= import("./github/core/PrefetchService");
    return modulePromise;
  };
})();

/**
 * 分组导出
 *
 * @example
 * ```typescript
 * import { GitHub } from '@/services/github';
 *
 * // 使用分组导出
 * const contents = await GitHub.Content.getContents(path);
 * const branches = await GitHub.Branch.getBranches();
 * const results = await GitHub.Search.searchFiles(query);
 * ```
 */
export const GitHub = {
  /** 内容服务 - 获取文件和目录内容 */
  Content: {
    getContents: ContentServiceModule.getContents,
    getFileContent: ContentServiceModule.getFileContent,
    getServerRepoFileProxyUrl: ContentServiceModule.getServerRepoFileProxyUrl,
    getServerResourceProxyUrl: ContentServiceModule.getServerResourceProxyUrl,
    hydrate: ContentServiceModule.hydrateInitialContent,
  },

  /** 搜索服务 - 搜索文件和内容 */
  Search: {
    searchWithGitHubApi: (...args: Parameters<SearchServiceModule["searchWithGitHubApi"]>) =>
      loadSearchService().then(({ searchWithGitHubApi }) => searchWithGitHubApi(...args)),
    searchFiles: (...args: Parameters<SearchServiceModule["searchFiles"]>) =>
      loadSearchService().then(({ searchFiles }) => searchFiles(...args)),
    searchMultipleBranchesWithTreesApi: (
      ...args: Parameters<SearchServiceModule["searchMultipleBranchesWithTreesApi"]>
    ) =>
      loadSearchService().then(({ searchMultipleBranchesWithTreesApi }) =>
        searchMultipleBranchesWithTreesApi(...args),
      ),
  },

  /** 索引搜索服务 - 使用生成的索引进行检索 */
  SearchIndex: {
    isEnabled: (): boolean => getSearchIndexConfig().enabled,
    getManifest: (...args: Parameters<SearchIndexServiceModule["getSearchIndexManifest"]>) =>
      loadSearchIndexService().then(({ getSearchIndexManifest }) =>
        getSearchIndexManifest(...args),
      ),
    ensureReady: (...args: Parameters<SearchIndexServiceModule["ensureSearchIndexReady"]>) =>
      loadSearchIndexService().then(({ ensureSearchIndexReady }) =>
        ensureSearchIndexReady(...args),
      ),
    getIndexedBranches: (...args: Parameters<SearchIndexServiceModule["getIndexedBranches"]>) =>
      loadSearchIndexService().then(({ getIndexedBranches }) => getIndexedBranches(...args)),
    prefetchBranch: (
      ...args: Parameters<SearchIndexServiceModule["prefetchSearchIndexForBranch"]>
    ) =>
      loadSearchIndexService().then(({ prefetchSearchIndexForBranch }) =>
        prefetchSearchIndexForBranch(...args),
      ),
    search: (...args: Parameters<SearchIndexServiceModule["searchIndex"]>) =>
      loadSearchIndexService().then(({ searchIndex }) => searchIndex(...args)),
    invalidateCache: (): void => {
      void loadSearchIndexService().then(({ invalidateSearchIndexCache }) => {
        invalidateSearchIndexCache();
      });
    },
    refresh: (...args: Parameters<SearchIndexServiceModule["refreshSearchIndex"]>) =>
      loadSearchIndexService().then(({ refreshSearchIndex }) => refreshSearchIndex(...args)),
  },

  /** 分支服务 - 管理 Git 分支 */
  Branch: {
    getBranches: (...args: Parameters<BranchServiceModule["getBranches"]>) =>
      loadBranchService().then(({ getBranches }) => getBranches(...args)),
    getCurrentBranch: ConfigModule.getCurrentBranch,
    setCurrentBranch: ConfigModule.setCurrentBranch,
    getDefaultBranchName: ConfigModule.getDefaultBranch,
  },

  /** 缓存服务 - 管理缓存和统计 */
  Cache: {
    clearCache: (...args: Parameters<StatsServiceModule["clearCache"]>) =>
      loadStatsService().then(({ clearCache }) => clearCache(...args)),
    getCacheStats: (): ReturnType<CacheManagerClass["getCacheStats"]> =>
      CacheManagerClass.getCacheStats(),
    getNetworkStats: (...args: Parameters<StatsServiceModule["getNetworkStats"]>) =>
      loadStatsService().then(({ getNetworkStats }) => getNetworkStats(...args)),
    CacheManager: CacheManagerClass,
  },

  /** 预加载服务 - 预加载相关内容 */
  Prefetch: {
    prefetchContents: (...args: Parameters<PrefetchServiceModule["prefetchContents"]>): void => {
      void loadPrefetchService().then(({ prefetchContents }) => {
        prefetchContents(...args);
      });
    },
    batchPrefetchContents: (...args: Parameters<PrefetchServiceModule["batchPrefetchContents"]>) =>
      loadPrefetchService().then(({ batchPrefetchContents }) => batchPrefetchContents(...args)),
    prefetchRelatedContent: (
      ...args: Parameters<PrefetchServiceModule["prefetchRelatedContent"]>
    ) =>
      loadPrefetchService().then(({ prefetchRelatedContent }) => prefetchRelatedContent(...args)),
  },

  /** 认证服务 - Token 和授权管理 */
  Auth: {
    getTokenCount: AuthModule.getTokenCount,
    hasToken: AuthModule.hasToken,
    setLocalToken: AuthModule.setLocalToken,
    getAuthHeaders: AuthModule.getAuthHeaders,
    handleApiError: AuthModule.handleApiError,
    updateTokenRateLimitFromResponse: AuthModule.updateTokenRateLimitFromResponse,
  },

  /** 代理服务 - 管理代理和图片转换 */
  Proxy: {
    getProxiedUrl: proxyGetProxiedUrl,
    getProxiedUrlSync: proxyGetProxiedUrlSync,
    markProxyServiceFailed: proxyMarkProxyServiceFailed,
    getCurrentProxyService: proxyGetCurrentProxyService,
    resetFailedProxyServices: proxyResetFailedProxyServices,
    getProxyHealthStats: proxyGetProxyHealthStats,
    transformImageUrl: proxyTransformImageUrl,
  },

  /** 工具服务 */
  Utils: {
    getBatcher: ContentServiceModule.getBatcher,
    TokenManager: GitHubTokenManager,
    RequestBatcher: RequestBatcherClass,
  },
} as const;

// 导出类型定义
export type { ConfigInfo } from "./github/core/Config";
