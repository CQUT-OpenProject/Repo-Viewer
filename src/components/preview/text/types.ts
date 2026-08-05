import type { GitHubContent } from "@/types";

export interface TextPreviewProps {
  content: string | null;
  loading: boolean;
  isSmallScreen: boolean;
  previewingItem?: GitHubContent | null;
}
