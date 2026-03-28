/**
 * @fileoverview 下载管理 Hook
 *
 * 提供 GitHub 仓库文件和文件夹的下载功能，支持单文件下载和文件夹打包为 ZIP 下载。
 * 支持下载进度追踪、取消操作，使用 AbortController 实现请求中止。
 *
 * @module hooks/useDownload
 */

import { useReducer, useRef } from "react";
import { saveAs } from "file-saver";
import type { DownloadState, DownloadAction, GitHubContent } from "@/types";
import { GitHub } from "@/services/github";
import { logger } from "@/utils";
import { isAbortError } from "@/utils/network/abort";
import { requestManager } from "@/utils/request/requestManager";
import {
  downloadFolderAsZip,
  prepareZipOutputSink,
  type FolderDownloadEntry,
  type ZipOutputSink,
} from "@/utils/download/folderZipPipeline";
import { getForceServerProxy } from "@/services/github/config/ProxyForceManager";
import { useI18n } from "@/contexts/I18nContext";

/** 下载状态初始值 */
const initialDownloadState: DownloadState = {
  downloadingPath: null,
  downloadingFolderPath: null,
  folderDownloadProgress: 0,
  processingFiles: 0,
  totalFiles: 0,
  isCancelled: false,
};

/**
 * 下载状态 Reducer
 *
 * 处理下载相关的所有状态变更，包括下载进度、处理文件数和取消状态。
 *
 * @param state - 当前下载状态
 * @param action - 下载动作
 * @returns 更新后的下载状态
 */
function downloadReducer(state: DownloadState, action: DownloadAction): DownloadState {
  switch (action.type) {
    case "SET_DOWNLOADING_FILE":
      return {
        ...state,
        downloadingPath: action.path,
        isCancelled: false,
      };
    case "SET_DOWNLOADING_FOLDER":
      return {
        ...state,
        downloadingFolderPath: action.path,
        isCancelled: false,
      };
    case "SET_FOLDER_PROGRESS":
      return {
        ...state,
        folderDownloadProgress: action.progress,
      };
    case "SET_PROCESSING_FILES":
      return {
        ...state,
        processingFiles: action.count,
      };
    case "SET_TOTAL_FILES":
      return {
        ...state,
        totalFiles: action.count,
      };
    case "CANCEL_DOWNLOAD":
      return {
        ...state,
        isCancelled: true,
      };
    case "RESET_DOWNLOAD_STATE":
      return initialDownloadState;
    default:
      return state;
  }
}

/**
 * 下载管理Hook
 *
 * 提供文件和文件夹下载功能，支持进度追踪和取消操作。
 * 文件夹下载会打包为ZIP格式。
 *
 * @param onError - 错误回调函数
 * @returns 包含下载状态和操作函数的对象
 */
