import { useEffect, useState } from "react";
import { alpha } from "@mui/material";
import type { Theme } from "@mui/material";
import type { SystemStyleObject } from "@mui/system";
import { fadeAnimation, fadeOutAnimation } from "@/theme/animations";

/**
 * 获取骨架屏样式
 *
 * 生成骨架屏的动画和颜色样式，使用当前主题颜色。
 *
 * @param theme - Material-UI主题对象
 * @returns 骨架屏样式对象
 */
export const getSkeletonStyles = (theme: Theme): SystemStyleObject<Theme> => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  "&::after": {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
  },
  animation: `$pulse 1.5s ease-in-out 0.5s infinite, ${fadeAnimation} 0.5s ease-in-out`,
  "@keyframes pulse": {
    "0%": {
      opacity: 1,
    },
    "50%": {
      opacity: 0.5,
    },
    "100%": {
      opacity: 1,
    },
  },
});

/**
 * 获取容器过渡动画样式
 *
 * 根据是否正在退出应用不同的动画效果。
 *
 * @param isExiting - 是否正在退出
 * @returns 过渡动画样式对象
 */
export const getContainerTransitionStyles = (isExiting: boolean): SystemStyleObject<Theme> => ({
  animation: isExiting
    ? `${fadeOutAnimation} 0.3s ease-in-out forwards`
    : `${fadeAnimation} 0.5s ease-in-out`,
  transition: "all 0.3s ease-in-out",
  visibility: isExiting ? "hidden" : "visible",
  transitionDelay: isExiting ? "0s" : "0.1s",
});

/**
 * 骨架屏可见性Hook
 *
 * 管理骨架屏的显示/隐藏状态和退出动画。
 *
 * @param visible - 是否可见
 * @param onExited - 退出完成后的回调函数
 * @returns 是否正在退出
 */
export const useSkeletonVisibility = (visible: boolean, onExited?: () => void): boolean => {
  const [isExiting, setIsExiting] = useState(!visible);
  const scheduleExitState = (next: boolean): void => {
    window.requestAnimationFrame(() => {
      setIsExiting(next);
    });
  };

  useEffect(() => {
    let timer: number | null = null;

    if (!visible && !isExiting) {
      scheduleExitState(true);
      timer = window.setTimeout(() => {
        onExited?.();
      }, 300);
    } else if (visible && isExiting) {
      scheduleExitState(false);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [visible, isExiting, onExited]);

  return isExiting;
};
