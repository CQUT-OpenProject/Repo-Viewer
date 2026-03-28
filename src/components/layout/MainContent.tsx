import React, { useMemo, useEffect, useState } from "react";
import { Container, useTheme, useMediaQuery, Box, Portal } from "@mui/material";
import BreadcrumbNavigation from "@/components/layout/BreadcrumbNavigation";
import FileList from "@/components/file/FileList";
import FilePreviewPage from "@/components/layout/FilePreviewPage";
import { preloadPreviewComponents } from "@/utils/lazy-loading";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import { useContentContext, usePreviewContext, useDownloadContext } from "@/contexts/unified";
import { FileListSkeleton } from "@/components/ui/skeletons";
import DynamicSEO from "@/components/seo/DynamicSEO";
import ScrollToTopFab from "@/components/interactions/ScrollToTopFab";
import EmptyState from "@/components/ui/EmptyState";
import ReadmeSection from "@/components/layout/ReadmeSection";
import PreviewOverlay from "@/components/layout/PreviewOverlay";
import {
  useImageNavigation,
  useBreadcrumbLayout,
  usePreviewFromUrl,
} from "@/components/layout/hooks";
import type { NavigationDirection } from "@/contexts/unified";
import type { BreadcrumbSegment, GitHubContent } from "@/types";

/**
 * 主内容区组件属性接口
 */
interface MainContentProps {
  showBreadcrumbInToolbar: boolean;
}

/**
 * 主内容区组件
 *
 * 应用的主要内容区域，包含面包屑导航、文件列表、预览功能等。
 * 自动处理URL参数和内容加载。
 */