export const useDownload = (
  onError: (message: string) => void,
): {
  downloadState: DownloadState;
  downloadFile: (item: GitHubContent) => Promise<void>;
  downloadFolder: (path: string, folderName: string) => Promise<void>;
  cancelDownload: () => void;
  isDownloading: boolean;
} => {
  const [downloadState, dispatch] = useReducer(downloadReducer, initialDownloadState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const { t } = useI18n();

  // 检查是否有正在进行的下载
  const isDownloading =
    downloadState.downloadingPath !== null || downloadState.downloadingFolderPath !== null;

  const hasBeenCancelled = () => isCancelledRef.current;

  // 取消下载
  const cancelDownload = () => {
    if (!isDownloading) {
      return;
    }

    // 设置取消标志
    isCancelledRef.current = true;
    dispatch({ type: "CANCEL_DOWNLOAD" });

    // 中止所有网络请求
    if (abortControllerRef.current !== null) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    logger.info("下载已取消");

    // 重置下载状态
    setTimeout(() => {
      isCancelledRef.current = false;
      dispatch({ type: "RESET_DOWNLOAD_STATE" });
    }, 500); // 短暂延迟以便UI可以响应
  };

  // 下载文件
  const downloadFile = async (item: GitHubContent) => {
    // 防止同时触发多个下载
    if (downloadState.downloadingPath !== null || downloadState.downloadingFolderPath !== null) {
      onError(t("error.file.downloadInProgress"));
      return;
    }

    if (item.download_url === null) {
      onError(t("error.file.downloadLinkUnavailable"));
      return;
    }

    isCancelledRef.current = false;
    dispatch({ type: "SET_DOWNLOADING_FILE", path: item.path });

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 使用代理URL获取文件
      let downloadUrl = item.download_url;

      // 如果是非开发环境或启用了令牌模式，使用服务端API代理
      if (getForceServerProxy()) {
        downloadUrl = GitHub.Content.getServerRepoFileProxyUrl(
          item.path,
          GitHub.Branch.getCurrentBranch(),
        );
      }

      const response = await fetch(downloadUrl, { signal });

      // 检查是否已取消 (ref可在异步期间被cancelDownload修改)
      if (hasBeenCancelled()) {
        logger.info("文件下载已取消");
        return;
      }

      if (!response.ok) {
        const error = new Error(`下载失败: ${String(response.status)} ${response.statusText}`);
        logger.error("下载文件失败:", error);
        onError(t("error.file.downloadFailed", { message: error.message }));
        return;
      }

      const blob = await response.blob();

      // 再次检查是否已取消 (ref可在异步期间被cancelDownload修改)
      if (hasBeenCancelled()) {
        logger.info("文件下载已取消");
        return;
      }

      saveAs(blob, item.name);

      logger.info(`文件下载成功: ${item.path}`);
    } catch (e: unknown) {
      const error = e as Error;
      if (error.name === "AbortError" || hasBeenCancelled()) {
        logger.info("文件下载已取消");
      } else {
        logger.error("下载文件失败:", error);
        onError(t("error.file.downloadFailed", { message: error.message }));
      }
    } finally {
      abortControllerRef.current = null;
      dispatch({ type: "SET_DOWNLOADING_FILE", path: null });
    }
  };

  // 递归收集文件
  const collectFiles = async function collectFilesInner(
    folderPath: string,
    fileList: FolderDownloadEntry[],
    basePath: string,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      // 获取文件夹内容
      // 使用 requestManager 避免重复请求
      const contents = await requestManager.request(
        `download-folder-${folderPath}`,
        (requestSignal) => GitHub.Content.getContents(folderPath, requestSignal),
        { signal },
      );

      // 检查是否已取消 (ref可在异步期间被cancelDownload修改)
      if (hasBeenCancelled()) {
        return;
      }

      // 处理每个文件/文件夹
      for (const item of contents) {
        // 更新相对路径，去除基本路径前缀
        const relativePath = item.path.startsWith(basePath)
          ? item.path.substring(basePath.length > 0 ? basePath.length + 1 : 0)
          : item.path;

        if (item.type === "file") {
          // 确保我们有下载链接
          if (item.download_url === null) {
            continue;
          }

          // 如果是非开发环境或启用了令牌模式，使用服务端API代理
          let downloadUrl = item.download_url;
          if (getForceServerProxy()) {
            downloadUrl = GitHub.Content.getServerRepoFileProxyUrl(
              item.path,
              GitHub.Branch.getCurrentBranch(),
            );
          }

          fileList.push({
            path: relativePath,
            url: downloadUrl,
            size: item.size,
          });
        } else {
          // 递归处理子文件夹 (type === 'dir')
          await collectFilesInner(item.path, fileList, basePath, signal);
          if (hasBeenCancelled()) {
            return;
          }
        }
      }
    } catch (e) {
      // 如果是取消导致的错误，抛出
      if (e instanceof Error && (e.name === "AbortError" || hasBeenCancelled())) {
        return;
      }
      // 其他错误记录但继续处理
      logger.error(`获取文件夹内容失败: ${folderPath}`, e);
    }
  };

  // 下载文件夹
  const downloadFolder = async (path: string, folderName: string) => {
    // 防止同时触发多个下载
    if (downloadState.downloadingPath !== null || downloadState.downloadingFolderPath !== null) {
      onError(t("error.file.downloadInProgress"));
      return;
    }

    isCancelledRef.current = false;
    dispatch({ type: "SET_DOWNLOADING_FOLDER", path });
    dispatch({ type: "SET_FOLDER_PROGRESS", progress: 0 });
    dispatch({ type: "SET_PROCESSING_FILES", count: 0 });
    dispatch({ type: "SET_TOTAL_FILES", count: 0 });

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    let outputSink: ZipOutputSink | null = null;
    let zipPipelineStarted = false;

    try {
      outputSink = await prepareZipOutputSink({
        archiveName: `${folderName}.zip`,
        saveAsImpl: saveAs,
      });

      // 递归获取文件夹内容
      const allFiles: FolderDownloadEntry[] = [];
      await collectFiles(path, allFiles, path, signal);

      // 检查是否已取消 (ref可在异步期间被cancelDownload修改)
      if (hasBeenCancelled()) {
        await outputSink.abort();
        logger.info("文件夹下载已取消");
        return;
      }

      dispatch({ type: "SET_TOTAL_FILES", count: allFiles.length });
      logger.info(`需要下载的文件总数: ${String(allFiles.length)}`);

      let processedCount = 0;
      zipPipelineStarted = true;
      await downloadFolderAsZip({
        files: allFiles,
        signal,
        archiveName: `${folderName}.zip`,
        outputSink,
        onFileComplete: (count, total) => {
          processedCount = count;
          dispatch({ type: "SET_PROCESSING_FILES", count });
          dispatch({
            type: "SET_FOLDER_PROGRESS",
            progress: total > 0 ? Math.round((count / total) * 100) : 100,
          });
        },
        onFileError: (file, error) => {
          logger.error(`文件 ${file.path} 下载失败:`, error);
        },
      });

      if (!hasBeenCancelled()) {
        dispatch({ type: "SET_PROCESSING_FILES", count: processedCount });
        dispatch({ type: "SET_FOLDER_PROGRESS", progress: 100 });
      }

      logger.info(`文件夹下载完成: ${path}`);
    } catch (e: unknown) {
      const error = e as Error;
      if (outputSink !== null && !zipPipelineStarted) {
        await outputSink.abort(error);
      }

      if (isAbortError(error) || hasBeenCancelled()) {
        logger.info("文件夹下载已取消");
      } else {
        logger.error("下载文件夹失败:", error);
        onError(t("error.file.folderDownloadFailed", { message: error.message }));
      }
    } finally {
      abortControllerRef.current = null;
      dispatch({ type: "RESET_DOWNLOAD_STATE" });
    }
  };

  return {
    downloadState,
    downloadFile,
    downloadFolder,
    cancelDownload,
    isDownloading,
  };
};
