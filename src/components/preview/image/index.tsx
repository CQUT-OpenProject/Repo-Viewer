import React, { useMemo, useEffect, useRef, useState } from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import FullScreenPreview from "@/components/file/FullScreenPreview";
import ImagePreviewContent from "./ImagePreviewContent";
import { useImagePreview } from "./hooks/useImagePreview";
import type { ImagePreviewProps, ImageToolbarProps } from "./types";

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  fileName,
  onClose,
  isFullScreen = false,
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
  const displayFileName =
    typeof fileName === "string" && fileName.trim().length > 0 ? fileName : "未知文件";
  const prevImageUrlRef = useRef(imageUrl);
  const [lastKnownAspectRatio, setLastKnownAspectRatio] = useState<number | null>(null);

  const {
    loading,
    error,
    rotation,
    fullScreenMode,
    scale,
    shouldLoad,
    imgRef,
    handleRotateLeft,
    handleRotateRight,
    toggleFullScreen,
    handleClosePreview,
    handleImageLoad,
    handleImageError,
    handleTransformed,
    setError,
    resetLoadingState,
    resetStateForCachedImage,
  } = useImagePreview({ isFullScreen, lazyLoad, onClose });

  useEffect(() => {
    if (prevImageUrlRef.current !== imageUrl) {
      const testImg = new Image();
      testImg.src = imageUrl;
      if (testImg.complete && testImg.naturalHeight !== 0) {
        resetStateForCachedImage();
      } else {
        resetLoadingState();
      }
      prevImageUrlRef.current = imageUrl;
    }
  }, [imageUrl, resetLoadingState, resetStateForCachedImage]);

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

  // zoomIn/Out/reset are overridden by TransformWrapper children in ImagePreviewContent
  const toolbarProps: ImageToolbarProps = {
    error,
    scale,
    isSmallScreen,
    fullScreenMode,
    zoomIn: () => undefined,
    zoomOut: () => undefined,
    resetTransform: () => undefined,
    handleRotateLeft,
    handleRotateRight,
    toggleFullScreen,
    handleClosePreview,
    closeButtonBorderRadius,
  };

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
    initialAspectRatio: lastKnownAspectRatio,
    onAspectRatioChange: (ratio: number) => {
      if (Number.isFinite(ratio) && ratio > 0) {
        setLastKnownAspectRatio(ratio);
      }
    },
  };

  if (fullScreenMode) {
    return (
      <FullScreenPreview
        onClose={handleClosePreview}
        backgroundColor={theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5"}
        disablePadding={true}
      >
        <ImagePreviewContent {...previewContentProps} />
      </FullScreenPreview>
    );
  }

  return <ImagePreviewContent {...previewContentProps} />;
};

export default ImagePreview;
