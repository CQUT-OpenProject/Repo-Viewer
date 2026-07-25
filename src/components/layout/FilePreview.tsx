import React from "react";
import { Box } from "@mui/material";
import { m, useReducedMotion, type Variants } from "framer-motion";
import BreadcrumbNavigation from "@/components/layout/BreadcrumbNavigation";
import { LazyMarkdownPreview, LazyImagePreview, LazyTextPreview } from "@/utils/lazy-loading";
import type { PreviewState, BreadcrumbSegment } from "@/types";
import type { NavigationDirection } from "@/contexts/unified";

export type FilePreviewMode = "page" | "overlay";

interface FilePreviewBaseProps {
  mode: FilePreviewMode;
  previewState: PreviewState;
  onClose: () => void;
  isSmallScreen: boolean;
  currentBranch: string;
}

interface FilePreviewPageProps extends FilePreviewBaseProps {
  mode: "page";
  breadcrumbSegments: BreadcrumbSegment[];
  breadcrumbsMaxItems: number;
  handleBreadcrumbClick: (path: string, direction?: NavigationDirection) => void;
  breadcrumbsContainerRef: React.RefObject<HTMLDivElement | null>;
  shouldShowInToolbar: boolean;
}

interface FilePreviewOverlayProps extends FilePreviewBaseProps {
  mode: "overlay";
  hasPreviousImage: boolean;
  hasNextImage: boolean;
  onPreviousImage: () => void;
  onNextImage: () => void;
}

type FilePreviewProps = FilePreviewPageProps | FilePreviewOverlayProps;

const previewAnimation: Variants = {
  hidden: { opacity: 0, marginTop: 16 },
  visible: {
    opacity: 1,
    marginTop: 0,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

const reducedMotionPreviewAnimation: Variants = {
  hidden: { opacity: 1, marginTop: 0 },
  visible: {
    opacity: 1,
    marginTop: 0,
    transition: { duration: 0 },
  },
};

const MotionBox = m.create(Box);

const FilePreview: React.FC<FilePreviewProps> = (props) => {
  const { mode, previewState, onClose, isSmallScreen, currentBranch } = props;
  const shouldReduceMotion = useReducedMotion();

  if (mode === "overlay") {
    const { hasPreviousImage, hasNextImage, onPreviousImage, onNextImage } = props;
    const imageUrl =
      previewState.previewingImageItem !== null && typeof previewState.imagePreviewUrl === "string"
        ? previewState.imagePreviewUrl
        : null;

    if (previewState.previewingImageItem === null || imageUrl === null) {
      return null;
    }

    return (
      <LazyImagePreview
        imageUrl={imageUrl}
        fileName={previewState.previewingImageItem.name}
        isFullScreen={true}
        onClose={onClose}
        lazyLoad={false}
        hasPrevious={hasPreviousImage}
        hasNext={hasNextImage}
        onPrevious={onPreviousImage}
        onNext={onNextImage}
      />
    );
  }

  if (previewState.previewingItem === null) {
    return null;
  }

  const hasMarkdown =
    previewState.previewType === "markdown" && previewState.previewContent !== null;
  const hasText = previewState.previewType === "text" && previewState.previewContent !== null;

  const {
    breadcrumbSegments,
    breadcrumbsMaxItems,
    handleBreadcrumbClick,
    breadcrumbsContainerRef,
    shouldShowInToolbar,
  } = props;

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pb: { xs: 4, md: 6 },
        gap: { xs: 2, md: 2.5 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "1200px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <Box
          sx={{
            opacity: shouldShowInToolbar ? 0 : 1,
            transform: shouldShowInToolbar ? "translateY(-20px)" : "translateY(0)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: shouldShowInToolbar ? "none" : "auto",
          }}
        >
          <BreadcrumbNavigation
            breadcrumbSegments={breadcrumbSegments}
            handleBreadcrumbClick={handleBreadcrumbClick}
            breadcrumbsMaxItems={breadcrumbsMaxItems}
            isSmallScreen={isSmallScreen}
            breadcrumbsContainerRef={breadcrumbsContainerRef}
            showBackButton={false}
          />
        </Box>

        <MotionBox
          initial="hidden"
          animate="visible"
          variants={shouldReduceMotion ? reducedMotionPreviewAnimation : previewAnimation}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2.5, md: 3 },
            minHeight: "320px",
          }}
        >
          {hasMarkdown ? (
            <LazyMarkdownPreview
              readmeContent={previewState.previewContent}
              loadingReadme={previewState.loadingPreview}
              isSmallScreen={isSmallScreen}
              previewingItem={previewState.previewingItem}
              lazyLoad={false}
              currentBranch={currentBranch}
              onClose={onClose}
            />
          ) : null}

          {hasText ? (
            <LazyTextPreview
              content={previewState.previewContent}
              loading={previewState.loadingPreview}
              isSmallScreen={isSmallScreen}
              previewingItem={previewState.previewingItem}
              onClose={onClose}
            />
          ) : null}
        </MotionBox>
      </Box>
    </Box>
  );
};

export default FilePreview;
