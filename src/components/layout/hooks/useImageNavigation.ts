import { useMemo } from "react";
import type { GitHubContent } from "@/types";

interface UseImageNavigationOptions {
  imageFiles: GitHubContent[];
  currentPreviewingImage: GitHubContent | null;
  onSelectFile: (file: GitHubContent) => Promise<void> | void;
}

interface UseImageNavigationReturn {
  currentImageIndex: number;
  hasPrevious: boolean;
  hasNext: boolean;
  handlePreviousImage: () => void;
  handleNextImage: () => void;
}

/**
 * 图片导航 Hook
 *
 * 处理图片预览的上一张/下一张导航逻辑
 */
export function useImageNavigation({
  imageFiles,
  currentPreviewingImage,
  onSelectFile,
}: UseImageNavigationOptions): UseImageNavigationReturn {
  // 获取当前预览图片的索引
  const currentImageIndex = useMemo(() => {
    if (currentPreviewingImage === null) {
      return -1;
    }
    return imageFiles.findIndex((item) => item.path === currentPreviewingImage.path);
  }, [imageFiles, currentPreviewingImage]);

  // 判断是否有上一张
  const hasPrevious = currentImageIndex > 0;

  // 判断是否有下一张
  const hasNext = currentImageIndex >= 0 && currentImageIndex < imageFiles.length - 1;

  // 处理切换到上一张图片
  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      const previousImage = imageFiles[currentImageIndex - 1];
      if (previousImage !== undefined) {
        void onSelectFile(previousImage);
      }
    }
  };

  // 处理切换到下一张图片
  const handleNextImage = () => {
    if (currentImageIndex >= 0 && currentImageIndex < imageFiles.length - 1) {
      const nextImage = imageFiles[currentImageIndex + 1];
      if (nextImage !== undefined) {
        void onSelectFile(nextImage);
      }
    }
  };

  return {
    currentImageIndex,
    hasPrevious,
    hasNext,
    handlePreviousImage,
    handleNextImage,
  };
}
