/**
 * 搜索索引服务模块
 *
 * 提供GitHub仓库搜索索引的统一管理接口，包括：
 * - 获取搜索索引清单
 * - 检查搜索索引是否启用
 * - 确保搜索索引准备就绪
 * - 获取已索引的分支列表
 * - 预取特定分支的搜索索引
 * - 清除搜索索引缓存
 * - 刷新搜索索引
 *
 * @module services/github/core/searchIndex/service
 */

import { getSearchIndexConfig } from "@/config";

import type { SearchIndexManifest } from "../../schemas";
import {
  fetchManifest,
  invalidateSearchIndexCache as clearSearchIndexCache,
  prefetchSearchIndexForBranch as prefetchBranch,
  refreshSearchIndexManifest,
} from "./fetchers";
import {
  createSearchIndexError,
  SearchIndexError,
  SearchIndexErrorCode,
  type SearchIndexErrorDetails,
} from "./errors";
import { searchIndex, type SearchIndexResultItem, type SearchIndexSearchOptions } from "./search";

export { searchIndex, SearchIndexError, SearchIndexErrorCode, createSearchIndexError };
export type { SearchIndexErrorDetails, SearchIndexResultItem, SearchIndexSearchOptions };

/**
 * 获取搜索索引清单
 *
 * 从远程获取仓库的搜索索引清单文件，包含所有已索引分支的元数据。
 *
 * @param signal - 可选的AbortSignal，用于取消请求
 * @returns 搜索索引清单对象
 * @throws 当请求失败时抛出错误
 */
export async function getSearchIndexManifest(signal?: AbortSignal): Promise<SearchIndexManifest> {
  return fetchManifest(signal);
}

/**
 * 检查搜索索引功能是否已启用
 *
 * 根据配置判断搜索索引功能是否可用。
 *
 * @returns 如果搜索索引已启用则返回true，否则返回false
 */
export function isSearchIndexEnabled(): boolean {
  return getSearchIndexConfig().enabled;
}

/**
 * 确保搜索索引准备就绪
 *
 * 检查搜索索引功能是否启用，并验证清单文件可访问。
 * 如果功能被禁用，会抛出错误。
 *
 * @param signal - 可选的AbortSignal，用于取消请求
 * @throws 当搜索索引功能被禁用或请求失败时抛出SearchIndexError
 */
export async function ensureSearchIndexReady(signal?: AbortSignal): Promise<void> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, "Search index feature is disabled");
  }

  await fetchManifest(signal);
}

/**
 * 获取已索引的分支列表
 *
 * 从搜索索引清单中提取所有已建立索引的分支名称。
 *
 * @param signal - 可选的AbortSignal，用于取消请求
 * @returns 已索引的分支名称数组
 */
export async function getIndexedBranches(signal?: AbortSignal): Promise<string[]> {
  const manifest = await fetchManifest(signal);
  return Object.keys(manifest.branches);
}

/**
 * 预取特定分支的搜索索引
 *
 * 提前加载指定分支的搜索索引数据到缓存中，以优化后续搜索性能。
 *
 * @param branch - 要预取的分支名称
 * @param signal - 可选的AbortSignal，用于取消请求
 * @returns 如果预取成功返回true，否则返回false
 */
export async function prefetchSearchIndexForBranch(
  branch: string,
  signal?: AbortSignal,
): Promise<boolean> {
  return prefetchBranch(branch, signal);
}

/**
 * 清除搜索索引缓存
 *
 * 清除本地缓存的搜索索引数据，强制下次请求时重新获取。
 */
export function invalidateSearchIndexCache(): void {
  clearSearchIndexCache();
}

/**
 * 刷新搜索索引
 *
 * 强制重新获取最新的搜索索引清单，忽略本地缓存。
 *
 * @param signal - 可选的AbortSignal，用于取消请求
 * @returns 最新的搜索索引清单对象
 */
export async function refreshSearchIndex(signal?: AbortSignal): Promise<SearchIndexManifest> {
  return refreshSearchIndexManifest(signal);
}
