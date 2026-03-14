import { useState, useCallback } from "react";
import type { MouseEvent, RefObject } from "react";

interface UseDesktopNavigationOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  isSmallScreen: boolean;
  hasError: boolean;
  loading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
}

interface UseDesktopNavigationReturn {
  activeNavSide: "left" | "right" | null;
  handleContainerMouseMove: (e: MouseEvent<HTMLDivElement>) => void;
  handleContainerMouseLeave: () => void;
}

/**
 * 桌面端导航 Hook
 *
 * 处理桌面端鼠标悬停导航按钮显示逻辑
 */
export function useDesktopNavigation({
  containerRef,
  isSmallScreen,
  hasError,
  loading,
  hasPrevious,
  hasNext,
}: UseDesktopNavigationOptions): UseDesktopNavigationReturn {
  const [activeNavSide, setActiveNavSide] = useState<"left" | "right" | null>(null);

  const handleContainerMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>): void => {
      if (isSmallScreen || hasError || loading) {
        setActiveNavSide(null);
        return;
      }

      const container = containerRef.current;
      if (container === null) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const threshold = 150; // 导航区域宽度

      // 左侧区域（有上一张时）
      if (hasPrevious && x < threshold) {
        setActiveNavSide("left");
      }
      // 右侧区域（有下一张时）
      else if (hasNext && x > width - threshold) {
        setActiveNavSide("right");
      }
      // 中间区域
      else {
        setActiveNavSide(null);
      }
    },
    [isSmallScreen, hasError, loading, hasPrevious, hasNext, containerRef],
  );

  const handleContainerMouseLeave = useCallback((): void => {
    setActiveNavSide(null);
  }, []);

  return {
    activeNavSide,
    handleContainerMouseMove,
    handleContainerMouseLeave,
  };
}
