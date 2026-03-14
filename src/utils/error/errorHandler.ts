/**
 * 全局错误处理器
 *
 * 提供统一的错误处理和恢复策略。
 */

import { ErrorManager } from "./index";
import { logger } from "../logging/logger";
import { ErrorCategory, type AppError } from "@/types/errors";

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否静默处理（不显示用户消息） */
  silent?: boolean;
  /** 是否提供重试选项 */
  retry?: boolean;
  /** 回退/恢复函数 */
  fallback?: () => void;
  /** 自定义用户消息 */
  userMessage?: string;
  /** 通知显示回调（用于显示 snackbar） */
  onNotify?: (
    message: string,
    options: { variant: "error" | "warning" | "info"; action?: unknown },
  ) => void;
}

/**
 * 获取用户友好的错误消息
 */
function getUserFriendlyMessage(appError: AppError): string {
  if (appError.category === ErrorCategory.NETWORK) {
    return "网络连接失败，请检查您的网络设置";
  }

  if (appError.category === ErrorCategory.API) {
    if ("statusCode" in appError) {
      const statusCode = appError.statusCode;
      if (statusCode === 404) {
        return "请求的资源不存在";
      }
      if (statusCode === 403) {
        return "访问被拒绝，请检查权限配置";
      }
      if (statusCode === 429) {
        return "API 请求频率超限，请稍后重试";
      }
      if (statusCode === 500) {
        return "服务器内部错误，请稍后重试";
      }
    }
    return "服务器响应异常，请稍后重试";
  }

  if (appError.category === ErrorCategory.FILE_OPERATION) {
    return "文件操作失败，请重试";
  }

  if (appError.category === ErrorCategory.AUTH) {
    return "身份验证失败，请检查 Token 配置";
  }

  if (appError.category === ErrorCategory.VALIDATION) {
    return "数据验证失败，请检查输入";
  }

  if (appError.category === ErrorCategory.COMPONENT) {
    return "组件渲染失败，请刷新页面";
  }

  return "操作失败，请稍后重试";
}

/**
 * 上报错误到错误追踪服务
 */
function reportError(error: AppError, context: string): void {
  try {
    // TODO: 集成 Sentry 或其他错误追踪服务
    logger.debug(`错误已标记待上报: [${context}] ${error.code}`);
  } catch (reportError) {
    logger.error("错误上报失败:", reportError);
  }
}

/**
 * 处理错误
 *
 * 统一的错误处理流程。
 */
export function handleError(
  error: unknown,
  context: string,
  options: ErrorHandlerOptions = {},
): void {
  const { silent = false, retry = false, fallback, userMessage, onNotify } = options;

  // 1. 标准化错误
  const appError = ErrorManager.captureError(
    error instanceof Error ? error : new Error(String(error)),
    { component: context },
  );

  // 2. 记录错误
  logger.error(`[${context}] 错误:`, appError);

  // 3. 显示用户消息
  if (!silent && onNotify !== undefined) {
    const message = userMessage ?? getUserFriendlyMessage(appError);

    onNotify(message, {
      variant: "error",
      action:
        retry && fallback !== undefined
          ? {
              label: "重试",
              onClick: fallback,
            }
          : undefined,
    });
  }

  // 4. 执行恢复策略
  if (fallback !== undefined && !retry) {
    try {
      fallback();
    } catch (fallbackError) {
      logger.error(`[${context}] 恢复策略执行失败:`, fallbackError);
    }
  }

  // 5. 上报错误（生产环境）
  if (import.meta.env.PROD) {
    reportError(appError, context);
  }
}
