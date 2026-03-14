import { useState, useCallback, useRef, useEffect } from "react";
import type { UseImagePreviewReturn, ImagePreviewProps } from "../types";

/**
 * 图片预览功能的自定义Hook
 * 管理图片预览的状态和交互逻辑
 */
export const useImagePreview = ({
  isFullScreen = false,
  thumbnailMode = false,
  lazyLoad = true,
  onClose,
}: Pick<
  ImagePreviewProps,
  "isFullScreen" | "thumbnailMode" | "lazyLoad" | "onClose"
>): UseImagePreviewReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [fullScreenMode, setFullScreenMode] = useState<boolean>(isFullScreen);
  const [showPreview, setShowPreview] = useState<boolean>(!thumbnailMode);
  const [scale, setScale] = useState<number>(1);
  const [shouldLoad, setShouldLoad] = useState<boolean>(() => {
    if (!lazyLoad) {
      return true;
    }
    return typeof IntersectionObserver === "undefined";
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 设置IntersectionObserver监听图片元素
  useEffect(() => {
    if (!lazyLoad) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    // 创建观察器实例
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        const isIntersecting = firstEntry?.isIntersecting ?? false;

        if (isIntersecting) {
          setShouldLoad(true);
          // 一旦图片开始加载，就停止观察
          const image = imgRef.current;

          if (image !== null) {
            observer.unobserve(image);
          }
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    observerRef.current = observer;

    // 开始观察
    const image = imgRef.current;

    if (image !== null) {
      observer.observe(image);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [lazyLoad]);

  const handleReset = useCallback((resetFunc: () => void) => {
    resetFunc();
    setRotation(0);
    setError(false);
    setLoading(true);
    setScale(1);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const toggleFullScreen = useCallback(() => {
    setFullScreenMode((prev) => !prev);
  }, []);

  const handleOpenPreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    if (thumbnailMode) {
      setShowPreview(false);
    }

    if (fullScreenMode) {
      setFullScreenMode(false);
    }

    if (typeof onClose === "function") {
      onClose();
    }
  }, [thumbnailMode, fullScreenMode, onClose]);

  const handleImageLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const handleTransformed = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  // 重置加载状态（用于图片切换）
  const resetLoadingState = useCallback(() => {
    // 总是先设置为加载中，具体的缓存检测由调用方处理
    setLoading(true);
    setError(false);
    setRotation(0);
    setScale(1);
  }, []);

  // 重置状态但不触发加载（用于缓存图片）
  const resetStateForCachedImage = useCallback(() => {
    setLoading(false);
    setError(false);
    setRotation(0);
    setScale(1);
  }, []);

  return {
    loading,
    error,
    rotation,
    fullScreenMode,
    showPreview,
    scale,
    shouldLoad,
    imgRef,
    handleReset,
    handleRotateLeft,
    handleRotateRight,
    toggleFullScreen,
    handleOpenPreview,
    handleClosePreview,
    handleImageLoad,
    handleImageError,
    handleTransformed,
    setError,
    resetLoadingState,
    resetStateForCachedImage,
  };
};
