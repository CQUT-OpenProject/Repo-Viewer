/**
 * @fileoverview 文件预览 Hook
 *
 * 提供 GitHub 仓库文件的预览功能，支持 Markdown、文本、图片和 PDF 文件的预览。
 * 集成 URL 参数管理和浏览器历史导航，支持后退按钮关闭预览。
 *
 * @module hooks/useFilePreview
 */

import React, { useReducer, useRef, useState, useEffect } from "react";
import type { RefObject } from "react";
import { useTheme } from "@mui/material";
import type { PreviewState, PreviewAction, GitHubContent } from "@/types";
import { GitHub } from "@/services/github";
import { logger, pdf } from "@/utils";
import { isImageFile, isMarkdownFile, isPdfFile, isTextFile } from "@/utils/files/fileHelpers";
import { isAbortError } from "@/utils/network/abort";
import {
  getPreviewFromUrl,
  updateUrlWithHistory,
  hasPreviewParam,
} from "@/utils/routing/urlManager";
import { getForceServerProxy } from "@/services/github/config/ProxyForceManager";
import { useI18n } from "@/contexts/I18nContext";

/** 预览状态初始值 */
const initialPreviewState: PreviewState = {
  previewContent: null,
  previewingItem: null,
  loadingPreview: false,
  previewType: null,
  imagePreviewUrl: null,
  previewingImageItem: null,
  isImageFullscreen: false,
  loadingImagePreview: false,
  imageError: null,
};

/**
 * 预览状态 Reducer
 *
 * 处理预览相关的所有状态变更，包括 Markdown/文本预览、图片预览和 PDF 预览。
 *
 * @param state - 当前预览状态
 * @param action - 预览动作
 * @returns 更新后的预览状态
 */
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
      return {
        ...state,
        loadingPreview: action.loading,
      };

    case "SET_IMAGE_PREVIEW":
      return {
        ...state,
        imagePreviewUrl: action.url,
        previewingImageItem: action.item,
      };

    case "SET_IMAGE_LOADING":
      return {
        ...state,
        loadingImagePreview: action.loading,
      };

    case "SET_IMAGE_ERROR":
      return {
        ...state,
        imageError: action.error,
      };

    case "SET_IMAGE_FULLSCREEN":
      return {
        ...state,
        isImageFullscreen: action.fullscreen,
      };

    default:
      return state;
  }
}

/**
 * 文件预览Hook
 *
 * 提供文件预览功能，支持Markdown、图片和PDF文档的预览。
 * 自动处理URL参数和浏览器历史导航。
 *
 * @param onError - 错误回调函数
 * @param findFileItemByPath - 根据路径查找文件的函数
 * @returns 文件预览状态和操作函数
 */
