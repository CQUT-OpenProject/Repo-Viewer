/**
 * GitHub 统计服务模块
 *
 * 提供缓存统计、网络统计等功能，支持清除缓存和重置网络状态。
 * 使用模块导出方式而非类封装，便于直接使用函数。
 *
 * @module StatsService
 */

import { CacheManager } from "../cache";
import { getProxyHealthStats, resetFailedProxyServices } from "../proxy";
import { clearBatcherCache, getBatcher } from "./content";

/**
 * 清除所有缓存和重置网络状态
 *
 * 清除内容缓存、文件缓存、批处理器缓存和代理失败记录。
 *
 * @returns Promise，清除完成后解析
 */
export async function clearCache(): Promise<void> {
  await CacheManager.clearAllCaches();
  clearBatcherCache();
  resetFailedProxyServices();
}

/**
 * 获取缓存统计信息
 *
 * @returns 缓存统计对象
 */
export function getCacheStats(): ReturnType<typeof CacheManager.getCacheStats> {
  return CacheManager.getCacheStats();
}

/**
 * 获取网络请求统计信息
 *
 * 返回批处理器、代理服务和缓存的统计信息。
 *
 * @returns Promise，解析为网络统计对象
 */
export async function getNetworkStats(): Promise<{
  batcher: unknown;
  proxy: ReturnType<typeof getProxyHealthStats>;
  cache: ReturnType<typeof getCacheStats>;
}> {
  return {
    batcher: getBatcher().getStats(),
    proxy: getProxyHealthStats(),
    cache: getCacheStats(),
  };
}
