import { logger } from "@/utils";
import { getCurrentBranch } from "../core/Config";
import type { CacheStats } from "./CacheTypes";
import { AdvancedCache } from "./AdvancedCache";
import { LRUCache } from "./LRUCache";
import { CONTENT_CACHE_CONFIG, FILE_CACHE_CONFIG } from "./CacheConfig";

const CONTENT_CACHE_ROOT_KEY = "__root__";

/**
 * 缓存管理器实现类
 *
 * 管理内容缓存和文件缓存，提供统一的缓存访问接口。
 * 支持缓存初始化、清除和统计功能。
 */
class CacheManagerImpl {
  private contentCache: AdvancedCache<string, unknown> | null = null;
  private fileCache: AdvancedCache<string, string> | null = null;
  private initialized = false;

  /**
   * 初始化缓存管理器
   *
   * 并行创建和初始化内容缓存和文件缓存的持久化存储，提高初始化性能。
   *
   * @returns Promise，初始化完成后解析
   * @throws 当缓存初始化失败时抛出错误
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 并行创建和初始化缓存实例，提高初始化性能
      const [contentCache, fileCache] = await Promise.all([
        (async () => {
          const cache = new AdvancedCache<string, unknown>(CONTENT_CACHE_CONFIG);
          await cache.initializePersistence();
          return cache;
        })(),
        (async () => {
          const cache = new AdvancedCache<string, string>(FILE_CACHE_CONFIG);
          await cache.initializePersistence();
          return cache;
        })(),
      ]);

      this.contentCache = contentCache;
      this.fileCache = fileCache;
      this.initialized = true;
      logger.info("缓存管理器初始化完成");
    } catch (error) {
      logger.error("缓存管理器初始化失败", error);
      throw error;
    }
  }

  /**
   * 获取内容缓存实例
   *
   * @returns 内容缓存对象
   */
  public getContentCache(): AdvancedCache<string, unknown> {
    this.contentCache ??= new AdvancedCache<string, unknown>(CONTENT_CACHE_CONFIG);
    return this.contentCache;
  }

  /**
   * 获取文件缓存实例
   *
   * @returns 文件缓存对象
   */
  public getFileCache(): AdvancedCache<string, string> {
    this.fileCache ??= new AdvancedCache<string, string>(FILE_CACHE_CONFIG);
    return this.fileCache;
  }

  /**
   * 清除所有缓存
   *
   * 清除内容缓存和文件缓存中的所有数据。
   *
   * @returns Promise，清除完成后解析
   */
  public async clearAllCaches(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.contentCache !== null) {
      promises.push(this.contentCache.clear());
    }
    if (this.fileCache !== null) {
      promises.push(this.fileCache.clear());
    }

    await Promise.all(promises);
    logger.info("已清除所有API缓存");
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 包含内容缓存和文件缓存统计信息的对象
   */
  public getCacheStats(): { content: CacheStats; file: CacheStats } {
    const defaultStats: CacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0,
      lastCleanup: 0,
    };

    return {
      content: this.contentCache?.getStats() ?? defaultStats,
      file: this.fileCache?.getStats() ?? defaultStats,
    };
  }

  /**
   * 预取内容
   *
   * 预加载指定路径的内容到缓存中。
   *
   * @param paths - 要预取的路径数组
   * @returns void
   */
  public prefetchContent(paths: string[]): void {
    if (this.contentCache === null || paths.length === 0) {
      return;
    }

    const branch = getCurrentBranch();
    const keys = paths.map((path) => {
      const normalizedPath = path === "" ? CONTENT_CACHE_ROOT_KEY : path;
      return `contents_${branch}__${normalizedPath}`;
    });

    this.contentCache.prefetch(keys);
  }
}

/**
 * 缓存管理器单例实例
 *
 * 全局缓存管理器，用于管理内容和文件缓存。
 */
export const CacheManager = new CacheManagerImpl();

export { AdvancedCache, LRUCache };
export type { CacheStats };
export { CONTENT_CACHE_CONFIG, FILE_CACHE_CONFIG };
export type { CacheConfig } from "./CacheTypes";
export { DEFAULT_CACHE_CONFIG } from "./CacheConfig";
