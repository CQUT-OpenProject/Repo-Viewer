import type {
  AppError,
  ErrorContext,
  ErrorHandlerConfig,
  GitHubError,
  ComponentError,
} from "@/types/errors";
import { ErrorLevel, ErrorCategory } from "@/types/errors";
import { getDeveloperConfig } from "@/config";
import { ErrorFactory } from "./ErrorFactory";
import { ErrorLogger } from "./ErrorLogger";
import { ErrorHistory } from "./ErrorHistory";

/**
 * 错误管理器类
 *
 * 统一管理应用中的错误，提供错误创建、捕获和记录功能。
 */
class ErrorManagerClass {
  private sessionId: string = this.generateSessionId();
  private factory: ErrorFactory;
  private errorLogger: ErrorLogger;
  private history: ErrorHistory;

  private config: ErrorHandlerConfig = {
    enableConsoleLogging: (() => {
      const developerConfig = getDeveloperConfig();
      return developerConfig.mode || developerConfig.consoleLogging;
    })(),
  };

  constructor() {
    this.factory = new ErrorFactory(this.sessionId);
    this.errorLogger = new ErrorLogger(this.config.enableConsoleLogging);
    this.history = new ErrorHistory();
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `${Date.now().toString()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 捕获并处理错误
   *
   * 将普通Error转换为AppError，记录到历史。
   *
   * @param error - Error对象或AppError对象
   * @param context - 额外的错误上下文信息
   * @returns 处理后的AppError对象
   */
  public captureError(error: Error | AppError, context?: ErrorContext): AppError {
    let appError: AppError;

    // 如果已经是AppError，直接使用
    if (this.isAppError(error)) {
      appError = error;
    } else {
      // 转换普通Error为AppError
      appError = this.factory.createBaseError(
        error.name.length > 0 ? error.name : "UnknownError",
        error.message.length > 0 ? error.message : "未知错误",
        ErrorLevel.ERROR,
        ErrorCategory.SYSTEM,
        {
          ...context,
          stack: error.stack,
          originalError: error.constructor.name,
        },
      ) as AppError;
    }

    // 添加到错误历史
    this.history.addToHistory(appError);

    // 记录错误
    this.errorLogger.logError(appError);

    return appError;
  }

  /**
   * 创建GitHub特定错误
   */
  public createGitHubError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    rateLimitInfo?: { remaining: number; reset: number },
    context?: Record<string, unknown>,
  ): GitHubError {
    return this.factory.createGitHubError(
      message,
      statusCode,
      endpoint,
      method,
      rateLimitInfo,
      context,
    );
  }

  /**
   * 创建组件错误
   */
  public createComponentError(
    componentName: string,
    message: string,
    props?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): ComponentError {
    return this.factory.createComponentError(componentName, message, props, context);
  }

  // 检查是否为AppError
  private isAppError(error: unknown): error is AppError {
    return (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      "category" in error &&
      "level" in error
    );
  }
}

/**
 * 错误管理器单例实例
 *
 * 全局错误管理器，用于统一处理应用中的所有错误。
 */
export const ErrorManager = new ErrorManagerClass();
