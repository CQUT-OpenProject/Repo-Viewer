import type { CacheConfig, CacheItemMeta } from "./CacheTypes";

/**
 * 计算缓存项的TTL（生存时间）
 *
 * 根据访问频率动态调整TTL。
 *
 * @param config - 缓存配置
 * @param item - 缓存项元数据
 * @returns TTL时间（毫秒）
 */
export function calculateTTL(config: CacheConfig, item: CacheItemMeta): number {
  if (!config.enableAdaptiveTTL) {
    return config.defaultTTL;
  }
  let ttl = config.defaultTTL;
  if (item.accessCount >= config.frequentAccessThreshold) {
    ttl *= config.frequentAccessMultiplier;
  }
  return Math.min(Math.max(ttl, config.minTTL), config.maxTTL);
}
