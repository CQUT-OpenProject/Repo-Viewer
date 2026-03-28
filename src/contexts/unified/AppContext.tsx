import React from "react";
import { useSnackbar } from "notistack";
import type { ReactNode, ReactElement } from "react";
import { useMemo } from "react";
import { useDownload } from "@/hooks/useDownload";
import { useFilePreview } from "@/hooks/useFilePreview";
import { useGitHubContent } from "@/hooks/useGitHubContent";
import {
  ContentContext,
  PreviewContext,
  DownloadContext,
  type ContentContextValue,
  type PreviewContextValue,
  type DownloadContextValue,
  type NavigationDirection,
} from "./context";

/**
 * 应用上下文提供者组件属性接口
 */
interface AppContextProviderProps {
  children: ReactNode;
}

/**
 * 应用上下文提供者组件
 *
 * 统一管理应用的内容、预览和下载状态，为子组件提供全局上下文。
 */
export function AppContextProvider({ children }: AppContextProviderProps): ReactElement {
  const content = useGitHubContent();
  const { enqueueSnackbar } = useSnackbar();

  const {
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    readmeLoaded,
    error,
    navigationDirection,
    repoOwner,
    repoName,
    currentBranch,
    defaultBranch,
    branches,
    branchLoading,
    branchError,
    setCurrentBranch,
    refreshBranches,
    setCurrentPath,
    refreshContents,
    search,
  } = content;

  const handleError = React.useCallback(
    (message: string) => {
      enqueueSnackbar(message, { variant: "error" });
    },
    [enqueueSnackbar],
  );

  const findFileItemByPath = React.useCallback(
    (pathOrFileName: string) =>
      contents.find(
        (item) =>
          item.path === pathOrFileName ||
          item.name === pathOrFileName ||
          item.path.endsWith(`/${pathOrFileName}`),
      ),
    [contents],
  );

  const preview = useFilePreview(handleError, findFileItemByPath);
  const download = useDownload(handleError);

  const navigateTo = React.useCallback(
    (path: string, direction: NavigationDirection = "forward"): void => {
      setCurrentPath(path, direction);
    },
    [setCurrentPath],
  );

  const refresh = React.useCallback((): void => {
    refreshContents();
  }, [refreshContents]);

  const contentValue = useMemo<ContentContextValue>(
    () => ({
      currentPath,
      contents,
      readmeContent,
      loading,
      loadingReadme,
      readmeLoaded,
      error,
      navigationDirection,
      repoOwner,
      repoName,
      currentBranch,
      defaultBranch,
      branches,
      branchLoading,
      branchError,
      setCurrentBranch,
      refreshBranches,
      setCurrentPath,
      navigateTo,
      refresh,
      handleRetry: refresh,
      findFileItemByPath,
      search,
    }),
    [
      currentPath,
      contents,
      readmeContent,
      loading,
      loadingReadme,
      readmeLoaded,
      error,
      navigationDirection,
      repoOwner,
      repoName,
      currentBranch,
      defaultBranch,
      branches,
      branchLoading,
      branchError,
      setCurrentBranch,
      refreshBranches,
      setCurrentPath,
      navigateTo,
      refresh,
      findFileItemByPath,
      search,
    ],
  );

  const previewValue = useMemo<PreviewContextValue>(
    () => ({
      previewState: {
        ...preview.previewState,
        previewingPdfItem: null,
      },
      currentPreviewItemRef: preview.currentPreviewItemRef,
      selectFile: preview.selectFile,
      closePreview: preview.closePreview,
      toggleImageFullscreen: preview.toggleImageFullscreen,
      handleImageError: preview.handleImageError,
    }),
    [
      preview.previewState,
      preview.currentPreviewItemRef,
      preview.selectFile,
      preview.closePreview,
      preview.toggleImageFullscreen,
      preview.handleImageError,
    ],
  );

  const downloadValue = useMemo<DownloadContextValue>(
    () => ({
      downloadState: download.downloadState,
      downloadFile: download.downloadFile,
      downloadFolder: download.downloadFolder,
      cancelDownload: download.cancelDownload,
    }),
    [
      download.downloadState,
      download.downloadFile,
      download.downloadFolder,
      download.cancelDownload,
    ],
  );

  return (
    <ContentContext.Provider value={contentValue}>
      <PreviewContext.Provider value={previewValue}>
        <DownloadContext.Provider value={downloadValue}>{children}</DownloadContext.Provider>
      </PreviewContext.Provider>
    </ContentContext.Provider>
  );
}
