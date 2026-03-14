import { useEffect, useRef } from "react";
import type { GitHubContent } from "@/types";
import { getPreviewFromUrl } from "@/utils/routing/urlManager";
import { logger } from "@/utils";

interface UsePreviewFromUrlOptions {
  contents: GitHubContent[];
  loading: boolean;
  error: string | null;
  previewingItem: GitHubContent | null;
  previewingImageItem: GitHubContent | null;
  onSelectFile: (file: GitHubContent) => Promise<void> | void;
}

/**
 * URL 预览加载 Hook
 *
 * 从 URL 参数中读取预览文件名并自动打开预览
 */
export function usePreviewFromUrl({
  contents,
  loading,
  error,
  previewingItem,
  previewingImageItem,
  onSelectFile,
}: UsePreviewFromUrlOptions): void {
  const currentPreviewItemRef = useRef<GitHubContent | null>(null);

  useEffect(() => {
    const loadPreviewFromUrl = async (): Promise<void> => {
      if (loading) {
        return;
      }

      if (error !== null) {
        return;
      }

      if (contents.length === 0) {
        return;
      }

      const previewFileName = getPreviewFromUrl();

      if (previewFileName.trim().length === 0) {
        return;
      }

      const normalizedPreviewFileName = previewFileName.trim();

      logger.debug(`从URL获取预览文件名: ${normalizedPreviewFileName}`);

      const directMatch = contents.find((item) => item.name === normalizedPreviewFileName);
      const pathTailMatch = contents.find((item) =>
        item.path.endsWith(`/${normalizedPreviewFileName}`),
      );
      const fileItem = directMatch ?? pathTailMatch;

      if (fileItem === undefined) {
        logger.warn(`无法找到预览文件: ${normalizedPreviewFileName}`);
        return;
      }

      logger.debug(`找到匹配的文件: ${fileItem.path}`);

      currentPreviewItemRef.current = fileItem;

      const hasActivePreview =
        (previewingItem !== null && previewingItem.path === fileItem.path) ||
        (previewingImageItem !== null && previewingImageItem.path === fileItem.path);

      if (!hasActivePreview) {
        logger.debug(`预览文件未打开，正在加载: ${fileItem.path}`);
        await onSelectFile(fileItem);
      } else {
        logger.debug(`预览文件已经打开: ${fileItem.path}`);
      }
    };

    void loadPreviewFromUrl();
  }, [loading, error, contents, previewingItem, previewingImageItem, onSelectFile]);
}
