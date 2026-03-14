import { logger } from "@/utils";
import { createTimeWheel } from "@/utils/data-structures/TimeWheel";
import type { TimeWheel } from "@/utils/data-structures/TimeWheel";

/**
 * 批处理请求接口
 */
interface BatchedRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timestamp: number;
  priority: "high" | "medium" | "low";
  retryCount: number;
}

/**
 * 请求指纹数据
 */
interface FingerprintData {
  result: unknown;
  hitCount: number;
}

/**
 * 重试选项
 */
interface RetryOptions {
  maxRetries: number;
  backoff: (attempt: number) => number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
  silent?: boolean;
}

/**
 * 请求批处理器类
 *
 * 管理和优化HTTP请求，提供请求合并、去重、优先级排序和重试机制。
 * 自动批处理重复请求，减少网络开销并提升性能。
 */
export class RequestBatcher {
  private readonly batchedRequests = new Map<string, BatchedRequest[]>();

  // 进行中的请求
  private readonly pendingRequests = new Map<string, Promise<unknown>>();

  // 请求指纹缓存（使用时间轮管理过期）
  private readonly fingerprintWheel: TimeWheel<FingerprintData>;

  private batchTimeout: number | null = null;
  private readonly batchDelay = 20; // 批处理延迟毫秒
  private readonly maxRetries = 3; // 最大重试次数
  private readonly fingerprintTTL = 5 * 60 * 1000; // 指纹缓存5分钟

  constructor() {
    // 使用时间轮管理指纹缓存
    // 每个槽覆盖 1 分钟，共 10 个槽（覆盖 10 分钟，超过 TTL）
    this.fingerprintWheel = createTimeWheel<FingerprintData>({
      slotDuration: 60 * 1000, // 1 分钟
      totalSlots: 10, // 10 个槽
      tickInterval: 30 * 1000, // 每 30 秒清理一次
    });

    logger.debug("RequestBatcher 已启动，使用时间轮管理指纹缓存");
  }

  // 生成请求指纹（用于去重）
  private generateFingerprint(
    key: string,
    method = "GET",
    headers?: Record<string, string>,
  ): string {
    const headerStr = headers !== undefined ? JSON.stringify(headers) : "";
    return `${method}:${key}:${headerStr}`;
  }

