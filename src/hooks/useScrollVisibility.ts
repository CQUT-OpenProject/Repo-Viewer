import { useState, useEffect } from "react";
import { performance } from "@/utils";

/**
 * 自定义 Hook：监听滚动位置以控制元素可见性
 *
 * 使用组合优化策略提升性能：
 * 1. requestAnimationFrame - 与浏览器刷新率同步
 * 2. debounce - 防抖限制函数调用频率
 * 3. passive 事件监听 - 提升滚动性能
 *
 * @param threshold - 滚动阈值（像素），超过此值时返回 true
 * @returns 是否超过滚动阈值
 *
 * @example
 * ```tsx
 * const showElement = useScrollVisibility(100);
 * // showElement 在滚动超过 100px 时为 true
 * ```
 */
export function useScrollVisibility(threshold = 100): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;
    let lastScrollY = window.scrollY;

    const handleScroll = (): void => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const shouldShow = currentScrollY > threshold;
        const wasShowing = lastScrollY > threshold;

        if (shouldShow !== wasShowing) {
          setIsVisible(shouldShow);
        }

        lastScrollY = currentScrollY;
        rafId = null;
      });
    };

    // 使用 debounce 进一步优化，减少高频滚动时的函数调用
    // 16ms 约等于 60fps，与 RAF 配合使用效果最佳
    const debouncedHandleScroll = performance.debounce(handleScroll, 16);

    window.addEventListener("scroll", debouncedHandleScroll, { passive: true });

    // 初始调用检查状态
    handleScroll();

    return () => {
      window.removeEventListener("scroll", debouncedHandleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [threshold]);

  return isVisible;
}
