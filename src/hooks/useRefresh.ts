import { useRef, useEffect } from "react";
import { useContentContext } from "@/contexts/unified";
import { removeLatexElements, restoreLatexElements } from "@/utils/rendering/latexOptimizer";
import { logger } from "@/utils/logging/logger";
import { useThemeTransitionFlag } from "@/hooks/useThemeTransition";

const MIN_ANIMATION_DURATION = 600;
const SAFETY_TIMEOUT = 3000;

/**
 * 页面刷新 Hook：刷新内容并控制 body 上的短暂动画 class
 */
export const useRefresh = (): (() => void) => {
  const { refresh, loading, currentPath } = useContentContext();
  const refreshTimerRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  const startTimeRef = useRef(0);
  const currentPathRef = useRef(currentPath);
  const refreshTargetPathRef = useRef<string | null>(null);
  const isThemeChangingRef = useThemeTransitionFlag();

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  const finishRefresh = (): void => {
    document.body.classList.remove("theme-transition", "refreshing");
    const expectedPath = refreshTargetPathRef.current;
    refreshTargetPathRef.current = null;

    if (expectedPath !== null && currentPathRef.current !== expectedPath) {
      logger.warn(
        `刷新结束时检测到目录已变更: 期望 ${expectedPath}，实际 ${currentPathRef.current}`,
      );
    }

    refreshingRef.current = false;
    window.setTimeout(() => {
      restoreLatexElements();
    }, 100);
  };

  useEffect(() => {
    if (!refreshingRef.current || loading) {
      return;
    }

    const remaining = Math.max(MIN_ANIMATION_DURATION - (Date.now() - startTimeRef.current), 0);
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(finishRefresh, remaining + 50);
  }, [loading]);

  return () => {
    if (isThemeChangingRef.current) {
      logger.info("主题切换中，跳过内容刷新");
      return;
    }

    if (
      document.body.classList.contains("theme-transition") ||
      document.body.classList.contains("refreshing") ||
      refreshingRef.current
    ) {
      return;
    }

    removeLatexElements();
    refreshTargetPathRef.current = currentPathRef.current;
    startTimeRef.current = Date.now();
    document.body.classList.add("theme-transition", "refreshing");
    refreshingRef.current = true;
    logger.info("刷新页面");
    refresh();

    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      if (refreshingRef.current) {
        logger.warn("刷新动画安全超时结束");
        finishRefresh();
      }
    }, SAFETY_TIMEOUT);
  };
};
