import type { AppError } from "@/types/errors";

/**
 * 错误历史管理类
 *
 * 负责维护错误历史记录和统计信息。
 */
export class ErrorHistory {
  private errorHistory: AppError[] = [];
  private readonly maxHistorySize: number;
  private readonly maxAge: number; // 毫秒

  constructor(maxHistorySize = 100, maxAge = 3600000) {
    this.maxHistorySize = maxHistorySize;
    this.maxAge = maxAge; // 默认1小时
  }

  /**
   * 添加到错误历史
   *
   * 使用双重清理策略：按时间和按数量。
   * - 清理超过指定时间的旧错误
   * - 限制历史记录数量
   */
  public addToHistory(error: AppError): void {
    // 清理超时的旧错误
    this.cleanupOldErrors();

    // 添加新错误到历史记录开头
    this.errorHistory.unshift(error);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 清理超时的旧错误
   */
  private cleanupOldErrors(): void {
    const now = Date.now();
    this.errorHistory = this.errorHistory.filter((e) => now - e.timestamp < this.maxAge);
  }
}
