import { useState, useEffect } from "react";
import type { TouchEvent } from "react";

interface TouchStart {
  x: number;
  y: number;
  time: number;
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
  const [touchStart, setTouchStart] = useState<TouchStart | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // 图片切换时重置移动端拖动状态
  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setTouchStart(null);
      setDragOffset(0);
      setIsDragging(false);
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
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      });
    }
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || hasError || loading) {
      return;
    }

    const touch = e.touches[0];
    if (touch === undefined) {
      return;
    }

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // 判断是否为水平拖动（横向移动大于纵向移动）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsDragging(true);

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

      setDragOffset(offset);
    }
  };

  const handleTouchEnd = (): void => {
    if (touchStart === null || !isSmallScreen || currentScale !== 1 || hasError || loading) {
      setTouchStart(null);
      setDragOffset(0);
      setIsDragging(false);
      return;
    }

    const threshold = 80; // 切换阈值（像素）
    const duration = Date.now() - touchStart.time;
    const velocity = Math.abs(dragOffset) / duration; // 速度（像素/毫秒）

    // 快速滑动或者超过阈值
    if (Math.abs(dragOffset) > threshold || (velocity > 0.5 && Math.abs(dragOffset) > 30)) {
      if (dragOffset > 0 && hasPrevious && onPrevious !== undefined) {
        // 向右拖动，上一张
        onPrevious();
      } else if (dragOffset < 0 && hasNext && onNext !== undefined) {
        // 向左拖动，下一张
        onNext();
      }
    }

    // 重置状态
    setTouchStart(null);
    setDragOffset(0);
    setIsDragging(false);
  };

  return {
    dragOffset,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
