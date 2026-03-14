import { createLazyPreviewComponent } from "../core/createLazyPreviewComponent";
import type { ExtendedMarkdownPreviewProps } from "../../../components/preview/markdown/MarkdownPreview";
import type { ImagePreviewProps } from "../../../components/preview/image/types";
import type { TextPreviewProps } from "../../../components/preview/text/types";
import { MarkdownPreviewSkeleton } from "../../../components/ui/skeletons";

/**
 * 懒加载Markdown预览组件
 */
export const LazyMarkdownPreview = createLazyPreviewComponent<ExtendedMarkdownPreviewProps>(
  () => import("../../../components/preview/markdown"),
  {
    fallback: ({ isSmallScreen }) => <MarkdownPreviewSkeleton isSmallScreen={isSmallScreen} />,
  },
);

/**
 * 懒加载图片预览组件
 */
export const LazyImagePreview = createLazyPreviewComponent<ImagePreviewProps>(
  () => import("../../../components/preview/image"),
);

/**
 * 懒加载文本预览组件
 */
export const LazyTextPreview = createLazyPreviewComponent<TextPreviewProps>(
  () => import("../../../components/preview/text"),
  {
    fallback: ({ isSmallScreen }) => <MarkdownPreviewSkeleton isSmallScreen={isSmallScreen} />,
  },
);
