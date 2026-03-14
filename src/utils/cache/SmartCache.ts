/**
 * 智能缓存条目接口
 */
interface CacheEntry<T> {
  value: T;
  lastAccess: number;
  hitCount: number;
}

/**
 * 智能缓存配置选项
 */
export interface SmartCacheOptions {
  /**
   * 最大缓存大小
   */
  maxSize?: number;

  /**
   * 触发清理的阈值（0-1之间的百分比）
   */
  cleanupThreshold?: number;

  /**
   * 清理时移除的条目百分比（0-1之间）
   */
  cleanupRatio?: number;

  /**
   * TTL（生存时间）毫秒，可选
   */
  ttl?: number;

  /**
   * 时间权重 - 用于得分计算，越大则时间因素影响越大
   */
  timeWeight?: number;

  /**
   * 频率权重 - 用于得分计算，越大则访问频率影响越大
   */
  frequencyWeight?: number;
}

/**
 * 智能缓存类
 *
 * 提供LRU（最近最少使用）和LFU（最不经常使用）混合策略的缓存管理。
 * 自动清理最少访问的条目，支持TTL过期。
 */
export class SmartCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly cleanupThreshold: number;
  private readonly cleanupRatio: number;
  private readonly ttl: number | undefined;
  private readonly timeWeight: number;
  private readonly frequencyWeight: number;

  constructor(options: SmartCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 50;
    this.cleanupThreshold = options.cleanupThreshold ?? 0.8;
    this.cleanupRatio = options.cleanupRatio ?? 0.2;
    this.ttl = options.ttl;
    this.timeWeight = options.timeWeight ?? 1;
    this.frequencyWeight = options.frequencyWeight ?? 1;
  }

  /**
   * 获取缓存值
   * @param key - 缓存键
   * @returns 缓存的值，如果不存在或已过期则返回 null
   */
  get(key: K): V | null {
    const entry = this.cache.get(key);

    if (entry === undefined) {
      return null;
    }

    // 检查是否过期
    if (this.ttl !== undefined && Date.now() - entry.lastAccess > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问时间和计数
    entry.lastAccess = Date.now();
    entry.hitCount++;

    return entry.value;
  }

  /**
   * 设置缓存值
   * @param key - 缓存键
   * @param value - 要缓存的值
   */
  set(key: K, value: V): void {
    // 检查是否需要清理
    if (this.cache.size >= this.maxSize * this.cleanupThreshold && !this.cache.has(key)) {
      this.cleanup();
    }

    // 设置或更新缓存条目
    const existing = this.cache.get(key);
    this.cache.set(key, {
      value,
      lastAccess: Date.now(),
      hitCount: existing !== undefined ? existing.hitCount + 1 : 1,
    });
  }

  /**
   * 检查缓存中是否存在指定键
   * @param key - 缓存键
   * @returns 是否存在
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);

    if (entry === undefined) {
      return false;
    }

    // 检查是否过期
    if (this.ttl !== undefined && Date.now() - entry.lastAccess > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除指定键的缓存
   * @param key - 缓存键
   * @returns 是否删除成功
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取当前缓存大小
   * @returns 缓存条目数量
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 清理缓存，移除最少使用的条目
   *
   * 使用可配置的混合策略：结合访问频率和最后访问时间。
   * 得分公式：(频率 × 频率权重) / (1 + 时间因子 × 时间权重)
   *
   * - 访问频率高的条目得分高
   * - 最近访问的条目得分高
   * - 可通过调整权重来平衡 LRU 和 LFU 策略
   */
  private cleanup(): void {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();

    // 计算每个条目的得分（越低越容易被清理）
    const scoredEntries = entries.map(([key, entry]) => {
      // 时间因子：以分钟为单位
      const timeFactor = (now - entry.lastAccess) / 60000;
      // 频率因子：访问次数
      const frequencyFactor = entry.hitCount;

      // 可配置的得分公式
      // - frequencyWeight 越大，越偏向 LFU（最不经常使用）
      // - timeWeight 越大，越偏向 LRU（最近最少使用）
      const score = (frequencyFactor * this.frequencyWeight) / (1 + timeFactor * this.timeWeight);

      return { key, score };
    });

    // 确保 scoredEntries 不为空
    if (scoredEntries.length === 0) {
      return;
    }

    // 按得分排序（升序，得分低的先删除）
    scoredEntries.sort((a, b) => a.score - b.score);

    // 计算要删除的条目数量
    const toRemove = Math.floor(this.cache.size * this.cleanupRatio);

    // 删除得分最低的条目
    for (let i = 0; i < toRemove && i < scoredEntries.length; i++) {
      const entry = scoredEntries[i];
      if (entry !== undefined) {
        this.cache.delete(entry.key);
      }
    }
  }
}
