import React, { useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { LazyMarkdownPreview } from "@/utils/lazy-loading";
import { MarkdownPreviewSkeleton } from "@/components/ui/skeletons";
import type { GitHubContent } from "@/types";
import { useI18n } from "@/contexts/I18nContext";
import { useContentContext, usePreviewContext } from "@/contexts/unified";
import { scroll, logger } from "@/utils";

/**
 * README预览区域组件属性接口
 */
interface ReadmeSectionProps {
  /** 是否存在README文件 */
  hasReadmeFile: boolean;
  /** README文件内容 */
  readmeContent: string | null;
  /** 是否正在加载README */
  loadingReadme: boolean;
  /** README是否已加载完成 */
  readmeLoaded: boolean;
  /** 是否为小屏幕设备 */
  isSmallScreen: boolean;
  /** 当前分支名称 */
  currentBranch: string;
  /** README文件项对象 */
  readmeFileItem: GitHubContent | null;
  /** 是否正在过渡动画中 */
  isTransitioning?: boolean;
}

/**
 * README 预览区域组件
 *
 * 显示当前目录的 README 文件预览
 */
const ReadmeSection: React.FC<ReadmeSectionProps> = ({
  hasReadmeFile,
  readmeContent,
  loadingReadme,
  readmeLoaded,
  isSmallScreen,
  currentBranch,
  readmeFileItem,
  isTransitioning = false,
}) => {
  const { t } = useI18n();
  const { navigateTo, findFileItemByPath, currentPath } = useContentContext();
  const { selectFile } = usePreviewContext();
  const pendingScrollRef = React.useRef(false);
  const pendingScrollTimerRef = React.useRef<number | null>(null);

  // 提取路径值，避免 useMemo 依赖项问题
  const readmeFilePath = readmeFileItem?.path;

  // 获取当前 README 文件所在的目录路径
  const currentReadmeDir = React.useMemo(() => {
    if (readmeFilePath !== undefined && readmeFilePath.length > 0) {
      const lastSlashIndex = readmeFilePath.lastIndexOf("/");
      return lastSlashIndex >= 0 ? readmeFilePath.substring(0, lastSlashIndex) : "";
    }
    return currentPath;
  }, [readmeFilePath, currentPath]);

  const scheduleScrollToTop = useCallback((): void => {
    pendingScrollRef.current = true;

    if (pendingScrollTimerRef.current !== null) {
      window.clearTimeout(pendingScrollTimerRef.current);
      pendingScrollTimerRef.current = null;
    }

    pendingScrollTimerRef.current = window.setTimeout(() => {
      pendingScrollTimerRef.current = null;
      if (!pendingScrollRef.current) {
        return;
      }
      pendingScrollRef.current = false;
      void scroll.scrollToTop();
    }, 1000);
  }, []);

  const handleReadmeRenderComplete = useCallback((): void => {
    if (!pendingScrollRef.current) {
      return;
    }

    pendingScrollRef.current = false;

    if (pendingScrollTimerRef.current !== null) {
      window.clearTimeout(pendingScrollTimerRef.current);
      pendingScrollTimerRef.current = null;
    }

    void scroll.scrollToTop();
  }, []);

  React.useEffect(() => {
    return () => {
      if (pendingScrollTimerRef.current !== null) {
        window.clearTimeout(pendingScrollTimerRef.current);
      }
    };
  }, []);

  // 处理内部链接点击
  const handleInternalLinkClick = useCallback(
    (relativePath: string) => {
      // 解析相对路径
      let targetPath = relativePath.trim();
      if (targetPath.length === 0) {
        return;
      }

      const hashIndex = targetPath.indexOf("#");
      if (hashIndex >= 0) {
        targetPath = targetPath.slice(0, hashIndex);
      }

      const queryIndex = targetPath.indexOf("?");
      if (queryIndex >= 0) {
        targetPath = targetPath.slice(0, queryIndex);
      }

      const isAbsolutePath = targetPath.startsWith("/");

      // 移除开头的 ./
      if (targetPath.startsWith("./")) {
        targetPath = targetPath.substring(2);
      }

      // 处理 ../ 路径
      const baseParts = isAbsolutePath
        ? []
        : currentReadmeDir.length > 0
          ? currentReadmeDir.split("/")
          : [];
      if (isAbsolutePath) {
        targetPath = targetPath.substring(1);
      }
      const targetParts = targetPath.split("/");

      const resolvedParts = [...baseParts];
      for (const part of targetParts) {
        if (part === "..") {
          resolvedParts.pop();
        } else if (part !== "." && part !== "") {
          resolvedParts.push(part);
        }
      }

      const resolvedPath = resolvedParts.join("/");
      logger.debug(`内部链接导航: ${relativePath} -> ${resolvedPath}`);

      // 尝试找到对应的文件项
      const fileItem = findFileItemByPath(resolvedPath);

      if (fileItem !== undefined) {
        // 如果找到了文件项，根据类型进行处理
        if (fileItem.type === "dir") {
          navigateTo(resolvedPath, "forward");
        } else {
          // 文件类型，打开预览
          void selectFile(fileItem);
        }
      } else {
        // 如果在当前目录内容中找不到，尝试直接导航
        // 判断是否可能是目录（没有扩展名或特定的目录标识）
        const hasExtension = /\.[^/]+$/.test(resolvedPath);
        if (!hasExtension) {
          // 可能是目录，尝试导航
          navigateTo(resolvedPath, "forward");
        } else {
          // 可能是其他目录中的文件，导航到其父目录
          const lastSlashIdx = resolvedPath.lastIndexOf("/");
          const parentPath = lastSlashIdx >= 0 ? resolvedPath.substring(0, lastSlashIdx) : "";
          navigateTo(parentPath, "forward");
          logger.info(`文件不在当前目录，导航到父目录: ${parentPath}`);
        }
      }

      scheduleScrollToTop();
    },
    [currentReadmeDir, findFileItemByPath, navigateTo, selectFile, scheduleScrollToTop],
  );

  if (!hasReadmeFile) {
    return null;
  }

  const hasReadmeContent = typeof readmeContent === "string" && readmeContent.trim().length > 0;
  const shouldShowReadmeSkeleton = !hasReadmeContent && (!readmeLoaded || loadingReadme);

  return (
    <AnimatePresence mode="wait">
      {!isTransitioning && (
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 0.96,
            transition: {
              duration: 0.125,
              ease: [0.4, 0, 0.2, 1],
            },
          }}
          style={{ width: "100%" }}
        >
          <Box
            className="readme-container"
            sx={{
              position: "relative",
              width: "100%",
              mb: 4,
              display: "flex",
              flexDirection: "column",
            }}
            data-oid="0zc9q5:"
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 2,
                display: "flex",
                alignItems: "center",
                color: "text.primary",
              }}
              data-oid="iawc_6m"
            />

            {shouldShowReadmeSkeleton ? (
              <MarkdownPreviewSkeleton isSmallScreen={isSmallScreen} data-oid="readme-skeleton" />
            ) : hasReadmeContent ? (
              <LazyMarkdownPreview
                readmeContent={readmeContent}
                loadingReadme={false}
                isSmallScreen={isSmallScreen}
                lazyLoad={false}
                currentBranch={currentBranch}
                previewingItem={readmeFileItem}
                onInternalLinkClick={handleInternalLinkClick}
                onRenderComplete={handleReadmeRenderComplete}
                data-oid="6nohd:r"
              />
            ) : readmeLoaded ? (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  px: { xs: 2, sm: 3, md: 4 },
                  py: { xs: 2, sm: 3 },
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
                data-oid="readme-empty"
              >
                {t("ui.readme.empty")}
              </Typography>
            ) : null}
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(ReadmeSection);
