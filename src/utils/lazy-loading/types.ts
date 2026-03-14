import type { ComponentType, ReactNode } from "react";

/**
 * 懒加载预览选项接口
 */
export interface LazyPreviewOptions<P = Record<string, unknown>> {
  /** 加载提示文本 */
  loadingText?: string;
  /** 自定义加载回退组件 */
  fallback?: ReactNode | ((props: P) => ReactNode);
  /** 自定义错误边界组件 */
  errorBoundary?: ComponentType<{ error: Error; retry: () => void; children: ReactNode }>;
}

/**
 * 懒加载错误边界组件属性接口
 */
export interface LazyLoadErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

/**
 * 懒加载错误边界组件状态接口
 */
export interface LazyLoadErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
