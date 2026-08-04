import type { GitHubContent } from "@/types";

/**
 * Markdown预览组件属性接口
 */
export interface MarkdownPreviewProps {
  readmeContent: string | null;
  loadingReadme: boolean;
  isSmallScreen: boolean;
  previewingItem?: GitHubContent | null;
  lazyLoad?: boolean;
  currentBranch?: string | undefined;
}
