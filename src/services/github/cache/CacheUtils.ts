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

/**
 * 估算对象大小
 *
 * 通过JSON序列化估算对象占用的字节数。
 *
 * @param obj - 要估算的对象
 * @returns 估算的字节数
 */
export function estimateSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 1024;
  }
}
