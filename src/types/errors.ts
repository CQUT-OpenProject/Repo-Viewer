/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  /** 信息 */
  INFO = "info",
  /** 警告 */
  WARNING = "warning",
  /** 错误 */
  ERROR = "error",
  /** 严重错误 */
  CRITICAL = "critical",
}

/**
 * 错误类别枚举
 */
export enum ErrorCategory {
  NETWORK = "network",
  API = "api",
  AUTH = "auth",
  VALIDATION = "validation",
  FILE_OPERATION = "file_operation",
  COMPONENT = "component",
  SYSTEM = "system",
}

/**
 * 基础错误接口
 */
export interface BaseError {
  code: string;
  message: string;
  level: ErrorLevel;
  category: ErrorCategory;
  timestamp: number;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * API错误接口
 */
export interface APIError extends BaseError {
  category: ErrorCategory.API;
  statusCode: number;
  endpoint: string;
  method: string;
  requestId?: string;
}

/**
 * 网络错误接口
 */
export interface NetworkError extends BaseError {
  category: ErrorCategory.NETWORK;
  url: string;
  timeout?: boolean;
  retryCount?: number;
}

/**
 * GitHub API特定错误接口
 */
export interface GitHubError extends APIError {
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  documentationUrl?: string;
}

/**
 * 文件操作错误接口
 */
export interface FileOperationError extends BaseError {
  category: ErrorCategory.FILE_OPERATION;
  fileName: string;
  fileSize?: number;
  operation: "read" | "write" | "download" | "compress" | "parse";
}

/**
 * 组件错误接口
 */
export interface ComponentError extends BaseError {
  category: ErrorCategory.COMPONENT;
  componentName: string;
  props?: Record<string, unknown>;
  errorBoundary?: string;
}

/**
 * 认证错误接口
 */
export interface AuthError extends BaseError {
  category: ErrorCategory.AUTH;
  tokenType?: "github_pat" | "session";
  tokenIndex?: number;
}

/**
 * 验证错误接口
 */
export interface ValidationError extends BaseError {
  category: ErrorCategory.VALIDATION;
  field: string;
  value: unknown;
  expectedType?: string;
}

/**
 * 系统错误接口
 */
export interface SystemError extends BaseError {
  category: ErrorCategory.SYSTEM;
  browserInfo?: string;
  platform?: string;
  memory?: number;
}

/**
 * 应用错误联合类型
 */
export type AppError =
  | APIError
  | NetworkError
  | GitHubError
  | FileOperationError
  | ComponentError
  | AuthError
  | ValidationError
  | SystemError;

// 类型守卫函数
export function isNetworkError(error: AppError): error is NetworkError {
  return error.category === ErrorCategory.NETWORK && "url" in error;
}

export function isGitHubError(error: AppError): error is GitHubError {
  return (
    error.category === ErrorCategory.API &&
    ("rateLimitRemaining" in error || "rateLimitReset" in error || "documentationUrl" in error)
  );
}

export function isFileOperationError(error: AppError): error is FileOperationError {
  return (
    error.category === ErrorCategory.FILE_OPERATION && "fileName" in error && "operation" in error
  );
}

// 错误上下文接口
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp?: number;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

// 错误处理配置
export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableErrorReporting: boolean;
  maxErrorsPerSession: number;
  retryAttempts: number;
  retryDelay: number;
}
