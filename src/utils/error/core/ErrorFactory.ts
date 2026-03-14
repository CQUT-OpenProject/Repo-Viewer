import type {
  BaseError,
  APIError,
  GitHubError,
  ComponentError,
  ErrorContext,
} from "@/types/errors";
import { ErrorLevel, ErrorCategory } from "@/types/errors";

/**
 * 错误工厂类
 *
 * 负责创建各种类型的结构化错误对象。
 */
export class ErrorFactory {
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * 获取基础错误上下文
   */
  private getBaseContext(): ErrorContext {
    return {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    };
  }

  /**
   * 创建基础错误对象
   */
  public createBaseError(
    code: string,
    message: string,
    level: ErrorLevel,
    category: ErrorCategory,
    context?: Record<string, unknown>,
  ): BaseError {
    return {
      code,
      message,
      level,
      category,
      timestamp: Date.now(),
      context: { ...this.getBaseContext(), ...context },
      sessionId: this.sessionId,
    };
  }

  /**
   * 创建API错误
   *
   * @param message - 错误消息
   * @param statusCode - HTTP状态码
   * @param endpoint - API端点
   * @param method - HTTP方法
   * @param context - 额外的上下文信息
   * @returns API错误对象
   */
  public createAPIError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    context?: Record<string, unknown>,
  ): APIError {
    const baseError = this.createBaseError(
      `API_ERROR_${statusCode.toString()}`,
      message,
      this.getErrorLevelByStatusCode(statusCode),
      ErrorCategory.API,
      context,
    );

    return {
      ...baseError,
      category: ErrorCategory.API,
      statusCode,
      endpoint,
      method,
    };
  }

  /**
   * 创建GitHub特定错误
   *
   * @param message - 错误消息
   * @param statusCode - HTTP状态码
   * @param endpoint - API端点
   * @param method - HTTP方法
   * @param rateLimitInfo - Rate limit信息
   * @param context - 额外的上下文信息
   * @returns GitHub错误对象
   */
  public createGitHubError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    rateLimitInfo?: { remaining: number; reset: number },
    context?: Record<string, unknown>,
  ): GitHubError {
    const apiError = this.createAPIError(message, statusCode, endpoint, method, context);

    const rateLimitProps =
      rateLimitInfo !== undefined
        ? {
            rateLimitRemaining: rateLimitInfo.remaining,
            rateLimitReset: rateLimitInfo.reset,
          }
        : {};

    return {
      ...apiError,
      ...rateLimitProps,
      documentationUrl: "https://docs.github.com/en/rest",
    };
  }

  /**
   * 创建组件错误
   *
   * @param componentName - 组件名称
   * @param message - 错误消息
   * @param props - 组件属性
   * @param context - 额外的上下文信息
   * @returns 组件错误对象
   */
  public createComponentError(
    componentName: string,
    message: string,
    props?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): ComponentError {
    const baseError = this.createBaseError(
      "COMPONENT_ERROR",
      message,
      ErrorLevel.ERROR,
      ErrorCategory.COMPONENT,
      context,
    );

    return {
      ...baseError,
      category: ErrorCategory.COMPONENT,
      componentName,
      ...(props !== undefined ? { props } : {}),
    };
  }

  /**
   * 根据状态码确定错误级别
   */
  private getErrorLevelByStatusCode(statusCode: number): ErrorLevel {
    if (statusCode >= 500) {
      return ErrorLevel.CRITICAL;
    }
    if (statusCode >= 400) {
      return ErrorLevel.ERROR;
    }
    if (statusCode >= 300) {
      return ErrorLevel.WARNING;
    }
    return ErrorLevel.INFO;
  }
}
