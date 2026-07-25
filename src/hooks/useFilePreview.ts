/**
 * 文件预览 Hook：Markdown / 文本 / 图片 / PDF。
 */

import React, { useReducer, useRef, useEffect } from "react";
import { useTheme } from "@mui/material";
import type { PreviewState, PreviewAction, GitHubContent } from "@/types";
import { GitHub } from "@/services/github";
import { logger } from "@/utils/logging/logger";
import { openPDFPreview } from "@/utils/pdf/pdfPreviewHelper";
import { isImageFile, isMarkdownFile, isPdfFile, isTextFile } from "@/utils/files/fileHelpers";
import { isAbortError } from "@/utils/network/abort";
import {
  getPreviewFromUrl,
  updateUrlWithHistory,
  hasPreviewParam,
} from "@/utils/routing/urlManager";
import { useI18n } from "@/contexts/I18nContext";
import { isTokenMode } from "@/config";

const initialPreviewState: PreviewState = {
  previewContent: null,
  previewingItem: null,
  loadingPreview: false,
  previewType: null,
  imagePreviewUrl: null,
  previewingImageItem: null,
};

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case "RESET_PREVIEW":
      return initialPreviewState;
    case "SET_MD_PREVIEW":
      return {
        ...state,
        previewContent: action.content,
        previewingItem: action.item,
        previewType: "markdown",
      };
    case "SET_TEXT_PREVIEW":
      return {
        ...state,
        previewContent: action.content,
        previewingItem: action.item,
        previewType: "text",
      };
    case "SET_PREVIEW_LOADING":
      return { ...state, loadingPreview: action.loading };
    case "SET_IMAGE_PREVIEW":
      return {
        ...state,
        imagePreviewUrl: action.url,
        previewingImageItem: action.item,
      };
    default:
      return state;
  }
}

