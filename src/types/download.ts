/**
 * 下载相关类型定义
 *
 * 包含下载状态和操作的类型定义。
 */

/**
 * 下载状态接口
 */
export interface DownloadState {
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  processingFiles: number;
  totalFiles: number;
  isCancelled: boolean;
}

/**
 * 下载操作联合类型
 */
export type DownloadAction =
  | { type: "SET_DOWNLOADING_FILE"; path: string | null }
  | { type: "SET_DOWNLOADING_FOLDER"; path: string | null }
  | { type: "SET_FOLDER_PROGRESS"; progress: number }
  | { type: "SET_PROCESSING_FILES"; count: number }
  | { type: "SET_TOTAL_FILES"; count: number }
  | { type: "CANCEL_DOWNLOAD" }
  | { type: "RESET_DOWNLOAD_STATE" };
