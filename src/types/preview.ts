/**
 * 预览相关类型定义
 */

import type { GitHubContent } from "./github";

/** 预览打开来源，用于区分深链回流与常规浏览 */
export type PreviewOpenTrigger = "click" | "search" | "deep-link" | "history" | "theme-reopen";

export interface PreviewState {
  previewContent: string | null;
  previewingItem: GitHubContent | null;
  loadingPreview: boolean;
  previewType: "markdown" | "text" | null;
  imagePreviewUrl: string | null;
  previewingImageItem: GitHubContent | null;
}

export type PreviewAction =
  | { type: "RESET_PREVIEW" }
  | { type: "SET_MD_PREVIEW"; content: string | null; item: GitHubContent | null }
  | { type: "SET_TEXT_PREVIEW"; content: string | null; item: GitHubContent | null }
  | { type: "SET_PREVIEW_LOADING"; loading: boolean }
  | { type: "SET_IMAGE_PREVIEW"; url: string | null; item: GitHubContent | null };
