import type React from "react";

export interface ImagePreviewProps {
  imageUrl: string;
  fileName?: string;
  onClose?: (() => void) | undefined;
  isFullScreen?: boolean;
  lazyLoad?: boolean;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}

export interface ImageToolbarProps {
  error: boolean;
  scale: number;
  isSmallScreen: boolean;
  fullScreenMode: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
  handleRotateLeft: () => void;
  handleRotateRight: () => void;
  toggleFullScreen: () => void;
  handleClosePreview: () => void;
  setError?: React.Dispatch<React.SetStateAction<boolean>>;
  variant?: "inline" | "floating" | "full-width";
}

export interface ImagePreviewContentProps {
  imageUrl: string;
  fileName?: string | undefined;
  rotation: number;
  loading: boolean;
  error: boolean;
  shouldLoad: boolean;
  isSmallScreen: boolean;
  imgRef: React.RefObject<HTMLImageElement | null>;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  toolbarProps: ImageToolbarProps;
  onLoad: () => void;
  onError: () => void;
  onTransformed: (scale: number) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  initialAspectRatio?: number | null;
  onAspectRatioChange?: (aspectRatio: number) => void;
}

export interface UseImagePreviewReturn {
  loading: boolean;
  error: boolean;
  rotation: number;
  fullScreenMode: boolean;
  scale: number;
  shouldLoad: boolean;
  imgRef: React.RefObject<HTMLImageElement | null>;
  handleRotateLeft: () => void;
  handleRotateRight: () => void;
  toggleFullScreen: () => void;
  handleClosePreview: () => void;
  handleImageLoad: () => void;
  handleImageError: () => void;
  handleTransformed: (scale: number) => void;
  setError: React.Dispatch<React.SetStateAction<boolean>>;
  resetLoadingState: () => void;
  resetStateForCachedImage: () => void;
}
