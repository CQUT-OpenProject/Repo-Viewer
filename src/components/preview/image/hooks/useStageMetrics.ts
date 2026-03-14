import { useMemo } from "react";

const DEFAULT_ASPECT_RATIO = 16 / 9;

interface ContainerSize {
  width: number;
  height: number;
}

interface UseStageMetricsOptions {
  containerSize: ContainerSize;
  dominantAspectRatio: number;
  isSmallScreen: boolean;
}

interface StageMetrics {
  width: number;
  height: number;
  availableWidth: number;
  availableHeight: number;
}

/**
 * 舞台尺寸计算 Hook
 *
 * 根据容器尺寸和宽高比计算图片显示区域的最佳尺寸
 */
export function useStageMetrics({
  containerSize,
  dominantAspectRatio,
  isSmallScreen,
}: UseStageMetricsOptions): StageMetrics | null {
  return useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return null;
    }

    const widthPadding = isSmallScreen ? 0.94 : 0.9;
    const heightPadding = isSmallScreen ? 0.85 : 0.8;

    const availableWidth = containerSize.width * widthPadding;
    const availableHeight = containerSize.height * heightPadding;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return null;
    }

    const aspectRatio = dominantAspectRatio > 0 ? dominantAspectRatio : DEFAULT_ASPECT_RATIO;
    const width = Math.min(availableWidth, availableHeight * aspectRatio);
    const height = width / aspectRatio;

    return {
      width,
      height,
      availableWidth,
      availableHeight,
    };
  }, [containerSize.height, containerSize.width, dominantAspectRatio, isSmallScreen]);
}