const MainContent: React.FC<MainContentProps> = ({ showBreadcrumbInToolbar }) => {
  // 获取主题和响应式布局
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // 从上下文获取数据和方法
  const {
    currentPath,
    contents,
    readmeContent,
    loading,
    loadingReadme,
    readmeLoaded,
    error,
    handleRetry,
    navigateTo,
    repoOwner,
    repoName,
    currentBranch,
  } = useContentContext();

  const { previewState, selectFile, closePreview } = usePreviewContext();

  const { downloadState, downloadFile, downloadFolder, cancelDownload } = useDownloadContext();

  // 获取当前目录中的 README 文件，用于统一 Markdown 渲染逻辑
  const readmeFileItem = useMemo<GitHubContent | null>(() => {
    const target = contents.find((item) => {
      if (item.type !== "file") {
        return false;
      }
      const fileName = item.name.toLowerCase();
      return ["readme.md", "readme.markdown", "readme.mdown"].includes(fileName);
    });

    return target ?? null;
  }, [contents]);

  const hasReadmeFile = readmeFileItem !== null;

  // 检查是否正在全屏预览 README
  const isPreviewingReadme = useMemo(() => {
    if (previewState.previewingItem === null || readmeFileItem === null) {
      return false;
    }
    // 比较文件路径来判断是否是同一个 README 文件
    return previewState.previewingItem.path === readmeFileItem.path;
  }, [previewState.previewingItem, readmeFileItem]);

  // 检查是否有任何预览活动（Markdown 或图片）
  const isPreviewActive = useMemo(() => {
    return previewState.previewingItem !== null || previewState.previewingImageItem !== null;
  }, [previewState.previewingItem, previewState.previewingImageItem]);

  // 获取当前目录中的所有图片文件
  const imageFiles = useMemo(() => {
    return contents.filter((item) => {
      if (item.type !== "file") {
        return false;
      }
      const fileName = item.name.toLowerCase();
      return ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].some((ext) =>
        fileName.endsWith(`.${ext}`),
      );
    });
  }, [contents]);

  // 使用图片导航 Hook
  const {
    hasPrevious: hasPreviousImage,
    hasNext: hasNextImage,
    handlePreviousImage,
    handleNextImage,
  } = useImageNavigation({
    imageFiles,
    currentPreviewingImage: previewState.previewingImageItem,
    onSelectFile: selectFile,
  });

  const showPreviewPage =
    previewState.previewingItem !== null &&
    previewState.previewType !== null &&
    previewState.previewContent !== null;

  // 生成面包屑导航路径段
  const breadcrumbSegments = useMemo(() => {
    const segments: BreadcrumbSegment[] = [{ name: "Home", path: "" }];

    const normalizedPath = currentPath.trim();
    if (normalizedPath === "") {
      return segments;
    }

    const pathParts = normalizedPath.split("/").filter(Boolean);

    pathParts.reduce((accPath, part) => {
      const segmentPath = accPath !== "" ? `${accPath}/${part}` : part;
      segments.push({ name: part, path: segmentPath });
      return segmentPath;
    }, "");

    return segments;
  }, [currentPath]);

  const isHomePage = breadcrumbSegments.length <= 1;
  const shouldShowInToolbar = showBreadcrumbInToolbar && !isHomePage;
  const [toolbarBreadcrumbContainer, setToolbarBreadcrumbContainer] =
    useState<HTMLDivElement | null>(null);

  // 使用面包屑布局 Hook
  const { breadcrumbsMaxItems, breadcrumbsContainerRef } = useBreadcrumbLayout({
    breadcrumbSegments,
    isSmallScreen,
  });

  // 处理面包屑点击
  const handleBreadcrumbClick = (
    path: string,
    direction: NavigationDirection = "backward",
  ): void => {
    // 如果有正在预览的文件，直接关闭预览
    const previewingItem = previewState.previewingItem ?? previewState.previewingImageItem;
    if (previewingItem !== null) {
      closePreview();
    }

    navigateTo(path, direction);
  };

  // 处理文件/文件夹点击
  const handleItemClick = (item: GitHubContent): void => {
    if (item.type === "dir") {
      navigateTo(item.path, "forward");
      return;
    }

    void selectFile(item);
  };

  // 处理下载点击
  const handleDownloadClick = (e: React.MouseEvent, item: GitHubContent): void => {
    e.preventDefault();
    e.stopPropagation();
    void downloadFile(item);
  };

  // 处理文件夹下载点击
  const handleFolderDownloadClick = (e: React.MouseEvent, item: GitHubContent): void => {
    e.preventDefault();
    e.stopPropagation();
    void downloadFolder(item.path, item.name);
  };

  // 处理取消下载点击
  const handleCancelDownload = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    cancelDownload();
  };

  // 使用 URL 预览加载 Hook
  usePreviewFromUrl({
    contents,
    loading,
    error,
    previewingItem: previewState.previewingItem,
    previewingImageItem: previewState.previewingImageItem,
    onSelectFile: selectFile,
  });

  // 在内容加载完成后预加载预览组件
  useEffect(() => {
    if (loading) {
      return;
    }

    if (error !== null) {
      return;
    }

    if (contents.length === 0) {
      return;
    }

    // 使用空闲时间预加载预览组件
    preloadPreviewComponents();
  }, [loading, error, contents]);

  // 获取当前文件或目录的信息用于SEO
  const seoInfo = useMemo(() => {
    // 如果正在预览文件，使用文件信息
    if (previewState.previewingItem !== null) {
      return {
        title: previewState.previewingItem.name,
        filePath: previewState.previewingItem.path,
        isDirectory: false,
        fileType: previewState.previewingItem.name.split(".").pop() ?? "",
      };
    } else if (previewState.previewingImageItem !== null) {
      return {
        title: previewState.previewingImageItem.name,
        filePath: previewState.previewingImageItem.path,
        isDirectory: false,
        fileType: "Image",
      };
    }

    // 否则使用当前目录信息
    return {
      title: currentPath.trim().length > 0 ? (currentPath.split("/").pop() ?? "根目录") : "根目录",
      filePath: currentPath,
      isDirectory: true,
      fileType: "",
    };
  }, [currentPath, previewState.previewingItem, previewState.previewingImageItem]);

  // 吸顶切换时在 effect 阶段重新解析容器，避免渲染阶段拿到空节点
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const container = document.getElementById("toolbar-breadcrumb-container");
    setToolbarBreadcrumbContainer(container as HTMLDivElement | null);
  }, [showBreadcrumbInToolbar]);

  // 渲染面包屑导航组件
  const breadcrumbNavigation = (
    <BreadcrumbNavigation
      breadcrumbSegments={breadcrumbSegments}
      handleBreadcrumbClick={handleBreadcrumbClick}
      breadcrumbsMaxItems={breadcrumbsMaxItems}
      isSmallScreen={isSmallScreen}
      breadcrumbsContainerRef={breadcrumbsContainerRef as React.RefObject<HTMLDivElement>}
      compact={false}
      data-oid="c02a2p5"
    />
  );

  // 紧凑模式的面包屑（用于顶部栏）
  const compactBreadcrumbNavigation = (
    <BreadcrumbNavigation
      breadcrumbSegments={breadcrumbSegments}
      handleBreadcrumbClick={handleBreadcrumbClick}
      breadcrumbsMaxItems={breadcrumbsMaxItems}
      isSmallScreen={isSmallScreen}
      breadcrumbsContainerRef={breadcrumbsContainerRef as React.RefObject<HTMLDivElement>}
      compact={true}
      data-oid="c02a2p5-compact"
    />
  );

  return (
    <Container
      component="main"
      sx={{
        flexGrow: 1,
        py: 4,
        width: "100%",
      }}
      data-oid="7powvvf"
    >
      {/* 动态SEO组件 */}
      <DynamicSEO
        title={seoInfo.title}
        filePath={seoInfo.filePath}
        isDirectory={seoInfo.isDirectory}
        fileType={seoInfo.fileType}
        repoOwner={repoOwner}
        repoName={repoName}
        data-oid="8ov3blv"
      />

      {/* 面包屑导航 */}
      {shouldShowInToolbar && toolbarBreadcrumbContainer !== null ? (
        <Portal container={toolbarBreadcrumbContainer}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              animation: "slideUpFadeIn 0.3s ease-out",
              "@keyframes slideUpFadeIn": {
                from: { opacity: 0, transform: "translateY(10px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            {compactBreadcrumbNavigation}
          </Box>
        </Portal>
      ) : null}

      {!showPreviewPage && (
        <Box
          sx={{
            opacity: shouldShowInToolbar ? 0 : 1,
            transform: shouldShowInToolbar ? "translateY(-20px)" : "translateY(0)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: shouldShowInToolbar ? "none" : "auto",
          }}
        >
          {breadcrumbNavigation}
        </Box>
      )}

      {showPreviewPage ? (
        <FilePreviewPage
          previewState={previewState}
          onClose={closePreview}
          isSmallScreen={isSmallScreen}
          currentBranch={currentBranch}
          breadcrumbSegments={breadcrumbSegments}
          breadcrumbsMaxItems={breadcrumbsMaxItems}
          handleBreadcrumbClick={handleBreadcrumbClick}
          breadcrumbsContainerRef={breadcrumbsContainerRef as React.RefObject<HTMLDivElement>}
          shouldShowInToolbar={shouldShowInToolbar}
          hasPreviousImage={hasPreviousImage}
          hasNextImage={hasNextImage}
          onPreviousImage={handlePreviousImage}
          onNextImage={handleNextImage}
        />
      ) : loading ? (
        <FileListSkeleton isSmallScreen={isSmallScreen} itemCount={8} data-oid="-mkjng2" />
      ) : error !== null ? (
        <ErrorDisplay
          errorMessage={error}
          onRetry={handleRetry}
          isSmallScreen={isSmallScreen}
          data-oid="j0jgapo"
        />
      ) : contents.length === 0 ? (
        <EmptyState type="empty-directory" onAction={handleRetry} isSmallScreen={isSmallScreen} />
      ) : (
        <>
          <FileList
            contents={contents}
            isSmallScreen={isSmallScreen}
            downloadingPath={downloadState.downloadingPath}
            downloadingFolderPath={downloadState.downloadingFolderPath}
            folderDownloadProgress={downloadState.folderDownloadProgress}
            handleItemClick={handleItemClick}
            handleDownloadClick={handleDownloadClick}
            handleFolderDownloadClick={handleFolderDownloadClick}
            handleCancelDownload={handleCancelDownload}
            currentPath={currentPath}
            hasReadmePreview={hasReadmeFile}
            isPreviewActive={isPreviewActive}
            data-oid="_qfxtvv"
          />

          {/* README 自动预览区域（仅在未全屏预览时显示） */}
          <ReadmeSection
            hasReadmeFile={hasReadmeFile}
            readmeContent={readmeContent}
            loadingReadme={loadingReadme}
            readmeLoaded={readmeLoaded}
            isSmallScreen={isSmallScreen}
            currentBranch={currentBranch}
            readmeFileItem={readmeFileItem}
            isTransitioning={isPreviewingReadme}
          />

          {/* Markdown 和图片全屏预览覆盖层 */}
          <PreviewOverlay
            previewingItem={previewState.previewingItem}
            previewContent={previewState.previewContent}
            loadingPreview={previewState.loadingPreview}
            previewingImageItem={previewState.previewingImageItem}
            imagePreviewUrl={previewState.imagePreviewUrl}
            hasPreviousImage={hasPreviousImage}
            hasNextImage={hasNextImage}
            onPreviousImage={handlePreviousImage}
            onNextImage={handleNextImage}
            isSmallScreen={isSmallScreen}
            currentBranch={currentBranch}
            onClose={closePreview}
          />
        </>
      )}

      {/* 返回顶部浮动操作按钮 */}
      <ScrollToTopFab />
    </Container>
  );
};

export default MainContent;
