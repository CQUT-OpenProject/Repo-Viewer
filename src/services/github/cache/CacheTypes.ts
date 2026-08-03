/**
 * 缓存配置接口
 */
export interface CacheConfig {
  // 基础TTL配置
  defaultTTL: number;
  maxTTL: number;
  minTTL: number;

  // 自适应TTL配置
  enableAdaptiveTTL: boolean;
  frequentAccessThreshold: number; // 高频访问阈值
  frequentAccessMultiplier: number; // 高频访问TTL倍数

  // 缓存大小配置
  maxSize: number;
  memoryPressureThreshold: number; // 内存压力阈值（0-1）

  // 持久化配置
  enablePersistence: boolean;
  useIndexedDB: boolean; // 优先使用IndexedDB而不是localStorage
  storageKey: string;
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
  lastCleanup: number;
}

/**
 * 缓存项元数据接口
 */
export interface CacheItemMeta {
  value: unknown;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size: number;
}
