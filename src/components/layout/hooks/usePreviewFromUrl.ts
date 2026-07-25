import { useEffect } from "react";
import type { GitHubContent } from "@/types";
import { getPreviewFromUrl } from "@/utils/routing/urlManager";
import { logger } from "@/utils/logging/logger";

interface UsePreviewFromUrlOptions {
  contents: GitHubContent[];
  loading: boolean;
  error: string | null;
  previewingItem: GitHubContent | null;
  previewingImageItem: GitHubContent | null;
  onSelectFile: (file: GitHubContent) => Promise<void> | void;
}

/**
 * 从 URL 预览参数自动打开文件预览。
 */
export function usePreviewFromUrl({
  contents,
  loading,
  error,
  previewingItem,
  previewingImageItem,
  onSelectFile,
}: UsePreviewFromUrlOptions): void {
  useEffect(() => {
    const loadPreviewFromUrl = async (): Promise<void> => {
      if (loading || error !== null || contents.length === 0) {
        return;
      }

      const previewFileName = getPreviewFromUrl().trim();
      if (previewFileName.length === 0) {
        return;
      }

      const fileItem =
        contents.find((item) => item.name === previewFileName) ??
        contents.find((item) => item.path.endsWith(`/${previewFileName}`));

      if (fileItem === undefined) {
        logger.warn(`无法找到预览文件: ${previewFileName}`);
        return;
      }

      const hasActivePreview =
        (previewingItem !== null && previewingItem.path === fileItem.path) ||
        (previewingImageItem !== null && previewingImageItem.path === fileItem.path);

      if (!hasActivePreview) {
        await onSelectFile(fileItem);
      }
    };

    void loadPreviewFromUrl();
  }, [loading, error, contents, previewingItem, previewingImageItem, onSelectFile]);
}
