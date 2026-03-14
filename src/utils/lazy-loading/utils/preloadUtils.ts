import { logger } from "../../logging/logger";

// 类型安全的 requestIdleCallback 检查
type RequestIdleCallbackFn = (callback: () => void) => number;

/**
 * 预加载预览组件
 *
 * 在浏览器空闲时预加载Markdown和图片预览组件。
 *
 * @returns void
 */
export const preloadPreviewComponents = (): void => {
  // 使用 requestIdleCallback 或 setTimeout 在空闲时间预加载
  const requestIdleCallbackFn = (
    window as unknown as { requestIdleCallback?: RequestIdleCallbackFn }
  ).requestIdleCallback;
  const idleCallback: RequestIdleCallbackFn =
    requestIdleCallbackFn ?? ((cb: () => void): number => setTimeout(cb, 1) as unknown as number);

  idleCallback(() => {
    // 预加载常用的预览组件
    import("../../../components/preview/markdown").catch((_unknown: unknown) => {
      logger.debug("预加载 Markdown 预览组件失败");
    });

    import("../../../components/preview/image").catch((_unknown: unknown) => {
      logger.debug("预加载图片预览组件失败");
    });

    import("../../../components/preview/text").catch((_unknown: unknown) => {
      logger.debug("预加载文本预览组件失败");
    });
  });
};

/**
 * 预加载指定的组件
 *
 * @param componentPaths - 要预加载的组件路径数组
 * @param options - 预加载选项
 * @param options.delay - 预加载延迟时间（毫秒）
 * @param options.useIdleCallback - 是否在空闲时间执行
 * @returns void
 */
export const preloadComponents = (
  componentPaths: string[],
  options: {
    /** 预加载延迟时间（毫秒） */
    delay?: number;
    /** 是否在空闲时间执行 */
    useIdleCallback?: boolean;
  } = {},
): void => {
  const { delay = 0, useIdleCallback = true } = options;

  const executePreload = (): void => {
    componentPaths.forEach((path) => {
      import(/* @vite-ignore */ path).catch((error: unknown) => {
        logger.debug(`预加载组件失败: ${path}`, error);
      });
    });
  };

  const requestIdleCallbackFn = (
    window as unknown as { requestIdleCallback?: RequestIdleCallbackFn }
  ).requestIdleCallback;

  if (delay > 0) {
    setTimeout(() => {
      if (useIdleCallback && typeof requestIdleCallbackFn !== "undefined") {
        requestIdleCallbackFn(executePreload);
      } else {
        executePreload();
      }
    }, delay);
  } else if (useIdleCallback && typeof requestIdleCallbackFn !== "undefined") {
    requestIdleCallbackFn(executePreload);
  } else {
    executePreload();
  }
};
