import type { ErrorManager } from "./core/ErrorManager";

// 错误节流控制
let errorThrottleTimer: NodeJS.Timeout | null = null;
let errorThrottled = false;
const ERROR_THROTTLE_MS = 1000; // 1秒内最多处理一次错误

let promiseRejectionThrottleTimer: NodeJS.Timeout | null = null;
let promiseRejectionThrottled = false;
const PROMISE_REJECTION_THROTTLE_MS = 1000; // 1秒内最多处理一次Promise拒绝

/**
 * 设置全局错误处理器
 *
 * 监听 window 错误和未处理的 Promise 拒绝。
 * 使用节流机制避免短时间内大量错误导致性能问题。
 *
 * @param errorManager - 错误管理器实例
 */
export function setupGlobalErrorHandlers(errorManager: typeof ErrorManager): void {
  setupWindowErrorHandler(errorManager);
  setupUnhandledRejectionHandler(errorManager);
}

/**
 * 设置 window 错误处理器
 */
function setupWindowErrorHandler(errorManager: typeof ErrorManager): void {
  window.addEventListener("error", (event) => {
    // 如果正在节流中，忽略此次错误
    if (errorThrottled) {
      return;
    }

    // 设置节流标志
    errorThrottled = true;

    // 处理错误
    const error = event.error instanceof Error ? event.error : new Error(String(event.error));
    errorManager.captureError(error, {
      component: "window",
      action: "global_error",
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    // 清除之前的定时器
    if (errorThrottleTimer !== null) {
      clearTimeout(errorThrottleTimer);
    }

    // 设置新的定时器，在指定时间后解除节流
    errorThrottleTimer = setTimeout(() => {
      errorThrottled = false;
      errorThrottleTimer = null;
    }, ERROR_THROTTLE_MS);
  });
}

/**
 * 设置未处理的 Promise 拒绝处理器
 */
function setupUnhandledRejectionHandler(errorManager: typeof ErrorManager): void {
  window.addEventListener("unhandledrejection", (event) => {
    // 如果正在节流中，忽略此次错误
    if (promiseRejectionThrottled) {
      return;
    }

    // 设置节流标志
    promiseRejectionThrottled = true;

    // 处理错误
    const errorMessage = typeof event.reason === "string" ? event.reason : String(event.reason);
    errorManager.captureError(new Error(errorMessage), {
      component: "window",
      action: "unhandled_promise_rejection",
    });

    // 清除之前的定时器
    if (promiseRejectionThrottleTimer !== null) {
      clearTimeout(promiseRejectionThrottleTimer);
    }

    // 设置新的定时器，在指定时间后解除节流
    promiseRejectionThrottleTimer = setTimeout(() => {
      promiseRejectionThrottled = false;
      promiseRejectionThrottleTimer = null;
    }, PROMISE_REJECTION_THROTTLE_MS);
  });
}

/**
 * 清理全局错误处理器
 *
 * 用于测试或需要重置错误处理器的场景。
 */
export function cleanupGlobalErrorHandlers(): void {
  if (errorThrottleTimer !== null) {
    clearTimeout(errorThrottleTimer);
    errorThrottleTimer = null;
  }

  if (promiseRejectionThrottleTimer !== null) {
    clearTimeout(promiseRejectionThrottleTimer);
    promiseRejectionThrottleTimer = null;
  }

  errorThrottled = false;
  promiseRejectionThrottled = false;
}
