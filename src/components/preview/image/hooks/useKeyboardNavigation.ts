import { useEffect } from "react";

interface UseKeyboardNavigationOptions {
  loading: boolean;
  hasError: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}

/**
 * 键盘导航 Hook
 *
 * 处理键盘左右方向键切换图片
 */
export function useKeyboardNavigation({
  loading,
  hasError,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: UseKeyboardNavigationOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // 如果正在加载或有错误，不响应键盘事件
      if (loading || hasError) {
        return;
      }

      if (e.key === "ArrowLeft" && hasPrevious && onPrevious !== undefined) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext && onNext !== undefined) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, hasError, hasPrevious, hasNext, onPrevious, onNext]);
}
