import type {
  AppError,
  BaseError,
  APIError,
  GitHubError,
  ComponentError,
  ErrorContext,
  ErrorHandlerConfig,
} from "@/types/errors";
import { ErrorLevel, ErrorCategory } from "@/types/errors";
import { getDeveloperConfig } from "@/config";
import { logger } from "@/utils/logging/logger";

class ErrorManagerClass {
  private sessionId = `${Date.now().toString()}-${Math.random().toString(36).substring(2, 11)}`;
  private config: ErrorHandlerConfig = {
    enableConsoleLogging: (() => {
      const developerConfig = getDeveloperConfig();
      return developerConfig.mode || developerConfig.consoleLogging;
    })(),
  };

  private getBaseContext(): ErrorContext {
    return {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
    };
  }

  private createBaseError(
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

  private levelForStatus(statusCode: number): ErrorLevel {
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

  private logError(error: AppError): void {
    if (!this.config.enableConsoleLogging) {
      return;
    }
    const message = `[${error.category}] ${error.code}: ${error.message}`;
    switch (error.level) {
      case ErrorLevel.CRITICAL:
      case ErrorLevel.ERROR:
        logger.error(message, error);
        break;
      case ErrorLevel.WARNING:
        logger.warn(message, error);
        break;
      default:
        logger.info(message, error);
        break;
    }
  }

  private isAppError(error: unknown): error is AppError {
    return (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      "category" in error &&
      "level" in error
    );
  }

  public captureError(error: Error | AppError, context?: ErrorContext): AppError {
    const appError: AppError = this.isAppError(error)
      ? error
      : (this.createBaseError(
          error.name.length > 0 ? error.name : "UnknownError",
          error.message.length > 0 ? error.message : "未知错误",
          ErrorLevel.ERROR,
          ErrorCategory.SYSTEM,
          {
            ...context,
            stack: error.stack,
            originalError: error.constructor.name,
          },
        ) as AppError);

    this.logError(appError);
    return appError;
  }

  public createGitHubError(
    message: string,
    statusCode: number,
    endpoint: string,
    method: string,
    rateLimitInfo?: { remaining: number; reset: number },
    context?: Record<string, unknown>,
  ): GitHubError {
    const base = this.createBaseError(
      `API_ERROR_${statusCode.toString()}`,
      message,
      this.levelForStatus(statusCode),
      ErrorCategory.API,
      context,
    );
    const apiError: APIError = {
      ...base,
      category: ErrorCategory.API,
      statusCode,
      endpoint,
      method,
    };
    return {
      ...apiError,
      ...(rateLimitInfo !== undefined
        ? {
            rateLimitRemaining: rateLimitInfo.remaining,
            rateLimitReset: rateLimitInfo.reset,
          }
        : {}),
      documentationUrl: "https://docs.github.com/en/rest",
    };
  }

  public createComponentError(
    componentName: string,
    message: string,
    props?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): ComponentError {
    const base = this.createBaseError(
      "COMPONENT_ERROR",
      message,
      ErrorLevel.ERROR,
      ErrorCategory.COMPONENT,
      context,
    );
    return {
      ...base,
      category: ErrorCategory.COMPONENT,
      componentName,
      ...(props !== undefined ? { props } : {}),
    };
  }
}

export const ErrorManager = new ErrorManagerClass();
