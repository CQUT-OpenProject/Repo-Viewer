/**
 * GitHub 服务模块
 *
 * 提供分组导出和扁平化导出两种方式，以满足不同的使用场景。
 */

// 导入各个服务模块
import * as ContentServiceModule from "./github/core/content";
import * as SearchServiceModule from "./github/core/search";
import * as SearchIndexServiceModule from "./github/core/searchIndex";
import * as BranchServiceModule from "./github/core/BranchService";
import * as StatsServiceModule from "./github/core/StatsService";
import * as PrefetchServiceModule from "./github/core/PrefetchService";
import * as AuthModule from "./github/core/Auth";
import * as ConfigModule from "./github/core/Config";
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
    searchWithGitHubApi: SearchServiceModule.searchWithGitHubApi,
    searchFiles: SearchServiceModule.searchFiles,
    searchMultipleBranchesWithTreesApi: SearchServiceModule.searchMultipleBranchesWithTreesApi,
  },

  /** 索引搜索服务 - 使用生成的索引进行检索 */
  SearchIndex: {
    isEnabled: SearchIndexServiceModule.isSearchIndexEnabled,
    getManifest: SearchIndexServiceModule.getSearchIndexManifest,
    ensureReady: SearchIndexServiceModule.ensureSearchIndexReady,
    getIndexedBranches: SearchIndexServiceModule.getIndexedBranches,
    prefetchBranch: SearchIndexServiceModule.prefetchSearchIndexForBranch,
    search: SearchIndexServiceModule.searchIndex,
    invalidateCache: SearchIndexServiceModule.invalidateSearchIndexCache,
    refresh: SearchIndexServiceModule.refreshSearchIndex,
  },

  /** 分支服务 - 管理 Git 分支 */
  Branch: {
    getBranches: BranchServiceModule.getBranches,
    getCurrentBranch: ConfigModule.getCurrentBranch,
    setCurrentBranch: ConfigModule.setCurrentBranch,
    getDefaultBranchName: ConfigModule.getDefaultBranch,
  },

  /** 缓存服务 - 管理缓存和统计 */
  Cache: {
    clearCache: StatsServiceModule.clearCache,
    getCacheStats: StatsServiceModule.getCacheStats,
    getNetworkStats: StatsServiceModule.getNetworkStats,
    CacheManager: CacheManagerClass,
  },

  /** 预加载服务 - 预加载相关内容 */
  Prefetch: {
    prefetchContents: PrefetchServiceModule.prefetchContents,
    batchPrefetchContents: PrefetchServiceModule.batchPrefetchContents,
    prefetchRelatedContent: PrefetchServiceModule.prefetchRelatedContent,
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

// 扁平导出常用函数
export { searchMultipleBranchesWithTreesApi } from "./github/core/search";

// 导出类型定义
export type { ConfigInfo } from "./github/core/Config";
