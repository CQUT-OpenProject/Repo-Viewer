import React, { Suspense, lazy } from "react";
import type { ComponentType, ReactNode } from "react";
import { DefaultLoadingFallback } from "../components/DefaultLoadingFallback";
import { LazyLoadErrorBoundary } from "../components/LazyLoadErrorBoundary";
import type { LazyPreviewOptions } from "../types";

/**
 * 创建懒加载预览组件
 *
 * 封装React.lazy，添加加载状态和错误边界支持。
 *
 * @template P - 组件属性类型
 * @param importFn - 动态导入函数
 * @param options - 懒加载选项
 * @returns 懒加载包装后的组件
 */
export function createLazyPreviewComponent<P = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyPreviewOptions<P> = {},
): React.FC<P> {
  const LazyComponent = lazy(importFn);

  const WrappedComponent: React.FC<P> = (props) => {
    const resolveFallback = (): ReactNode => {
      if (typeof options.fallback === "function") {
        return options.fallback(props);
      }

      if (options.fallback !== undefined) {
        return options.fallback;
      }

      return (
        <DefaultLoadingFallback
          {...(typeof options.loadingText === "string" && options.loadingText.length > 0
            ? { loadingText: options.loadingText }
            : {})}
        />
      );
    };

    const fallback = resolveFallback();

    return (
      <LazyLoadErrorBoundary>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as P & Record<string, unknown>)} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };

  const matchResult = /["'](.*?)[""]/u.exec(importFn.toString());
  const componentName = matchResult?.[1] ?? "LazyPreviewComponent";
  WrappedComponent.displayName = `Lazy(${componentName})`;

  return WrappedComponent;
}
