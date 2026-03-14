/**
 * @fileoverview 页面刷新 Hook
 *
 * 提供带动画效果的页面刷新功能，自动处理 LaTeX 元素的移除和恢复。
 * 在刷新期间会添加 CSS 动画类，并确保最小动画持续时间以提升用户体验。
 * 同时监听主题切换状态，避免在主题切换期间执行刷新。
 *
 * @module hooks/useRefresh
 */

import { useCallback, useRef, useEffect } from "react";
import { useContentContext } from "@/contexts/unified";
import { removeLatexElements, restoreLatexElements } from "@/utils/rendering/latexOptimizer";
import { logger } from "@/utils";
import { useThemeTransitionFlag } from "@/hooks/useThemeTransition";

/** 最小动画持续时间（毫秒） */
const MIN_ANIMATION_DURATION = 600;

/**
 * 页面刷新 Hook
 *
 * 提供带动画效果的页面刷新功能，自动处理 LaTeX 元素的移除和恢复。
 * 刷新期间会添加 theme-transition 和 refreshing 类到 body 元素。
 *
 * @returns 刷新函数，调用后触发内容刷新和动画效果
 */
export const useRefresh = (): (() => void) => {
  const { refresh, loading, currentPath } = useContentContext();
  const refreshTimerRef = useRef<number | null>(null);
  const refreshingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const currentPathRef = useRef(currentPath);
  const refreshTargetPathRef = useRef<string | null>(null);
  const isThemeChangingRef = useThemeTransitionFlag();

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (refreshingRef.current && !loading) {
      logger.info("内容加载完成，计算动画剩余时间");
      const elapsedTime = Date.now() - startTimeRef.current;
      const remainingTime = Math.max(MIN_ANIMATION_DURATION - elapsedTime, 0);
      logger.debug(
        `加载用时: ${elapsedTime.toString()}ms, 剩余动画时间: ${remainingTime.toString()}ms`,
      );

      const timeoutId = window.setTimeout(() => {
        document.body.classList.remove("theme-transition");
        document.body.classList.remove("refreshing");

        const expectedPath = refreshTargetPathRef.current;
        refreshTargetPathRef.current = null;

        if (expectedPath !== null && currentPathRef.current !== expectedPath) {
          logger.warn(
            `刷新结束时检测到目录已变更: 期望 ${expectedPath}，实际 ${currentPathRef.current}`,
          );
        }

        window.setTimeout(() => {
          refreshingRef.current = false;
          window.setTimeout(() => {
            restoreLatexElements();
          }, 100);
        }, 50);
      }, remainingTime + 50);

      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = timeoutId;
    }
  }, [loading]);

  return useCallback(() => {
    // 主题切换期间跳过刷新
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

    window.setTimeout(() => {
      startTimeRef.current = Date.now();
      document.body.classList.add("theme-transition");
      document.body.classList.add("refreshing");
      refreshingRef.current = true;
      logger.info("刷新页面");
      refresh();
      refreshTimerRef.current = window.setTimeout(() => {
        if (refreshingRef.current) {
          logger.warn("刷新动画安全超时结束");
          document.body.classList.remove("theme-transition");
          document.body.classList.remove("refreshing");
          window.setTimeout(() => {
            refreshingRef.current = false;
            window.setTimeout(() => {
              restoreLatexElements();
            }, 100);
          }, 50);
        }
      }, 3000);
    }, 10);
  }, [refresh, isThemeChangingRef]);
};
