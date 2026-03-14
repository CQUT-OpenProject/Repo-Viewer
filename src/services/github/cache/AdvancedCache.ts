import { logger } from "@/utils";
import type { CacheConfig, CacheStats, CacheItemMeta } from "./CacheTypes";
import { calculateTTL, estimateSize } from "./CacheUtils";
import {
  buildDbName,
  clearIndexedDB,
  clearLocalStorage,
  deleteDatabase,
  deleteItemFromIndexedDB,
  deleteItemFromLocalStorage,
  initIndexedDB,
  loadAllFromIndexedDB,
  loadItemFromIndexedDB,
  loadItemFromLocalStorage,
  saveItemToIndexedDB,
  saveItemToLocalStorage,
} from "./CachePersistence";
import { LRUCache } from "./LRUCache";
import { getMinK } from "@/utils/data-structures/MinHeap";

/**
 * 高级缓存类
 *
 * 提供LRU缓存功能，支持持久化存储（IndexedDB/LocalStorage）、
 * 自适应TTL、内存管理和缓存统计。
 *
 * @template K - 缓存键类型（必须为string）
 * @template V - 缓存值类型
 */
export class AdvancedCache<K extends string, V> {
  private readonly cache: LRUCache<K>;
  private readonly config: CacheConfig;
  private readonly stats: CacheStats;
  private readonly dbName: string;
  private db: IDBDatabase | null = null;

  constructor(config: CacheConfig) {
    this.cache = new LRUCache<K>(config.maxSize);
    this.config = { ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0,
      lastCleanup: Date.now(),
    };

    this.dbName = buildDbName(this.config.storageKey);

    if (this.config.enablePersistence) {
      void this.initializePersistence();
    }

    this.startPeriodicCleanup();
  }

  /**
   * 初始化持久化存储
   *
   * 优先使用IndexedDB，失败时回退到LocalStorage。
   *
   * @returns Promise，初始化完成后解析
   */
  public async initializePersistence(): Promise<void> {
    if (this.config.useIndexedDB && typeof indexedDB !== "undefined") {
      try {
        const handles = { dbName: this.dbName, db: this.db };
        await initIndexedDB(handles, this.config);
        this.db = handles.db;
        await this.loadFromIndexedDB();
        logger.debug(`IndexedDB初始化成功: ${this.config.storageKey}`);
      } catch (error: unknown) {
        logger.warn(`IndexedDB初始化失败，尝试重新初始化: ${this.config.storageKey}`, error);
        try {
          if (this.db !== null) {
            this.db.close();
            this.db = null;
          }
          await deleteDatabase(this.dbName);
          const handles = { dbName: this.dbName, db: this.db };
          await initIndexedDB(handles, this.config);
          this.db = handles.db;
          await this.loadFromIndexedDB();
          logger.info(`IndexedDB重新初始化成功: ${this.config.storageKey}`);
        } catch (retryError: unknown) {
          logger.warn(
            `IndexedDB重新初始化失败，回退到localStorage: ${this.config.storageKey}`,
            retryError,
          );
          this.config.useIndexedDB = false;
          await this.loadFromLocalStorage();
        }
      }
    } else if (typeof localStorage !== "undefined") {
      await this.loadFromLocalStorage();
    }
  }

  /**
   * 获取缓存项
   *
   * 从缓存中获取值，自动检查TTL并更新访问统计。
   *
   * @param key - 缓存键
   * @returns Promise，解析为缓存的值，如果不存在或已过期则返回undefined
   */
  async get(key: K): Promise<V | undefined> {
    const keyStr = key;
    let item = this.cache.get(key);

    if (item === undefined && this.config.enablePersistence) {
      item = await this.loadItemFromPersistence(keyStr);
      if (item !== undefined) {
        this.cache.set(key, item);
      }
    }

    if (item === undefined) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    const now = Date.now();
    const ttl = calculateTTL(this.config, item);

    if (now - item.timestamp > ttl) {
      await this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    item.accessCount++;
    item.lastAccess = now;

    // LRUCache 的 get 方法已自动将节点移动到尾部

    if (this.config.enablePersistence) {
      this.saveItemToPersistence(keyStr, item).catch((error: unknown) => {
        logger.warn("保存缓存项到持久化存储失败", error);
      });
    }

    this.stats.hits++;
    this.updateHitRate();
    return item.value as V;
  }

  /**
   * 设置缓存项
   *
   * 将值存储到缓存中，支持持久化和内存管理。
   *
   * @param key - 缓存键
   * @param value - 要缓存的值
   * @param version - 版本标识，默认为'1.0'
   * @returns Promise，设置完成后解析
   */
  async set(key: K, value: V, version = "1.0"): Promise<void> {
    const now = Date.now();
    const keyStr = key;
    await this.checkMemoryPressureAndCleanup();
    const size = estimateSize(value);

    const item: CacheItemMeta = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
      size,
      version,
    };

    this.cache.set(key, item);
    this.stats.size = this.cache.size;
    this.updateMemoryUsage();

    if (this.config.enablePersistence) {
      this.saveItemToPersistence(keyStr, item).catch((error: unknown) => {
        logger.warn("保存缓存项到持久化存储失败", error);
      });
    }
  }

