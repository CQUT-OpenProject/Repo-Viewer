import React from "react";
import { Box, useTheme } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { LazyMarkdownPreview, LazyImagePreview } from "@/utils/lazy-loading";
import type { GitHubContent } from "@/types";

/**
 * 预览覆盖层组件属性接口
 */
interface PreviewOverlayProps {
  /** Markdown预览项 */
  previewingItem: GitHubContent | null;
  /** Markdown预览内容 */
  previewContent: string | null;
  /** 是否正在加载预览内容 */
  loadingPreview: boolean;

  /** 图片预览项 */
  previewingImageItem: GitHubContent | null;
  /** 图片预览URL */
  imagePreviewUrl: string | null;

  /** 是否有上一张图片 */
  hasPreviousImage: boolean;
  /** 是否有下一张图片 */
  hasNextImage: boolean;
  /** 切换到上一张图片的回调 */
  onPreviousImage: () => void;
  /** 切换到下一张图片的回调 */
  onNextImage: () => void;

  /** 是否为小屏幕设备 */
  isSmallScreen: boolean;
  /** 当前分支名称 */
  currentBranch: string;
  /** 关闭预览的回调 */
  onClose: () => void;
}

/**
 * 预览覆盖层组件
 *
 * 处理 Markdown 和图片的全屏预览显示
 */
const PreviewOverlay: React.FC<PreviewOverlayProps> = ({
  previewingItem,
  previewContent,
  loadingPreview,
  previewingImageItem,
  imagePreviewUrl,
  hasPreviousImage,
  hasNextImage,
  onPreviousImage,
  onNextImage,
  isSmallScreen,
  currentBranch,
  onClose,
}) => {
  const theme = useTheme();

  return (
    <>
      {/* Markdown文件全屏预览（包括 README） */}
      <AnimatePresence mode="wait">
        {previewingItem !== null && previewContent !== null && (
          <motion.div
            key="md-preview"
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.125,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.02,
              },
            }}
            exit={{
              opacity: 0,
              y: 50,
              transition: {
                duration: 0.125,
                ease: [0.4, 0, 0.2, 1],
              },
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: theme.zIndex.modal + 100,
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
                bgcolor: "background.default",
                overflow: "auto",
                p: { xs: 1, sm: 2, md: 3 },
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  onClose();
                }
              }}
              data-oid="md-preview-fs"
            >
              <LazyMarkdownPreview
                readmeContent={previewContent}
                loadingReadme={loadingPreview}
                isSmallScreen={isSmallScreen}
                previewingItem={previewingItem}
                onClose={onClose}
                lazyLoad={false}
                currentBranch={currentBranch}
                data-oid="md-file-preview"
              />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图像预览 */}
      {previewingImageItem !== null && imagePreviewUrl !== null && (
        <LazyImagePreview
          imageUrl={imagePreviewUrl}
          fileName={previewingImageItem.name}
          isFullScreen={true}
          onClose={onClose}
          lazyLoad={false}
          hasPrevious={hasPreviousImage}
          hasNext={hasNextImage}
          onPrevious={onPreviousImage}
          onNext={onNextImage}
          data-oid="yfv5ld-"
        />
      )}
    </>
  );
};

export default PreviewOverlay;
