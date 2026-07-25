export enum ErrorLevel {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  API = "api",
  COMPONENT = "component",
  SYSTEM = "system",
}

export interface BaseError {
  code: string;
  message: string;
  level: ErrorLevel;
  category: ErrorCategory;
  timestamp: number;
  context?: Record<string, unknown>;
  stack?: string;
  sessionId?: string;
}

export interface APIError extends BaseError {
  category: ErrorCategory.API;
  statusCode: number;
  endpoint: string;
  method: string;
}

export interface GitHubError extends APIError {
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  documentationUrl?: string;
}

export interface ComponentError extends BaseError {
  category: ErrorCategory.COMPONENT;
  componentName: string;
  props?: Record<string, unknown>;
}

export type AppError = BaseError | APIError | GitHubError | ComponentError;

export interface ErrorContext {
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp?: number;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
}
