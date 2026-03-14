import type React from "react";

/**
 * 图片预览组件的Props接口定义
 */
export interface ImagePreviewProps {
  /**
   * 图片URL地址
   */
  imageUrl: string;

  /**
   * 图片文件名
   */
  fileName?: string;

  /**
   * 关闭预览的回调函数
   */
  onClose?: (() => void) | undefined;

  /**
   * 是否以全屏模式显示
   * @default false
   */
  isFullScreen?: boolean;

  /**
   * 是否默认以缩略图模式显示，点击后打开预览
   * @default false - 直接显示预览组件
   */
  thumbnailMode?: boolean;

  /**
   * 缩略图尺寸，仅在thumbnailMode=true时有效
   */
  thumbnailSize?: {
    width: string | number;
    height: string | number;
  };

  /**
   * 是否启用懒加载
   * @default true
   */
  lazyLoad?: boolean;

  /**
   * 自定义类名
   */
  className?: string | undefined;

  /**
   * 自定义样式
   */
  style?: React.CSSProperties | undefined;

  /**
   * 是否有上一张图片
   */
  hasPrevious?: boolean;

  /**
   * 是否有下一张图片
   */
  hasNext?: boolean;

  /**
   * 切换到上一张图片的回调
   */
  onPrevious?: (() => void) | undefined;

  /**
   * 切换到下一张图片的回调
   */
  onNext?: (() => void) | undefined;
}

/**
 * 图片工具栏组件的Props接口
 */
export interface ImageToolbarProps {
  /** 是否有错误状态 */
  error: boolean;
  /** 当前缩放比例 */
  scale: number;
  /** 是否为小屏幕 */
  isSmallScreen: boolean;
  /** 是否为全屏模式 */
  fullScreenMode: boolean;
  /** 缩放功能函数 */
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
  /** 旋转功能函数 */
  handleRotateLeft: () => void;
  handleRotateRight: () => void;
  /** 全屏切换功能 */
  toggleFullScreen: () => void;
  /** 关闭预览功能 */
  handleClosePreview: () => void;
  /** 关闭按钮的边框半径 */
  closeButtonBorderRadius: string | number;
  /** 设置错误状态 */
  setError?: React.Dispatch<React.SetStateAction<boolean>>;
  /** 工具栏呈现模式 */
  variant?: "inline" | "floating" | "full-width";
}

/**
 * 缩略图组件的Props接口
 */
export interface ImageThumbnailProps {
  /** 图片URL */
  imageUrl: string;
  /** 图片文件名 */
  fileName?: string | undefined;
  /** 缩略图尺寸 */
  thumbnailSize: {
    width: string | number;
    height: string | number;
  };
  /** 优先采用的宽高比 */
  aspectRatio?: number | null;
  /** 是否应该加载图片 */
  shouldLoad: boolean;
  /** 点击打开预览的回调 */
  onOpenPreview: () => void;
  /** 图片加载完成回调 */
  onLoad: () => void;
  /** 图片加载失败回调 */
  onError: () => void;
  /** 图片元素引用 */
  imgRef: React.RefObject<HTMLImageElement | null>;
}

/**
 * 图片预览内容组件的Props接口
 */
export interface ImagePreviewContentProps {
  /** 图片URL */
  imageUrl: string;
  /** 图片文件名 */
  fileName?: string | undefined;
  /** 当前旋转角度 */
  rotation: number;
  /** 是否加载中 */
  loading: boolean;
  /** 是否有错误 */
  error: boolean;
  /** 是否应该加载图片 */
  shouldLoad: boolean;
  /** 是否为小屏幕 */
  isSmallScreen: boolean;
  /** 图片元素引用 */
  imgRef: React.RefObject<HTMLImageElement | null>;
  /** 自定义类名 */
  className?: string | undefined;
  /** 自定义样式 */
  style?: React.CSSProperties | undefined;
  /** 工具栏组件Props */
  toolbarProps: ImageToolbarProps;
  /** 图片加载完成回调 */
  onLoad: () => void;
  /** 图片加载失败回调 */
  onError: () => void;
  /** 缩放状态变化回调 */
  onTransformed: (scale: number) => void;
  /** 是否有上一张图片 */
  hasPrevious?: boolean;
  /** 是否有下一张图片 */
  hasNext?: boolean;
  /** 切换到上一张图片的回调 */
  onPrevious?: (() => void) | undefined;
  /** 切换到下一张图片的回调 */
  onNext?: (() => void) | undefined;
  /** 初始宽高比（用于占位和渐进式过渡） */
  initialAspectRatio?: number | null;
  /** 宽高比变更时回调 */
  onAspectRatioChange?: (aspectRatio: number) => void;
}

/**
 * 自定义Hook返回的状态和方法
 */
export interface UseImagePreviewReturn {
  /** 加载状态 */
  loading: boolean;
  /** 错误状态 */
  error: boolean;
  /** 旋转角度 */
  rotation: number;
  /** 全屏模式状态 */
  fullScreenMode: boolean;
  /** 显示预览状态 */
  showPreview: boolean;
  /** 当前缩放比例 */
  scale: number;
  /** 是否应该加载图片 */
  shouldLoad: boolean;
  /** 图片元素引用 */
  imgRef: React.RefObject<HTMLImageElement | null>;
  /** 重置功能 */
  handleReset: (resetFunc: () => void) => void;
  /** 左旋转 */
  handleRotateLeft: () => void;
  /** 右旋转 */
  handleRotateRight: () => void;
  /** 切换全屏 */
  toggleFullScreen: () => void;
  /** 打开预览 */
  handleOpenPreview: () => void;
  /** 关闭预览 */
  handleClosePreview: () => void;
  /** 图片加载完成 */
  handleImageLoad: () => void;
  /** 图片加载失败 */
  handleImageError: () => void;
  /** 缩放状态变化 */
  handleTransformed: (scale: number) => void;
  /** 设置错误状态 */
  setError: React.Dispatch<React.SetStateAction<boolean>>;
  /** 重置加载状态（用于图片切换） */
  resetLoadingState: () => void;
  /** 重置状态但不触发加载（用于缓存图片） */
  resetStateForCachedImage: () => void;
}
