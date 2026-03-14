import type { CacheConfig } from "./CacheTypes";

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000,
  maxTTL: 60 * 60 * 1000,
  minTTL: 30 * 1000,

  enableAdaptiveTTL: true,
  frequentAccessThreshold: 3,
  frequentAccessMultiplier: 3,

  maxSize: 100,
  memoryPressureThreshold: 0.8,

  enablePersistence: true,
  useIndexedDB: true,
  storageKey: "",

  enablePrefetch: true,
  prefetchDelay: 100,
};

/**
 * 内容缓存配置
 */
export const CONTENT_CACHE_CONFIG: CacheConfig = {
  ...DEFAULT_CACHE_CONFIG,
  defaultTTL: 10 * 60 * 1000,
  storageKey: "repo_viewer_content_cache_v2",
};

/**
 * 文件缓存配置
 */
export const FILE_CACHE_CONFIG: CacheConfig = {
  ...DEFAULT_CACHE_CONFIG,
  defaultTTL: 30 * 60 * 1000,
  maxTTL: 2 * 60 * 60 * 1000,
  storageKey: "repo_viewer_file_cache_v2",
};