  /**
   * 重试选项
   */
  private withRetry = async <T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> => {
    const { maxRetries, backoff, shouldRetry = () => true, onRetry, silent = false } = options;

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) {
          logger.debug(`操作在第 ${(attempt + 1).toString()} 次尝试后成功`);
        }
        return result;
      } catch (error: unknown) {
        lastError = error;

        if (attempt < maxRetries && shouldRetry(error)) {
          const delay = backoff(attempt);

          if (onRetry !== undefined) {
            onRetry(attempt, error);
          }

          if (!silent) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.debug(
              `重试操作 (尝试 ${(attempt + 1).toString()}/${(maxRetries + 1).toString()})，延迟 ${delay.toString()}ms: ${errorMessage}`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    throw lastError;
  };

  /**
   * 将请求加入批处理队列
   *
   * 支持请求去重、优先级管理和智能合并相同请求。
   *
   * @param key - 请求的唯一标识符（通常是URL）
   * @param executeRequest - 执行实际请求的函数
   * @param options - 可选配置项
   * @param options.priority - 请求优先级，默认为'medium'
   * @param options.method - HTTP方法，默认为'GET'
   * @param options.headers - 请求头
   * @param options.skipDeduplication - 是否跳过去重检查
   * @returns Promise，解析为请求结果
   */
  public enqueue<T>(
    key: string,
    executeRequest: () => Promise<T>,
    options: {
      priority?: "high" | "medium" | "low";
      method?: string;
      headers?: Record<string, string>;
      skipDeduplication?: boolean;
    } = {},
  ): Promise<T> {
    const {
      priority = "medium",
      method = "GET",
      headers = {},
      skipDeduplication = false,
    } = options;

    // 检查是否有重复请求正在进行
    if (this.pendingRequests.has(key)) {
      logger.debug(`请求合并: ${key}`);
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // 生成请求指纹并检查缓存，避免不必要的指纹生成
    const fingerprint = this.generateFingerprint(key, method, headers);

    if (!skipDeduplication) {
      const cachedData = this.fingerprintWheel.get(fingerprint);
      if (cachedData !== undefined) {
        // 增加命中次数
        cachedData.hitCount++;
        logger.debug(`请求去重命中: ${key}，命中次数: ${cachedData.hitCount.toString()}`);
        return Promise.resolve(cachedData.result as T);
      }
    }

    return new Promise<T>((resolve, reject) => {
      // 如果还没有这个键的请求队列，创建它
      if (!this.batchedRequests.has(key)) {
        this.batchedRequests.set(key, []);

        // 设置超时以批量处理请求
        this.batchTimeout ??= window.setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }

      // 添加到队列
      const queue = this.batchedRequests.get(key);
      if (queue === undefined) {
        reject(new Error(`队列不存在: ${key}`));
        return;
      }
      const isFirstRequest = queue.length === 0;

      queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
        priority,
        retryCount: 0,
      });

      // 如果是队列中的第一个请求，执行它
      if (isFirstRequest) {
        void this.executeWithRetry(key, executeRequest, fingerprint, skipDeduplication);
      }
    });
  }

  // 带重试机制的请求执行
  private async executeWithRetry<T>(
    key: string,
    executeRequest: () => Promise<T>,
    fingerprint: string,
    skipDeduplication: boolean,
  ): Promise<void> {
    const requestPromise = this.performRequest(key, executeRequest, fingerprint, skipDeduplication);

    // 添加到进行中的请求
    this.pendingRequests.set(key, requestPromise);

    try {
      await requestPromise;
    } finally {
      // 清理进行中的请求记录
      this.pendingRequests.delete(key);
    }
  }

  // 执行请求
  private async performRequest<T>(
    key: string,
    executeRequest: () => Promise<T>,
    fingerprint: string,
    skipDeduplication: boolean,
  ): Promise<void> {
    const queue = this.batchedRequests.get(key) ?? [];

    // 按优先级排序
    queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // 配置重试选项
    const retryOptions: RetryOptions = {
      maxRetries: this.maxRetries,
      backoff: (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000), // 指数退避，最大5秒
      onRetry: (attempt, error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(
          `请求失败 (尝试 ${(attempt + 2).toString()}/${(this.maxRetries + 1).toString()}): ${key}`,
          errorMessage,
        );
      },
    };

    try {
      // 使用通用重试逻辑执行请求
      const result = await this.withRetry(executeRequest, retryOptions);

      // 缓存成功响应的结果
      if (!skipDeduplication) {
        this.fingerprintWheel.add(
          fingerprint,
          {
            result,
            hitCount: 1,
          },
          this.fingerprintTTL,
        );
      }

      // 所有批处理请求都收到相同的结果
      queue.forEach((request) => {
        request.resolve(result);
      });
      this.batchedRequests.delete(key);
    } catch (lastError: unknown) {
      // 所有重试都失败了
      logger.error(`请求最终失败: ${key}`, lastError);
      queue.forEach((request) => {
        request.retryCount++;
        request.reject(lastError);
      });
      this.batchedRequests.delete(key);
    }
  }

  // 处理批处理队列
  private processBatch(): void {
    this.batchTimeout = null;

    // 已经在enqueue中处理了所有队列
  }

  /**
   * 获取批处理器统计信息
   *
   * @returns 包含待处理请求数、批处理请求数、缓存大小和时间轮统计的对象
   */
  public getStats(): {
    pendingRequests: number;
    batchedRequests: number;
    fingerprintCache: number;
    timeWheelStats: {
      totalEntries: number;
      slotsUsed: number;
      averageEntriesPerSlot: number;
      currentSlot: number;
    };
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      batchedRequests: this.batchedRequests.size,
      fingerprintCache: this.fingerprintWheel.size,
      timeWheelStats: this.fingerprintWheel.getStats(),
    };
  }

  /**
   * 清除所有缓存
   *
   * 清除请求指纹缓存，强制下次请求重新获取数据。
   *
   * @returns void
   */
  public clearCache(): void {
    this.fingerprintWheel.clear();
    logger.debug("已清除请求指纹缓存");
  }
}
