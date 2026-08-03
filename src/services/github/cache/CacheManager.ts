import { logger } from "@/utils/logging/logger";
import { AdvancedCache } from "./AdvancedCache";
import { CONTENT_CACHE_CONFIG, FILE_CACHE_CONFIG } from "./CacheConfig";

/**
 * 缓存管理器实现类
 *
 * 管理内容缓存和文件缓存，提供统一的缓存访问接口。
 */
class CacheManagerImpl {
  private contentCache: AdvancedCache<string, unknown> | null = null;
  private fileCache: AdvancedCache<string, string> | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  public initialize(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    this.initializationPromise ??= this.initializeImpl().finally(() => {
      this.initializationPromise = null;
    });

    return this.initializationPromise;
  }

  private async initializeImpl(): Promise<void> {
    try {
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

  public getContentCache(): AdvancedCache<string, unknown> {
    this.contentCache ??= new AdvancedCache<string, unknown>(CONTENT_CACHE_CONFIG);
    return this.contentCache;
  }

  public getFileCache(): AdvancedCache<string, string> {
    this.fileCache ??= new AdvancedCache<string, string>(FILE_CACHE_CONFIG);
    return this.fileCache;
  }

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
}

export const CacheManager = new CacheManagerImpl();
