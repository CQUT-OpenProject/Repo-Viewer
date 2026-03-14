/**
 * 预览相关类型定义
 *
 * 包含文件预览状态和操作的类型定义。
 */

import type { GitHubContent } from "./index";

/**
 * 文件预览状态接口
 */
export interface PreviewState {
  // Markdown预览（所有 .md 文件）
  previewContent: string | null;
  previewingItem: GitHubContent | null;
  loadingPreview: boolean;
  previewType: "markdown" | "text" | null;

  // 图像预览
  imagePreviewUrl: string | null;
  previewingImageItem: GitHubContent | null;
  isImageFullscreen: boolean;
  loadingImagePreview: boolean;
  imageError: string | null;
}

/**
 * 预览操作联合类型
 */
export type PreviewAction =
  | { type: "RESET_PREVIEW" }
  // 文本/Markdown预览操作
  | { type: "SET_MD_PREVIEW"; content: string | null; item: GitHubContent | null }
  | { type: "SET_TEXT_PREVIEW"; content: string | null; item: GitHubContent | null }
  | { type: "SET_PREVIEW_LOADING"; loading: boolean }

  // 图像预览操作
  | { type: "SET_IMAGE_PREVIEW"; url: string | null; item: GitHubContent | null }
  | { type: "SET_IMAGE_LOADING"; loading: boolean }
  | { type: "SET_IMAGE_ERROR"; error: string | null }
  | { type: "SET_IMAGE_FULLSCREEN"; fullscreen: boolean };
