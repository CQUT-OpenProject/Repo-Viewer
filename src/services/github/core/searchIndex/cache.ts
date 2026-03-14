/**
 * 搜索索引缓存模块
 *
 * 管理搜索索引 manifest 和 docfind 模块的内存缓存。
 * 提供缓存的获取、设置和清除功能。
 *
 * @module searchIndex/cache
 */

import type { SearchIndexManifest } from "../../schemas";

/**
 * Manifest 缓存项接口
 */
interface ManifestCacheEntry {
  /** Manifest 数据 */
  data: SearchIndexManifest;
  /** 缓存获取时间戳 */
  fetchedAt: number;
}

export type DocfindSearchHandler = (query: string, limit?: number) => Promise<unknown[]>;

interface ModuleCacheEntry {
  search: DocfindSearchHandler;
  hash: string;
}

let manifestCache: ManifestCacheEntry | null = null;
const moduleCache = new Map<string, ModuleCacheEntry>();

export function getManifestCache(): ManifestCacheEntry | null {
  return manifestCache;
}

export function setManifestCache(entry: ManifestCacheEntry | null): void {
  manifestCache = entry;
}

export function getModuleCacheEntry(branch: string): ModuleCacheEntry | undefined {
  return moduleCache.get(branch);
}

export function setModuleCacheEntry(branch: string, entry: ModuleCacheEntry): void {
  moduleCache.set(branch, entry);
}

export function clearCaches(): void {
  manifestCache = null;
  moduleCache.clear();
}
