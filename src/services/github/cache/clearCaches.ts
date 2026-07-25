import { resetFailedProxyServices } from "../proxy/ProxyService";
import { clearBatcherCache } from "../core/content/service";
import { clearBranchTreeCache } from "../core/search/trees";
import { CacheManager } from "./CacheManager";

/**
 * 清除所有缓存并重置网络/代理状态
 */
export async function clearCaches(): Promise<void> {
  await CacheManager.clearAllCaches();
  clearBatcherCache();
  clearBranchTreeCache();
  resetFailedProxyServices();
}