export const useFilePreview = (
  onError: (message: string) => void,
  findFileItemByPath?: (path: string) => GitHubContent | undefined,
): {
  previewState: PreviewState;
  useTokenMode: boolean;
  setUseTokenMode: (value: boolean) => void;
  selectFile: (item: GitHubContent) => Promise<void>;
  closePreview: () => void;
  toggleImageFullscreen: () => void;
  handleImageError: (error: string) => void;
  currentPreviewItemRef: RefObject<GitHubContent | null>;
} => {
  const [previewState, dispatch] = useReducer(previewReducer, initialPreviewState);
  const [useTokenMode, setUseTokenMode] = useState(true);
  const muiTheme = useTheme();
  const { t } = useI18n();
  const currentPreviewItemRef = useRef<GitHubContent | null>(null);
  const hasActivePreviewRef = useRef<boolean>(false);
  const isHandlingNavigationRef = useRef<boolean>(false);
  const loadingPreviewPathRef = useRef<string | null>(null);
  const previewRequestControllerRef = useRef<AbortController | null>(null);
  const previewRequestIdRef = useRef<number>(0);

  const cancelActivePreviewRequest = React.useCallback(() => {
    if (previewRequestControllerRef.current !== null) {
      previewRequestControllerRef.current.abort();
      previewRequestControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const hasActivePreview =
      previewState.previewingItem !== null || previewState.previewingImageItem !== null;
    hasActivePreviewRef.current = hasActivePreview;
    logger.debug(`预览状态更新: ${hasActivePreview ? "活跃" : "非活跃"}`);
  }, [previewState.previewingItem, previewState.previewingImageItem]);

  useEffect(() => {
    const previewPath = getPreviewFromUrl();
    if (previewPath !== "") {
      logger.debug(`从URL加载预览: ${previewPath}`);
      currentPreviewItemRef.current = {
        path: previewPath,
        name: previewPath.split("/").pop() ?? "",
        type: "file",
        sha: "",
        size: 0,
        url: "",
        html_url: "",
        git_url: "",
        download_url: "",
        _links: { self: "", git: "", html: "" },
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelActivePreviewRequest();
    };
  }, [cancelActivePreviewRequest]);

  const selectFile = React.useCallback(
    async (item: GitHubContent) => {
      if (item.download_url === null || item.download_url === "") {
        onError(t("error.preview.downloadLinkUnavailable"));
        return;
      }

      const targetPath = item.path;

      if (loadingPreviewPathRef.current === targetPath) {
        logger.debug(`文件 ${targetPath} 的预览仍在加载，忽略重复请求`);
        return;
      }

      if (hasActivePreviewRef.current && currentPreviewItemRef.current?.path === targetPath) {
        logger.debug(`文件 ${targetPath} 已在预览中，忽略重复请求`);
        return;
      }

      cancelActivePreviewRequest();
      loadingPreviewPathRef.current = targetPath;

      logger.debug(`正在选择文件预览: ${item.path}`);
      currentPreviewItemRef.current = item;
      const dirPath = item.path.split("/").slice(0, -1).join("/");
      const fileName = item.path.split("/").pop() ?? "";
      logger.debug(`使用简化的文件名作为预览参数: ${fileName}`);

      dispatch({ type: "RESET_PREVIEW" });

      try {
        const currentBranch = GitHub.Branch.getCurrentBranch();
        const proxyUrl = getForceServerProxy()
          ? GitHub.Content.getServerRepoFileProxyUrl(item.path, currentBranch)
          : (GitHub.Proxy.transformImageUrl(item.download_url, item.path, useTokenMode) ??
            item.download_url);

        const fileNameLower = item.name.toLowerCase();
        const isCurrentTarget = (): boolean => currentPreviewItemRef.current?.path === targetPath;

        if (isMarkdownFile(fileNameLower)) {
          updateUrlWithHistory(dirPath, item.path);
          dispatch({ type: "SET_PREVIEW_LOADING", loading: true });
          const requestId = previewRequestIdRef.current + 1;
          previewRequestIdRef.current = requestId;
          const abortController = new AbortController();
          previewRequestControllerRef.current = abortController;

          try {
            const content = await GitHub.Content.getFileContent(
              item.download_url,
              abortController.signal,
            );
            if (!isCurrentTarget()) {
              logger.debug(`加载完成时目标已切换，忽略 Markdown 结果: ${targetPath}`);
              return;
            }
            dispatch({ type: "SET_MD_PREVIEW", content, item });
          } catch (error: unknown) {
            if (isAbortError(error)) {
              return;
            }
            const errorMessage = error instanceof Error ? error.message : t("error.unknown");
            onError(t("error.preview.markdownLoadFailed", { message: errorMessage }));
          } finally {
            if (
              previewRequestIdRef.current === requestId &&
              previewRequestControllerRef.current === abortController
            ) {
              previewRequestControllerRef.current = null;
              dispatch({ type: "SET_PREVIEW_LOADING", loading: false });
            }
          }
        } else if (isTextFile(item.name)) {
          updateUrlWithHistory(dirPath, item.path);
          dispatch({ type: "SET_PREVIEW_LOADING", loading: true });
          const requestId = previewRequestIdRef.current + 1;
          previewRequestIdRef.current = requestId;
          const abortController = new AbortController();
          previewRequestControllerRef.current = abortController;

          try {
            const content = await GitHub.Content.getFileContent(
              item.download_url,
              abortController.signal,
            );
            if (!isCurrentTarget()) {
              logger.debug(`加载完成时目标已切换，忽略文本结果: ${targetPath}`);
              return;
            }
            dispatch({ type: "SET_TEXT_PREVIEW", content, item });
          } catch (error: unknown) {
            if (isAbortError(error)) {
              return;
            }
            const errorMessage = error instanceof Error ? error.message : t("error.unknown");
            onError(t("error.preview.textLoadFailed", { message: errorMessage }));
          } finally {
            if (
              previewRequestIdRef.current === requestId &&
              previewRequestControllerRef.current === abortController
            ) {
              previewRequestControllerRef.current = null;
              dispatch({ type: "SET_PREVIEW_LOADING", loading: false });
            }
          }
        } else if (isPdfFile(fileNameLower)) {
          // 使用新的 PDF 预览工具函数
          try {
            await pdf.openPDFPreview({
              fileName: item.name,
              downloadUrl: item.download_url,
              serverProxyUrl: getForceServerProxy()
                ? GitHub.Content.getServerRepoFileProxyUrl(item.path, currentBranch)
                : undefined,
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

            logger.info(`已在新标签页打开 PDF: ${item.path}`);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t("error.unknown");
            onError(t("error.preview.pdfLoadFailed", { message: errorMessage }));
          }
          return;
        } else if (isImageFile(fileNameLower)) {
          // 图片预览
          dispatch({ type: "SET_IMAGE_LOADING", loading: true });
          dispatch({ type: "SET_IMAGE_ERROR", error: null });

          try {
            updateUrlWithHistory(dirPath, item.path);
            if (!isCurrentTarget()) {
              logger.debug(`图片预览在URL更新前目标已切换，忽略: ${targetPath}`);
              return;
            }
            dispatch({
              type: "SET_IMAGE_PREVIEW",
              url: proxyUrl,
              item,
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t("error.unknown");
            dispatch({ type: "SET_IMAGE_ERROR", error: errorMessage });
            onError(t("error.preview.imageLoadFailed", { message: errorMessage }));
          } finally {
            dispatch({ type: "SET_IMAGE_LOADING", loading: false });
          }
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
    [cancelActivePreviewRequest, muiTheme, onError, t, useTokenMode],
  );

  // 关闭预览
  const closePreview = () => {
    logger.debug("关闭预览组件");
    cancelActivePreviewRequest();
    loadingPreviewPathRef.current = null;

    // 获取当前预览的项目
    const currentItem = currentPreviewItemRef.current;

    if (currentItem !== null) {
      // 从路径中提取目录部分
      const dirPath = currentItem.path.split("/").slice(0, -1).join("/");

      logger.debug(`关闭预览 ${currentItem.path}，返回到目录 ${dirPath}`);

      // 更新 URL，移除预览参数 - 始终创建新的历史条目
      updateUrlWithHistory(dirPath);

      // 重置当前预览项目引用
      currentPreviewItemRef.current = null;
    } else {
      logger.warn("尝试关闭预览，但没有当前预览项目");
    }

    // 重置预览状态
    dispatch({ type: "RESET_PREVIEW" });
    hasActivePreviewRef.current = false;
  };

  // 图像全屏切换
  const toggleImageFullscreen = () => {
    dispatch({ type: "SET_IMAGE_FULLSCREEN", fullscreen: !previewState.isImageFullscreen });
  };

  // 图像错误处理
  const handleImageError = (error: string) => {
    dispatch({ type: "SET_IMAGE_ERROR", error });
    dispatch({ type: "SET_IMAGE_LOADING", loading: false });
    onError(t("error.preview.imageError", { message: error }));
  };

  // 监听浏览器历史导航事件，处理预览的后退操作
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      logger.debug("检测到浏览器后退/前进按钮操作");

      // 防止重复处理
      if (isHandlingNavigationRef.current) {
        logger.debug("已在处理导航事件，跳过");
        return;
      }

      isHandlingNavigationRef.current = true;

      try {
        // 从历史状态中获取预览信息
        const state = event.state as { path?: string; preview?: string } | null;
        logger.debug(`历史状态: ${JSON.stringify(state)}`);

        // 当前是否有预览打开 - 使用 ref 值，确保最新状态
        const hasActivePreview = hasActivePreviewRef.current;
        logger.debug(`当前预览状态: ${hasActivePreview ? "活跃" : "非活跃"}`);

        // 检查 URL 是否包含预览参数
        const urlHasPreview = hasPreviewParam();
        const previewPath = getPreviewFromUrl();
        logger.debug(`URL 预览参数: ${urlHasPreview ? previewPath : "无"}`);

        // 如果当前有预览，但 URL 不再包含预览参数，则关闭预览（后退操作）
        if (hasActivePreview && !urlHasPreview) {
          logger.debug("检测到后退关闭预览操作");
          cancelActivePreviewRequest();
          loadingPreviewPathRef.current = null;

          // 重置预览状态
          dispatch({ type: "RESET_PREVIEW" });
          currentPreviewItemRef.current = null;
          hasActivePreviewRef.current = false;

          logger.debug("预览已关闭");
          return;
        }

        // 如果 URL 包含预览参数，但当前没有预览或预览的是不同文件，则尝试打开预览（前进操作）
        if (urlHasPreview && previewPath !== "") {
          const currentPreviewName = currentPreviewItemRef.current?.name;
          const currentPreviewPath = currentPreviewItemRef.current?.path;

          // 检查文件名是否匹配
          if (
            !hasActivePreview ||
            (currentPreviewName !== previewPath &&
              !(currentPreviewPath?.endsWith(`/${previewPath}`) ?? false))
          ) {
            logger.debug(`检测到前进打开预览操作: ${previewPath}`);

            // 使用回调函数查找文件项
            if (findFileItemByPath !== undefined) {
              const fileItem = findFileItemByPath(previewPath);

              if (fileItem !== undefined) {
                logger.debug(`找到预览文件项: ${fileItem.path}`);
                // 更新预览引用并打开预览
                currentPreviewItemRef.current = fileItem;
                void selectFile(fileItem);
                logger.debug("正在重新打开预览");
              } else {
                logger.warn(`前进操作无法找到文件: ${previewPath}`);
              }
            } else {
              logger.warn("未提供查找文件的回调函数，无法重新打开预览");
            }
          }
        }
      } finally {
        // 完成处理
        isHandlingNavigationRef.current = false;
      }
    };

    // 添加历史导航事件监听器
    window.addEventListener("popstate", handlePopState);
    logger.debug("已添加 popstate 事件监听器");

    // 组件卸载时移除监听器
    return () => {
      window.removeEventListener("popstate", handlePopState);
      logger.debug("已移除 popstate 事件监听器");
    };
  }, [cancelActivePreviewRequest, selectFile, findFileItemByPath]);

  return {
    previewState,
    useTokenMode,
    setUseTokenMode,
    selectFile,
    closePreview,
    toggleImageFullscreen,
    handleImageError,
    currentPreviewItemRef,
  };
};
