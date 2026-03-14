/**
 * 搜索索引服务模块
 *
 * 提供搜索索引的查询、预取、缓存管理功能。
 */

export {
  searchIndex,
  getSearchIndexManifest,
  isSearchIndexEnabled,
  ensureSearchIndexReady,
  getIndexedBranches,
  prefetchSearchIndexForBranch,
  invalidateSearchIndexCache,
  refreshSearchIndex,
  SearchIndexError,
  SearchIndexErrorCode,
  createSearchIndexError,
} from "./service";

export type {
  SearchIndexErrorDetails,
  SearchIndexResultItem,
  SearchIndexSearchOptions,
} from "./service";