  /**
   * 检查内存压力并清理缓存
   *
   * 根据当前缓存负载动态调整清理比例：
   * - 负载 >= 0.95: 清理 50% 的缓存项
   * - 负载 >= 0.9:  清理 30% 的缓存项
   * - 其他情况:     清理 20% 的缓存项
   */
  private async checkMemoryPressureAndCleanup(): Promise<void> {
    const currentLoad = this.cache.size / this.config.maxSize;

    if (currentLoad >= this.config.memoryPressureThreshold) {
      // 根据压力程度动态调整清理比例
      const cleanupRatio = currentLoad >= 0.95 ? 0.5 : currentLoad >= 0.9 ? 0.3 : 0.2;
      const itemsToRemove = Math.floor(this.config.maxSize * cleanupRatio);
      await this.cleanupLeastUsed(itemsToRemove);
      logger.debug(
        `内存压力清理（负载 ${(currentLoad * 100).toFixed(1)}%）：删除了${itemsToRemove.toString()}个缓存项（清理比例 ${(cleanupRatio * 100).toFixed(0)}%）`,
      );
    }
  }

  /**
   * 清理最少使用的缓存项
   *
   * @param count - 要清理的项目数量
   */
  private async cleanupLeastUsed(count: number): Promise<void> {
    // 收集所有条目及其评分
    const items: { key: K; score: number }[] = [];

    this.cache.forEach((item, key) => {
      const score = item.accessCount * 1000 + item.lastAccess;
      items.push({ key, score });
    });

    // 使用最小堆获取评分最低的 k 个元素
    const leastUsed = getMinK(items, count, (a, b) => a.score - b.score);

    // 删除这些项目
    for (const { key } of leastUsed) {
      await this.delete(key);
    }
  }

  /**
   * 删除缓存项
   *
   * 从缓存和持久化存储中删除指定键的值。
   *
   * @param key - 缓存键
   * @returns Promise，解析为是否成功删除
   */
  async delete(key: K): Promise<boolean> {
    const keyStr = key;
    const result = this.cache.delete(key);
    if (result) {
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
      if (this.config.enablePersistence) {
        await this.deleteItemFromPersistence(keyStr).catch((error: unknown) => {
          logger.warn("从持久化存储删除缓存项失败", error);
        });
      }
    }
    return result;
  }

  /**
   * 清空缓存
   *
   * 清除所有缓存项和持久化存储。
   *
   * @returns Promise，清空完成后解析
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.updateMemoryUsage();
    this.updateHitRate();

    if (this.config.enablePersistence) {
      await this.clearPersistence().catch((error: unknown) => {
        logger.warn("清除持久化存储失败", error);
      });
    }
  }

  /**
   * 获取缓存大小
   *
   * @returns 当前缓存的项目数量
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存统计对象
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    this.cache.forEach((item) => {
      totalSize += item.size;
    });
    this.stats.memoryUsage = totalSize;
  }

  /**
   * 启动定期清理任务
   *
   * 根据缓存大小动态调整清理间隔：
   * - 缓存项 > 100: 每 2 分钟清理一次
   * - 缓存项 > 50:  每 3 分钟清理一次
   * - 其他情况:     每 5 分钟清理一次
   */
  private startPeriodicCleanup(): void {
    const getCleanupInterval = (): number => {
      const size = this.cache.size;
      if (size > 100) {
        return 2 * 60 * 1000; // 2 分钟
      } else if (size > 50) {
        return 3 * 60 * 1000; // 3 分钟
      } else {
        return 5 * 60 * 1000; // 5 分钟
      }
    };

    const scheduleNextCleanup = (): void => {
      const interval = getCleanupInterval();
      setTimeout(() => {
        this.performPeriodicCleanup()
          .then(() => {
            // 清理完成后，根据新的缓存大小重新安排下次清理
            scheduleNextCleanup();
          })
          .catch((error: unknown) => {
            logger.warn("定期清理失败", error);
            // 失败后仍然继续安排下次清理
            scheduleNextCleanup();
          });
      }, interval);
    };

    scheduleNextCleanup();
  }

