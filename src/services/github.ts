/**
 * GitHub 服务模块
 *
 * 提供分组导出，以满足不同的使用场景。
 */

import * as ContentServiceModule from "./github/core/content/service";
import * as AuthModule from "./github/core/Auth";
import * as ConfigModule from "./github/core/Config";
import {
  markProxyServiceFailed as proxyMarkProxyServiceFailed,
  markProxyServiceSucceeded as proxyMarkProxyServiceSucceeded,
  getCurrentProxyService as proxyGetCurrentProxyService,
  transformImageUrl as proxyTransformImageUrl,
} from "./github/proxy/ProxyService";

type SearchServiceModule = typeof import("./github/core/search");
type BranchServiceModule = typeof import("./github/core/BranchService");
type ClearCachesModule = typeof import("./github/cache/clearCaches");

const loadSearchService = (() => {
  let modulePromise: Promise<SearchServiceModule> | null = null;
  return (): Promise<SearchServiceModule> => {
    modulePromise ??= import("./github/core/search");
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

const loadClearCaches = (() => {
  let modulePromise: Promise<ClearCachesModule> | null = null;
  return (): Promise<ClearCachesModule> => {
    modulePromise ??= import("./github/cache/clearCaches");
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
 * const contents = await GitHub.Content.getContents(path);
 * const branches = await GitHub.Branch.getBranches();
 * ```
 */
export const GitHub = {
  Content: {
    getContents: ContentServiceModule.getContents,
    getFileContent: ContentServiceModule.getFileContent,
    hydrate: ContentServiceModule.hydrateInitialContent,
  },

  Search: {
    searchMultipleBranchesWithTreesApi: (
      ...args: Parameters<SearchServiceModule["searchMultipleBranchesWithTreesApi"]>
    ) =>
      loadSearchService().then(({ searchMultipleBranchesWithTreesApi }) =>
        searchMultipleBranchesWithTreesApi(...args),
      ),
    searchCode: (...args: Parameters<SearchServiceModule["searchCodeWithApi"]>) =>
      loadSearchService().then(({ searchCodeWithApi }) => searchCodeWithApi(...args)),
  },

  Branch: {
    getBranches: (...args: Parameters<BranchServiceModule["getBranches"]>) =>
      loadBranchService().then(({ getBranches }) => getBranches(...args)),
    getCurrentBranch: ConfigModule.getCurrentBranch,
    setCurrentBranch: ConfigModule.setCurrentBranch,
    getDefaultBranchName: ConfigModule.getDefaultBranch,
  },

  Cache: {
    clearCache: (...args: Parameters<ClearCachesModule["clearCaches"]>) =>
      loadClearCaches().then(({ clearCaches }) => clearCaches(...args)),
  },

  Auth: {
    getTokenCount: AuthModule.getTokenCount,
    hasToken: AuthModule.hasToken,
  },

  Proxy: {
    markProxyServiceFailed: proxyMarkProxyServiceFailed,
    markProxyServiceSucceeded: proxyMarkProxyServiceSucceeded,
    getCurrentProxyService: proxyGetCurrentProxyService,
    transformImageUrl: proxyTransformImageUrl,
  },
} as const;
