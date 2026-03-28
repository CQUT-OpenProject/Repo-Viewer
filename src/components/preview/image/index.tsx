import React, { useMemo, useEffect, useRef, useState } from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import FullScreenPreview from "@/components/file/FullScreenPreview";
import ImageThumbnail from "./ImageThumbnail";
import ImagePreviewContent from "./ImagePreviewContent";
import { useImagePreview } from "./hooks/useImagePreview";
import type { ImagePreviewProps, ImageToolbarProps } from "./types";

const NOOP: () => void = () => undefined;

/**
 * 图片预览组件
 *
 * 提供图片预览功能，支持缩略图模式、全屏模式、懒加载等。
 * 包含缩放、旋转、拖拽等交互功能。
 */
const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  fileName,
  onClose,
  isFullScreen = false,
  thumbnailMode = false,
  thumbnailSize = { width: "200px", height: "150px" },
  lazyLoad = true,
  className,
  style,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const normalizedFileName =
    typeof fileName === "string" && fileName.trim().length > 0 ? fileName : undefined;
  const displayFileName = normalizedFileName ?? "未知文件";
  const prevImageUrlRef = useRef<string>(imageUrl);
  const [lastKnownAspectRatio, setLastKnownAspectRatio] = useState<number | null>(null);

  const {
    loading,
    error,
    rotation,
    fullScreenMode,
    showPreview,
    scale,
    shouldLoad,
    imgRef,
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
  } = useImagePreview({
    isFullScreen,
    thumbnailMode,
    lazyLoad,
    onClose,
  });

  // 监听图片URL变化，切换图片时重置加载状态
  useEffect(() => {
    if (prevImageUrlRef.current !== imageUrl) {
      // 创建临时 Image 对象检测缓存
      const testImg = new Image();
      testImg.src = imageUrl;

      // 同步检查图片是否已缓存
      if (testImg.complete && testImg.naturalHeight !== 0) {
        // 图片已缓存，不显示骨架屏，直接重置为已加载状态
        resetStateForCachedImage();
      } else {
        // 图片未缓存，显示骨架屏并开始加载
        resetLoadingState();
      }

      prevImageUrlRef.current = imageUrl;
    }
  }, [imageUrl, resetLoadingState, resetStateForCachedImage]);

  // 计算关闭按钮边框半径
  const closeButtonBorderRadius = useMemo(() => {
    const radius = theme.shape.borderRadius;
    if (typeof radius === "number") {
      return radius * 2;
    }
    const trimmedRadius = radius.trim();
    if (trimmedRadius.length > 0) {
      return `calc(${trimmedRadius} * 2)`;
    }
    return radius;
  }, [theme.shape.borderRadius]);

  // 工具栏Props
  const toolbarProps: ImageToolbarProps = {
    error,
    scale,
    isSmallScreen,
    fullScreenMode,
    zoomIn: NOOP,
    zoomOut: NOOP,
    resetTransform: NOOP,
    handleRotateLeft,
    handleRotateRight,
    toggleFullScreen,
    handleClosePreview,
    closeButtonBorderRadius,
  };

  const handleAspectRatioChange = (ratio: number) => {
    if (Number.isFinite(ratio) && ratio > 0) {
      setLastKnownAspectRatio(ratio);
    }
  };

  // 预览内容组件的Props
  const previewContentProps = {
    imageUrl,
    fileName: displayFileName,
    rotation,
    loading,
    error,
    shouldLoad,
    isSmallScreen,
    imgRef,
    className,
    style,
    toolbarProps: { ...toolbarProps, setError },
    onLoad: handleImageLoad,
    onError: handleImageError,
    onTransformed: handleTransformed,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    initialAspectRatio: lastKnownAspectRatio ?? null,
    onAspectRatioChange: handleAspectRatioChange,
  };

  // 缩略图模式
  if (thumbnailMode && !showPreview) {
    return (
      <ImageThumbnail
        imageUrl={imageUrl}
        fileName={displayFileName}
        thumbnailSize={thumbnailSize}
        aspectRatio={lastKnownAspectRatio ?? null}
        shouldLoad={shouldLoad}
        onOpenPreview={handleOpenPreview}
        onLoad={handleImageLoad}
        onError={handleImageError}
        imgRef={imgRef}
      />
    );
  }

  // 全屏模式
  if (fullScreenMode) {
    return (
      <FullScreenPreview
        onClose={handleClosePreview}
        backgroundColor={theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5"}
        disablePadding={true}
        data-oid=":0opztf"
      >
        <ImagePreviewContent {...previewContentProps} />
      </FullScreenPreview>
    );
  }

  // 直接预览模式
  return <ImagePreviewContent {...previewContentProps} />;
};

export default ImagePreview;