  private async performPeriodicCleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: K[] = [];

    this.cache.forEach((item, key) => {
      const ttl = calculateTTL(this.config, item);
      if (now - item.timestamp > ttl) {
        expiredKeys.push(key);
      }
    });

    for (const key of expiredKeys) {
      await this.delete(key);
    }

    this.stats.lastCleanup = now;

    if (expiredKeys.length > 0) {
      logger.debug(`定期清理：删除了${expiredKeys.length.toString()}个过期缓存项`);
    }
  }

  /**
   * 预取缓存项
   *
   * 延迟加载指定键的数据到缓存中。
   *
   * @param keys - 要预取的键数组
   * @returns void
   */
  prefetch(keys: K[]): void {
    if (!this.config.enablePrefetch) {
      return;
    }

    window.setTimeout(() => {
      keys.forEach((key) => {
        void this.get(key).catch((error: unknown) => {
          logger.debug(`预加载失败: ${key}`, error);
        });
      });
    }, this.config.prefetchDelay);
  }

  private async loadItemFromPersistence(key: string): Promise<CacheItemMeta | undefined> {
    if (this.config.useIndexedDB && this.db !== null) {
      return loadItemFromIndexedDB(this.db, this.config, key);
    } else {
      return loadItemFromLocalStorage(this.config, key);
    }
  }

  private async saveItemToPersistence(key: string, item: CacheItemMeta): Promise<void> {
    if (this.config.useIndexedDB && this.db !== null) {
      return saveItemToIndexedDB(this.db, this.config, key, item);
    } else {
      return saveItemToLocalStorage(this.config, key, item);
    }
  }

  private async deleteItemFromPersistence(key: string): Promise<void> {
    if (this.config.useIndexedDB && this.db !== null) {
      return deleteItemFromIndexedDB(this.db, this.config, key);
    } else {
      return deleteItemFromLocalStorage(this.config, key);
    }
  }

  private async clearPersistence(): Promise<void> {
    if (this.config.useIndexedDB && this.db !== null) {
      return clearIndexedDB(this.db, this.config);
    } else {
      return clearLocalStorage(this.config);
    }
  }

  private async loadFromIndexedDB(): Promise<void> {
    if (this.db === null) {
      logger.debug("IndexedDB连接不存在，跳过加载");
      return;
    }

    try {
      const items = await loadAllFromIndexedDB(this.db, this.config);
      let loadedCount = 0;
      const now = Date.now();
      const defaultTTL = this.config.defaultTTL;
      items.forEach((entry) => {
        try {
          if (now - entry.timestamp <= defaultTTL) {
            this.cache.set(entry.key as K, entry.data);
            loadedCount += 1;
          }
        } catch (error: unknown) {
          logger.debug(`加载缓存项失败: ${entry.key}`, error);
        }
      });
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
      logger.debug(`从IndexedDB恢复缓存: ${loadedCount.toString()}项 (${this.config.storageKey})`);
    } catch (error: unknown) {
      logger.debug("从IndexedDB加载失败", error);
    }
  }

  private loadItemFromLocalStorage(key: string): Promise<CacheItemMeta | undefined> {
    return new Promise((resolve) => {
      try {
        const item = localStorage.getItem(`${this.config.storageKey}_${key}`);
        if (item !== null) {
          const parsed = JSON.parse(item) as CacheItemMeta;
          resolve(parsed);
        } else {
          resolve(undefined);
        }
      } catch (error: unknown) {
        logger.warn("从localStorage加载缓存项失败", error);
        resolve(undefined);
      }
    });
  }

  private async loadFromLocalStorage(): Promise<void> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${this.config.storageKey}_`) === true) {
          keys.push(key.substring(`${this.config.storageKey}_`.length));
        }
      }

      let loadedCount = 0;
      for (const key of keys) {
        const item = await this.loadItemFromLocalStorage(key);
        if (item !== undefined) {
          const now = Date.now();
          const ttl = calculateTTL(this.config, item);
          if (now - item.timestamp <= ttl) {
            this.cache.set(key as K, item);
            loadedCount += 1;
          }
        }
      }

      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
      logger.debug(
        `从localStorage恢复缓存: ${loadedCount.toString()}项 (${this.config.storageKey})`,
      );
    } catch (error: unknown) {
      logger.warn("从localStorage加载缓存失败", error);
    }
  }
}
