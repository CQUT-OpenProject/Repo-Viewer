/**
 * @fileoverview 主题过渡动画 Hook
 *
 * 提供主题切换状态的监听功能，用于在主题切换期间暂停其他操作，
 * 避免动画冲突。通过监听自定义事件 theme:changing 和 theme:changed 来实现。
 *
 * @module hooks/useThemeTransition
 */

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * 主题切换状态 Hook
 *
 * 监听主题切换事件，返回可读的状态引用。
 * 主题切换期间 isThemeChangingRef.current 为 true，可用于暂停其他动画或操作。
 *
 * @returns 主题切换状态引用，current 为 true 表示主题正在切换
 */
export const useThemeTransitionFlag = (): RefObject<boolean> => {
  const isThemeChangingRef = useRef(false);

  useEffect(() => {
    const handleThemeChanging = (): void => {
      isThemeChangingRef.current = true;
    };

    const handleThemeChanged = (): void => {
      isThemeChangingRef.current = false;
    };

    window.addEventListener("theme:changing", handleThemeChanging);
    window.addEventListener("theme:changed", handleThemeChanged);

    return () => {
      window.removeEventListener("theme:changing", handleThemeChanging);
      window.removeEventListener("theme:changed", handleThemeChanged);
    };
  }, []);

  return isThemeChangingRef;
};
