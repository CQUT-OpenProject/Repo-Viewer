/**
 * 统一的请求管理器
 *
 * 提供请求取消、防抖和竞态条件处理。
 */

import { logger } from "@/utils";
import { createAbortError, isAbortError } from "@/utils/network/abort";

/**
 * 请求选项
 */
export interface RequestOptions {
  /**
   * 防抖延迟（毫秒）
   */
  debounce?: number;

  /**
   * 请求优先级
   */
  priority?: "high" | "medium" | "low";

  /**
   * 是否记录详细日志
   */
  verbose?: boolean;

  /**
   * 外部中止信号
   */
  signal?: AbortSignal;
}

/**
 * 请求管理器类
 *
 * 统一管理 HTTP 请求，提供以下功能：
 * - 自动取消重复的请求
 * - 防抖机制减少请求频率
 * - 请求优先级管理
 * - 统一的错误处理
 */
export class RequestManager {
  private pendingRequests = new Map<string, AbortController>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private async waitForDebounce(key: string, delay: number, signal: AbortSignal): Promise<void> {
    if (delay <= 0) {
      return;
    }

    if (signal.aborted) {
      throw createAbortError();
    }

    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let settled = false;

      const cleanup = (abortHandler: () => void): void => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        this.debounceTimers.delete(key);
        signal.removeEventListener("abort", abortHandler);
      };

      const finalize = (action: () => void, abortHandler: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup(abortHandler);
        action();
      };

      const onAbort = (): void => {
        finalize(() => {
          reject(createAbortError());
        }, onAbort);
      };

      timer = setTimeout(() => {
        finalize(resolve, onAbort);
      }, delay);

      signal.addEventListener("abort", onAbort, { once: true });
      this.debounceTimers.set(key, timer);

      if (signal.aborted) {
        onAbort();
      }
    });
  }

  /**
   * 发起请求
   *
   * 自动管理请求的生命周期，包括取消、防抖等。
   *
   * @param key - 请求的唯一标识符
   * @param fetcher - 请求函数，接收 AbortSignal 参数
   * @param options - 请求选项
   * @returns Promise，解析为请求结果
   *
   * @example
   * ```typescript
   * const contents = await requestManager.request(
   *   `contents-${path}`,
   *   (signal) => GitHub.Content.getContents(path, signal),
   *   { debounce: 300 }
   * );
   * ```
   */
  async request<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const { debounce, verbose = false, signal: externalSignal } = options;

    // 取消之前的同 key 请求
    this.cancel(key);

    // 创建新的 AbortController
    const controller = new AbortController();
    this.pendingRequests.set(key, controller);
    const abortFromExternal = (): void => {
      controller.abort();
    };

    if (externalSignal !== undefined) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", abortFromExternal, { once: true });
      }
    }

    try {
      // 如果设置了防抖，等待防抖延迟
      if (debounce !== undefined && debounce > 0) {
        if (verbose) {
          logger.debug(`请求防抖: ${key}, 延迟 ${debounce.toString()}ms`);
        }

        await this.waitForDebounce(key, debounce, controller.signal);
      }

      if (controller.signal.aborted) {
        throw createAbortError();
      }

      if (verbose) {
        logger.debug(`开始请求: ${key}`);
      }

      const result = await fetcher(controller.signal);

      // 请求成功，清理
      this.pendingRequests.delete(key);

      if (verbose) {
        logger.debug(`请求成功: ${key}`);
      }

      return result;
    } catch (error) {
      // 清理
      this.pendingRequests.delete(key);

      // 如果是取消错误，不记录日志
      if (isAbortError(error)) {
        if (verbose) {
          logger.debug(`请求已取消: ${key}`);
        }
        throw createAbortError();
      }

      // 其他错误正常记录
      logger.error(`请求失败: ${key}`, error);
      throw error;
    } finally {
      if (externalSignal !== undefined) {
        externalSignal.removeEventListener("abort", abortFromExternal);
      }
    }
  }

  /**
   * 取消指定的请求
   *
   * @param key - 请求的唯一标识符
   * @returns 是否成功取消（如果请求不存在则返回 false）
   */
  cancel(key: string): boolean {
    // 清除防抖定时器
    const timer = this.debounceTimers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }

    // 取消请求
    const controller = this.pendingRequests.get(key);
    if (controller !== undefined) {
      controller.abort();
      this.pendingRequests.delete(key);
      logger.debug(`已取消请求: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * 取消所有进行中的请求
   *
   * @returns 取消的请求数量
   */
  cancelAll(): number {
    // 清除所有防抖定时器
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // 取消所有请求
    const count = this.pendingRequests.size;
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();

    if (count > 0) {
      logger.debug(`已取消 ${count.toString()} 个请求`);
    }

    return count;
  }

  /**
   * 清理资源
   *
   * 取消所有请求并清理定时器。
   */
  cleanup(): void {
    this.cancelAll();
  }
}

/**
 * 全局请求管理器实例
 */
export const requestManager = new RequestManager();

/**
 * 在应用卸载时清理资源
 */
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    requestManager.cleanup();
  });
}
