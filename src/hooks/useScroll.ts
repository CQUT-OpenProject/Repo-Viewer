import { useRef, useCallback, useState, useEffect } from "react";

/**
 * 滚动数据点接口
 */
interface ScrollDataPoint {
  offset: number;
  time: number;
}

/**
 * 滚动速度计算选项
 */
export interface ScrollSpeedOptions {
  /**
   * 采样点数量，用于计算平均速度
   * @default 5
   */
  maxSamples?: number;

  /**
   * 滚动停止检测延迟（毫秒）
   * @default 150
   */
  scrollEndDelay?: number;

  /**
   * 快速滚动阈值（像素/毫秒）
   * @default 0.3
   */
  fastScrollThreshold?: number;
}

/**
 * 优化的滚动处理Hook
 *
 * 提供高性能的滚动速度计算和状态管理。
 * 使用移动平均算法平滑速度计算，减少抖动。
 *
 * @param options - 滚动配置选项
 * @returns 滚动状态和处理函数
 *
 * @example
 * const { isScrolling, scrollSpeed, handleScroll } = useOptimizedScroll();
 *
 * <FixedSizeList
 *   onScroll={handleScroll}
 * />
 */
export function useOptimizedScroll(options: ScrollSpeedOptions = {}): {
  isScrolling: boolean;
  scrollSpeed: number;
  isFastScrolling: boolean;
  handleScroll: (scrollOffset: number) => void;
  reset: () => void;
} {
  const { maxSamples = 5, scrollEndDelay = 150, fastScrollThreshold = 0.3 } = options;
  const speedEpsilon = 0.001;

  // 滚动状态
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0);

  // 滚动数据缓存
  const scrollDataRef = useRef<{
    positions: ScrollDataPoint[];
    timer: NodeJS.Timeout | null;
    rafId: number | null;
    isScrolling: boolean;
    speed: number;
  }>({
    positions: [],
    timer: null,
    rafId: null,
    isScrolling: false,
    speed: 0,
  });

  const recordSample = useCallback(
    (offset: number): void => {
      const now = Date.now();
      const data = scrollDataRef.current;

      data.positions.push({ offset, time: now });

      if (data.positions.length > maxSamples) {
        data.positions.shift();
      }
    },
    [maxSamples],
  );

  /**
   * 计算滚动速度
   *
   * 使用移动平均算法，基于最近的 maxSamples 个数据点计算平均速度。
   *
   * @param offset - 当前滚动偏移量
   * @returns 标准化的滚动速度（像素/毫秒）
   */
  const calculateSpeed = useCallback((): number => {
    const data = scrollDataRef.current;

    // 需要至少2个样本才能计算速度
    if (data.positions.length < 2) {
      return 0;
    }

    // 计算平均速度
    const first = data.positions[0];
    const last = data.positions[data.positions.length - 1];

    if (first === undefined || last === undefined) {
      return 0;
    }

    const distance = Math.abs(last.offset - first.offset);
    const time = last.time - first.time;

    // 避免除以零
    return time > 0 ? distance / time : 0;
  }, []);

  /**
   * 处理滚动事件
   *
   * @param scrollOffset - 滚动偏移量
   */
  const handleScroll = useCallback(
    (scrollOffset: number): void => {
      const data = scrollDataRef.current;
      recordSample(scrollOffset);

      // 设置滚动状态
      if (!data.isScrolling) {
        data.isScrolling = true;
        setIsScrolling(true);
      }

      // rAF 合并状态更新，避免每次 scroll 事件触发 setState
      data.rafId ??= requestAnimationFrame(() => {
        data.rafId = null;
        const speed = calculateSpeed();
        if (Math.abs(speed - data.speed) >= speedEpsilon) {
          data.speed = speed;
          setScrollSpeed(speed);
        }
      });

      // 清除之前的定时器
      if (data.timer !== null) {
        clearTimeout(data.timer);
      }

      // 设置新的定时器，检测滚动停止
      data.timer = setTimeout(() => {
        data.isScrolling = false;
        if (data.speed !== 0) {
          data.speed = 0;
          setScrollSpeed(0);
        }
        setIsScrolling(false);
        // 清空样本数据
        data.positions = [];
      }, scrollEndDelay);
    },
    [calculateSpeed, recordSample, scrollEndDelay, speedEpsilon],
  );

  /**
   * 检查是否为快速滚动
   */
  const isFastScrolling = scrollSpeed > fastScrollThreshold;

  /**
   * 重置滚动状态
   */
  const reset = useCallback(() => {
    const data = scrollDataRef.current;
    setIsScrolling(false);
    setScrollSpeed(0);
    data.isScrolling = false;
    data.speed = 0;
    data.positions = [];

    if (data.timer !== null) {
      clearTimeout(data.timer);
      data.timer = null;
    }

    if (data.rafId !== null) {
      cancelAnimationFrame(data.rafId);
      data.rafId = null;
    }
  }, []);

  useEffect(() => {
    const data = scrollDataRef.current;
    return () => {
      if (data.timer !== null) {
        clearTimeout(data.timer);
      }
      if (data.rafId !== null) {
        cancelAnimationFrame(data.rafId);
      }
    };
  }, []);

  return {
    /** 是否正在滚动 */
    isScrolling,
    /** 当前滚动速度（像素/毫秒） */
    scrollSpeed,
    /** 是否为快速滚动 */
    isFastScrolling,
    /** 滚动事件处理函数 */
    handleScroll,
    /** 重置滚动状态 */
    reset,
  };
}
