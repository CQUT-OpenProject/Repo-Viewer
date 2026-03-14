import type { AppError } from "@/types/errors";
import { ErrorLevel } from "@/types/errors";
import { createScopedLogger } from "../../logging/logger";

/**
 * 错误日志记录器类
 *
 * 负责将错误记录到控制台或其他日志系统。
 */
export class ErrorLogger {
  private readonly enableLogging: boolean;
  private readonly scopedLogger = createScopedLogger("ErrorManager");

  constructor(enableLogging = true) {
    this.enableLogging = enableLogging;
  }

  /**
   * 记录错误日志
   */
  public logError(error: AppError): void {
    if (!this.enableLogging) {
      return;
    }

    const logMessage = this.formatLogMessage(error);

    switch (error.level) {
      case ErrorLevel.CRITICAL:
        this.scopedLogger.error(logMessage, error);
        break;
      case ErrorLevel.ERROR:
        this.scopedLogger.error(logMessage, error);
        break;
      case ErrorLevel.WARNING:
        this.scopedLogger.warn(logMessage, error);
        break;
      case ErrorLevel.INFO:
        this.scopedLogger.info(logMessage, error);
        break;
      default:
        this.scopedLogger.info(logMessage, error);
        break;
    }
  }

  /**
   * 格式化日志消息
   */
  private formatLogMessage(error: AppError): string {
    return `[${error.category}] ${error.code}: ${error.message}`;
  }
}
