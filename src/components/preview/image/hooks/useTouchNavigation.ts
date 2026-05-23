import { useReducer, useEffect } from "react";
import type { TouchEvent } from "react";

interface TouchStart {
  x: number;
  y: number;
  time: number;
}

interface TouchState {
  touchStart: TouchStart | null;
  dragOffset: number;
  isDragging: boolean;
}

type TouchAction =
  | { type: "TOUCH_START"; touchStart: TouchStart }
  | { type: "DRAG"; offset: number }
  | { type: "RESET" };

function touchReducer(state: TouchState, action: TouchAction): TouchState {
  switch (action.type) {
    case "TOUCH_START":
      return { ...state, touchStart: action.touchStart };
    case "DRAG":
      return { touchStart: state.touchStart, dragOffset: action.offset, isDragging: true };
    case "RESET":
      return { touchStart: null, dragOffset: 0, isDragging: false };
  }
}

interface UseTouchNavigationOptions {
  isSmallScreen: boolean;
  currentScale: number;
  hasError: boolean;
  loading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  imageUrl: string;
  onPrevious?: () => void;
  onNext?: () => void;
}

interface UseTouchNavigationReturn {
  dragOffset: number;
  isDragging: boolean;
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: () => void;
}

/**
 * 触摸导航 Hook
 *
 * 处理移动端滑动切换图片的交互逻辑
 */
export function useTouchNavigation({
  isSmallScreen,
  currentScale,
  hasError,
  loading,
  hasPrevious,
  hasNext,
  imageUrl,
  onPrevious,
  onNext,
}: UseTouchNavigationOptions): UseTouchNavigationReturn {
  const [touchState, dispatch] = useReducer(touchReducer, {
    touchStart: null,
    dragOffset: 0,
    isDragging: false,
  });

  // 图片切换时重置移动端拖动状态
  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      dispatch({ type: "RESET" });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [imageUrl]);

  const handleTouchStart = (e: TouchEvent): void => {
    // 只在移动端、未放大、且未加载错误时启用
    if (!isSmallScreen || currentScale !== 1 || hasError || loading) {
      return;
    }

    const touch = e.touches[0];
    if (touch !== undefined) {
      dispatch({
        type: "TOUCH_START",
        touchStart: {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        },
      });
    }
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (
      touchState.touchStart === null ||
      !isSmallScreen ||
      currentScale !== 1 ||
      hasError ||
      loading
    ) {
      return;
    }

    const touch = e.touches[0];
    if (touch === undefined) {
      return;
    }

    const deltaX = touch.clientX - touchState.touchStart.x;
    const deltaY = touch.clientY - touchState.touchStart.y;

    // 判断是否为水平拖动（横向移动大于纵向移动）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      // 限制拖动范围
      let offset = deltaX;

      // 如果没有上一张，限制向右拖动
      if (!hasPrevious && deltaX > 0) {
        offset = deltaX * 0.3;
      }

      // 如果没有下一张，限制向左拖动
      if (!hasNext && deltaX < 0) {
        offset = deltaX * 0.3;
      }

      dispatch({ type: "DRAG", offset });
    }
  };

  const handleTouchEnd = (): void => {
    if (
      touchState.touchStart === null ||
      !isSmallScreen ||
      currentScale !== 1 ||
      hasError ||
      loading
    ) {
      dispatch({ type: "RESET" });
      return;
    }

    const threshold = 80; // 切换阈值（像素）
    const duration = Date.now() - touchState.touchStart.time;
    const velocity = Math.abs(touchState.dragOffset) / duration; // 速度（像素/毫秒）

    // 快速滑动或者超过阈值
    if (
      Math.abs(touchState.dragOffset) > threshold ||
      (velocity > 0.5 && Math.abs(touchState.dragOffset) > 30)
    ) {
      if (touchState.dragOffset > 0 && hasPrevious && onPrevious !== undefined) {
        // 向右拖动，上一张
        onPrevious();
      } else if (touchState.dragOffset < 0 && hasNext && onNext !== undefined) {
        // 向左拖动，下一张
        onNext();
      }
    }

    // 重置状态
    dispatch({ type: "RESET" });
  };

  return {
    dragOffset: touchState.dragOffset,
    isDragging: touchState.isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
