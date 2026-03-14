import { logger } from "@/utils";

/**
 * 时间轮条目
 *
 * @template T - 存储的数据类型
 */
interface TimeWheelEntry<T> {
  key: string;
  data: T;
  expiresAt: number;
}

/**
 * 时间轮数据结构
 *
 * @template T - 存储的数据类型
 */
export class TimeWheel<T> {
  private readonly slots: Map<string, TimeWheelEntry<T>>[];
  private readonly slotDuration: number; // 每个槽的时间跨度（毫秒）
  private readonly totalSlots: number;
  private readonly keyToSlot = new Map<string, number>();
  private currentSlotIndex = 0;
  private lastTickTime: number;
  private readonly tickInterval: number;
  private tickTimer: number | null = null;

  /**
   * 创建时间轮
   *
   * @param options - 配置选项
   * @param options.slotDuration - 每个槽的时间跨度（毫秒），默认 60000 (1分钟)
   * @param options.totalSlots - 总槽数，默认 60（覆盖 1 小时）
   * @param options.tickInterval - 时钟滴答间隔（毫秒），默认 10000 (10秒)
   */
  constructor(
    options: {
      slotDuration?: number;
      totalSlots?: number;
      tickInterval?: number;
    } = {},
  ) {
    this.slotDuration = options.slotDuration ?? 60 * 1000; // 默认 1 分钟
    this.totalSlots = options.totalSlots ?? 60; // 默认 60 个槽（覆盖 1 小时）
    this.tickInterval = options.tickInterval ?? 10 * 1000; // 默认 10 秒滴答一次

    this.slots = Array.from(
      { length: this.totalSlots },
      () => new Map<string, TimeWheelEntry<T>>(),
    );
    this.lastTickTime = Date.now();
  }

  /**
   * 启动时间轮
   *
   * 开始定期清理过期条目。
   */
  start(): void {
    if (this.tickTimer !== null) {
      return; // 已经启动
    }

    this.tickTimer = window.setInterval(() => {
      this.tick();
    }, this.tickInterval);

    logger.debug(
      `时间轮已启动，槽大小: ${this.slotDuration.toString()}ms, 总槽数: ${this.totalSlots.toString()}, 滴答间隔: ${this.tickInterval.toString()}ms`,
    );
  }

  /**
   * 添加条目
   *
   * @param key - 条目的唯一键
   * @param data - 要存储的数据
   * @param ttl - 过期时间（毫秒）
   */
  add(key: string, data: T, ttl: number): void {
    const now = Date.now();
    const expiresAt = now + ttl;

    // 删除旧条目（如果存在）
    this.remove(key);

    // 计算应该放入哪个槽
    const slotIndex = this.calculateSlotIndex(expiresAt);

    // 添加到对应槽
    const entry: TimeWheelEntry<T> = { key, data, expiresAt };
    const slot = this.slots[slotIndex];
    if (slot !== undefined) {
      slot.set(key, entry);
    }
    this.keyToSlot.set(key, slotIndex);
  }

  /**
   * 获取条目
   *
   * @param key - 条目的唯一键
   * @returns 存储的数据，如果不存在或已过期则返回 undefined
   */
  get(key: string): T | undefined {
    const slotIndex = this.keyToSlot.get(key);
    if (slotIndex === undefined) {
      return undefined;
    }

    const slot = this.slots[slotIndex];
    if (slot === undefined) {
      return undefined;
    }

    const entry = slot.get(key);

    if (entry === undefined) {
      return undefined;
    }

    // 检查是否过期
    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.remove(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * 检查条目是否存在且未过期
   *
   * @param key - 条目的唯一键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除条目
   *
   * @param key - 条目的唯一键
   * @returns 是否成功删除
   */
  remove(key: string): boolean {
    const slotIndex = this.keyToSlot.get(key);
    if (slotIndex === undefined) {
      return false;
    }

    const slot = this.slots[slotIndex];
    if (slot === undefined) {
      return false;
    }

    const deleted = slot.delete(key);
    this.keyToSlot.delete(key);

    return deleted;
  }

  /**
   * 清空所有条目
   */
  clear(): void {
    this.slots.forEach((slot) => {
      slot.clear();
    });
    this.keyToSlot.clear();
  }

  /**
   * 获取总条目数
   */
  get size(): number {
    return this.keyToSlot.size;
  }

  /**
   * 时钟滴答
   *
   * 清理当前槽中的过期条目，然后移动到下一个槽。
   */
  private tick(): void {
    const now = Date.now();

    // 计算应该推进多少个槽
    const elapsedTime = now - this.lastTickTime;
    const slotsToAdvance = Math.floor(elapsedTime / this.slotDuration);

    if (slotsToAdvance === 0) {
      return; // 时间还未到下一个槽
    }

    // 推进槽位
    for (let i = 0; i < Math.min(slotsToAdvance, this.totalSlots); i++) {
      this.currentSlotIndex = (this.currentSlotIndex + 1) % this.totalSlots;
      this.cleanupSlot(this.currentSlotIndex);
    }

    this.lastTickTime = now;
  }

  /**
   * 清理指定槽中的过期条目
   *
   * @param slotIndex - 槽索引
   */
  private cleanupSlot(slotIndex: number): void {
    const slot = this.slots[slotIndex];
    if (slot === undefined) {
      return;
    }

    const now = Date.now();
    const expiredKeys: string[] = [];

    // 收集过期的键
    for (const [key, entry] of slot.entries()) {
      if (now >= entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    // 删除过期条目
    for (const key of expiredKeys) {
      slot.delete(key);
      this.keyToSlot.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.debug(
        `时间轮清理了槽 ${slotIndex.toString()}，删除了 ${expiredKeys.length.toString()} 个过期条目`,
      );
    }
  }

  /**
   * 计算条目应该放入哪个槽
   *
   * @param expiresAt - 过期时间戳
   * @returns 槽索引
   */
  private calculateSlotIndex(expiresAt: number): number {
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // 计算相对于当前槽的偏移
    const slotsUntilExpiry = Math.floor(timeUntilExpiry / this.slotDuration);

    // 如果超过了时间轮的范围，放入最后一个槽
    const offset = Math.min(slotsUntilExpiry, this.totalSlots - 1);

    return (this.currentSlotIndex + offset) % this.totalSlots;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计信息对象
   */
  getStats(): {
    totalEntries: number;
    slotsUsed: number;
    averageEntriesPerSlot: number;
    currentSlot: number;
  } {
    const slotsUsed = this.slots.filter((slot) => slot.size > 0).length;

    return {
      totalEntries: this.size,
      slotsUsed,
      averageEntriesPerSlot: slotsUsed > 0 ? this.size / slotsUsed : 0,
      currentSlot: this.currentSlotIndex,
    };
  }
}

/**
 * 创建并启动一个时间轮
 *
 * @param options - 配置选项
 * @returns 时间轮实例
 */
export function createTimeWheel<T>(options?: {
  slotDuration?: number;
  totalSlots?: number;
  tickInterval?: number;
}): TimeWheel<T> {
  const wheel = new TimeWheel<T>(options);
  wheel.start();
  return wheel;
}