export const useFilePreview = (
  onError: (message: string) => void,
  findFileItemByPath?: (path: string) => GitHubContent | undefined,
): {
  previewState: PreviewState;
  selectFile: (item: GitHubContent) => Promise<void>;
  closePreview: () => void;
} => {
  const [previewState, dispatch] = useReducer(previewReducer, initialPreviewState);
  const muiTheme = useTheme();
  const { t } = useI18n();
  const currentPreviewItemRef = useRef<GitHubContent | null>(null);
  const hasActivePreviewRef = useRef(false);
  const isHandlingNavigationRef = useRef(false);
  const loadingPreviewPathRef = useRef<string | null>(null);
  const previewRequestControllerRef = useRef<AbortController | null>(null);
  const previewRequestIdRef = useRef(0);

  const cancelActivePreviewRequest = React.useCallback(() => {
    if (previewRequestControllerRef.current !== null) {
      previewRequestControllerRef.current.abort();
      previewRequestControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    hasActivePreviewRef.current =
      previewState.previewingItem !== null || previewState.previewingImageItem !== null;
  }, [previewState.previewingItem, previewState.previewingImageItem]);

  useEffect(() => {
    return () => {
      cancelActivePreviewRequest();
    };
  }, [cancelActivePreviewRequest]);

  const loadTextLikeContent = React.useCallback(
    async (item: GitHubContent, targetPath: string, kind: "markdown" | "text"): Promise<void> => {
      updateUrlWithHistory(item.path.split("/").slice(0, -1).join("/"), item.path);
      dispatch({ type: "SET_PREVIEW_LOADING", loading: true });
      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      const abortController = new AbortController();
      previewRequestControllerRef.current = abortController;

      try {
        if (item.download_url === null || item.download_url === "") {
          throw new Error("missing download_url");
        }
        const content = await GitHub.Content.getFileContent(
          item.download_url,
          abortController.signal,
        );
        if (currentPreviewItemRef.current?.path !== targetPath) {
          return;
        }
        dispatch({
          type: kind === "markdown" ? "SET_MD_PREVIEW" : "SET_TEXT_PREVIEW",
          content,
          item,
        });
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }
        const errorMessage = error instanceof Error ? error.message : t("error.unknown");
        onError(
          kind === "markdown"
            ? t("error.preview.markdownLoadFailed", { message: errorMessage })
            : t("error.preview.textLoadFailed", { message: errorMessage }),
        );
      } finally {
        if (
          previewRequestIdRef.current === requestId &&
          previewRequestControllerRef.current === abortController
        ) {
          previewRequestControllerRef.current = null;
          dispatch({ type: "SET_PREVIEW_LOADING", loading: false });
        }
      }
    },
    [onError, t],
  );

  const selectFile = React.useCallback(
    async (item: GitHubContent) => {
      if (item.download_url === null || item.download_url === "") {
        onError(t("error.preview.downloadLinkUnavailable"));
        return;
      }

      const targetPath = item.path;
      if (loadingPreviewPathRef.current === targetPath) {
        return;
      }
      if (hasActivePreviewRef.current && currentPreviewItemRef.current?.path === targetPath) {
        return;
      }

      cancelActivePreviewRequest();
      loadingPreviewPathRef.current = targetPath;
      currentPreviewItemRef.current = item;
      dispatch({ type: "RESET_PREVIEW" });

      try {
        const useToken = isTokenMode();
        const proxyUrl =
          GitHub.Proxy.transformImageUrl(item.download_url, item.path, useToken) ??
          item.download_url;
        const fileNameLower = item.name.toLowerCase();
        const isCurrentTarget = (): boolean => currentPreviewItemRef.current?.path === targetPath;

        if (isMarkdownFile(fileNameLower)) {
          await loadTextLikeContent(item, targetPath, "markdown");
        } else if (isTextFile(item.name)) {
          await loadTextLikeContent(item, targetPath, "text");
        } else if (isPdfFile(fileNameLower)) {
          try {
            await openPDFPreview({
              fileName: item.name,
              downloadUrl: proxyUrl,
              theme: muiTheme,
              translations: {
                loading: t("ui.pdf.loading"),
                cancel: t("ui.pdf.cancel"),
                cancelled: t("ui.pdf.cancelled"),
                loadFailed: t("ui.pdf.loadFailed"),
                openOriginal: t("ui.pdf.openOriginal"),
                viewerTitle: t("ui.pdf.viewerTitle"),
                downloaded: t("ui.pdf.downloaded"),
                downloadedWithProgress: t("ui.pdf.downloadedWithProgress"),
              },
              isDev: import.meta.env.DEV,
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t("error.unknown");
            onError(t("error.preview.pdfLoadFailed", { message: errorMessage }));
          }
        } else if (isImageFile(fileNameLower)) {
          const dirPath = item.path.split("/").slice(0, -1).join("/");
          updateUrlWithHistory(dirPath, item.path);
          if (!isCurrentTarget()) {
            return;
          }
          dispatch({ type: "SET_IMAGE_PREVIEW", url: proxyUrl, item });
        } else {
          onError(t("error.preview.unsupportedFileType"));
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : t("error.unknown");
        onError(t("error.preview.filePreviewFailed", { message: errorMessage }));
      } finally {
        if (loadingPreviewPathRef.current === targetPath) {
          loadingPreviewPathRef.current = null;
        }
      }
    },
    [cancelActivePreviewRequest, loadTextLikeContent, muiTheme, onError, t],
  );

  const closePreview = () => {
    cancelActivePreviewRequest();
    loadingPreviewPathRef.current = null;
    const currentItem = currentPreviewItemRef.current;
    if (currentItem !== null) {
      const dirPath = currentItem.path.split("/").slice(0, -1).join("/");
      updateUrlWithHistory(dirPath);
      currentPreviewItemRef.current = null;
    }
    dispatch({ type: "RESET_PREVIEW" });
    hasActivePreviewRef.current = false;
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      if (isHandlingNavigationRef.current) {
        return;
      }
      isHandlingNavigationRef.current = true;
      try {
        const hasActivePreview = hasActivePreviewRef.current;
        const urlHasPreview = hasPreviewParam();
        const previewPath = getPreviewFromUrl();

        if (hasActivePreview && !urlHasPreview) {
          cancelActivePreviewRequest();
          loadingPreviewPathRef.current = null;
          dispatch({ type: "RESET_PREVIEW" });
          currentPreviewItemRef.current = null;
          hasActivePreviewRef.current = false;
          return;
        }

        if (urlHasPreview && previewPath !== "") {
          const currentPreviewName = currentPreviewItemRef.current?.name;
          const currentPreviewPath = currentPreviewItemRef.current?.path;
          if (
            !hasActivePreview ||
            (currentPreviewName !== previewPath &&
              !(currentPreviewPath?.endsWith(`/${previewPath}`) ?? false))
          ) {
            if (findFileItemByPath !== undefined) {
              const fileItem = findFileItemByPath(previewPath);
              if (fileItem !== undefined) {
                currentPreviewItemRef.current = fileItem;
                void selectFile(fileItem);
              } else {
                logger.warn(`前进操作无法找到文件: ${previewPath}`);
              }
            }
          }
        }
      } finally {
        isHandlingNavigationRef.current = false;
      }
      void event;
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [cancelActivePreviewRequest, selectFile, findFileItemByPath]);

  return {
    previewState,
    selectFile,
    closePreview,
  };
};
