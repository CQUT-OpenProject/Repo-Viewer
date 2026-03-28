import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Box } from "@mui/material";
import { List, useListCallbackRef } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
import AlphabetIndex from "./AlphabetIndex";
import { RowComponent } from "./FileListRow";
import { FILE_ITEM_CONFIG, LIST_HEIGHT_CONFIG } from "./utils/fileListConfig";
import { calculateLayoutMetrics, getListPadding, getRowMetrics } from "./utils/fileListLayout";
import type { VirtualListItemData, FileListLayoutMetrics } from "./utils/types";
import type { GitHubContent } from "@/types";
import { theme } from "@/utils";
import { useOptimizedScroll } from "@/hooks/useScroll";

/**
 * 文件列表组件属性接口
 */
interface FileListProps {
  contents: GitHubContent[];
  isSmallScreen: boolean;
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  handleItemClick: (item: GitHubContent) => void;
  handleDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleFolderDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleCancelDownload: (e: React.MouseEvent) => void;
  currentPath: string;
  hasReadmePreview?: boolean;
  isPreviewActive?: boolean;
}

/**
 * 文件列表组件
 *
 * 显示文件和文件夹列表，支持虚拟化滚动、动画和下载功能。
 * 自动根据内容数量选择普通或虚拟化渲染模式。
 */
const FileList = React.memo<FileListProps>(
  ({
    contents,
    isSmallScreen,
    downloadingPath,
    downloadingFolderPath,
    folderDownloadProgress,
    handleItemClick,
    handleDownloadClick,
    handleFolderDownloadClick,
    handleCancelDownload,
    currentPath,
    hasReadmePreview = false,
    isPreviewActive = false,
  }) => {
    const {
      isScrolling,
      scrollSpeed,
      handleScroll: handleScrollEvent,
    } = useOptimizedScroll({
      maxSamples: 5,
      scrollEndDelay: 1000,
      fastScrollThreshold: 0.3,
    });

    const [listApi, setListApi] = useListCallbackRef(null);
    const [showAlphabetIndex, setShowAlphabetIndex] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(null);
    const highlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const visibleAlphabetIndex = showAlphabetIndex && !isPreviewActive;

    // 计算每个文件项的高度（包括间距）
    // 这个计算需要与 FileListItem 的实际高度保持一致
    const { rowHeight, rowPaddingBottom } = useMemo(() => {
      return getRowMetrics(isSmallScreen);
    }, [isSmallScreen]);

    /**
     * 滚动到指定索引的文件
     */
    const handleScrollToIndex = useCallback(
      (index: number) => {
        if (listApi !== null) {
          listApi.scrollToRow({
            index,
            align: "start",
            behavior: "smooth",
          });

          setHighlightedIndex(index);

          if (highlightTimeoutRef.current !== null) {
            clearTimeout(highlightTimeoutRef.current);
          }

          highlightTimeoutRef.current = setTimeout(() => {
            setHighlightedIndex(null);
          }, 1500);
        }
      },
      [listApi],
    );

    // 清理定时器
    React.useEffect(() => {
      return () => {
        if (highlightTimeoutRef.current !== null) {
          clearTimeout(highlightTimeoutRef.current);
        }
      };
    }, []);

    // 计算悬停效果所需的额外空间
    const hoverExtraSpace = useMemo((): number => {
      // 悬停时阴影所需的额外空间
      const shadowSpace = isSmallScreen
        ? FILE_ITEM_CONFIG.hover.shadowSpace.xs
        : FILE_ITEM_CONFIG.hover.shadowSpace.sm;

      // 悬停时可能的垂直位移
      const verticalOffset = FILE_ITEM_CONFIG.hover.verticalOffset;

      // 计算总的额外空间
      return shadowSpace + verticalOffset;
    }, [isSmallScreen]);

    // 判断是否为少量文件
    const hasFewItems = contents.length <= LIST_HEIGHT_CONFIG.veryFewItemsThreshold;

    // 确定容器内边距
    const containerPadding = hasFewItems
      ? LIST_HEIGHT_CONFIG.containerPadding.few
      : LIST_HEIGHT_CONFIG.containerPadding.normal;

    const [viewportHeight, setViewportHeight] = useState<number | null>(() => {
      if (typeof window === "undefined") {
        return null;
      }
      return window.innerHeight;
    });

    const layoutMetrics = useMemo(
      (): FileListLayoutMetrics =>
        calculateLayoutMetrics({
          fileCount: contents.length,
          rowHeight,
          isSmallScreen,
          hasReadmePreview,
          hoverExtraSpace,
          viewportHeight,
        }),
      [
        contents.length,
        rowHeight,
        isSmallScreen,
        hasReadmePreview,
        hoverExtraSpace,
        viewportHeight,
      ],
    );
    const { height: availableHeight, needsScrolling } = layoutMetrics;

    // 监听窗口大小变化
    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      let rafId: number | null = null;

      const handleResize = (): void => {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
        }
        rafId = window.requestAnimationFrame(() => {
          setViewportHeight(window.innerHeight);
        });
      };

      window.addEventListener("resize", handleResize);

      return () => {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
        }
        window.removeEventListener("resize", handleResize);
      };
    }, []);

    // 仅当相关数据变化时才更新列表项数据
    const itemData = useMemo(
      (): VirtualListItemData => ({
        contents,
        downloadingPath,
        downloadingFolderPath,
        folderDownloadProgress,
        handleItemClick,
        handleDownloadClick,
        handleFolderDownloadClick,
        handleCancelDownload,
        currentPath,
        isScrolling,
        scrollSpeed,
        highlightedIndex,
        rowPaddingBottom,
      }),
      [
        contents,
        downloadingPath,
        downloadingFolderPath,
        folderDownloadProgress,
        handleItemClick,
        handleDownloadClick,
        handleFolderDownloadClick,
        handleCancelDownload,
        currentPath,
        isScrolling,
        scrollSpeed,
        highlightedIndex,
        rowPaddingBottom,
      ],
    );

    // 简化的列表内边距计算
    // 列表内边距规则集中管理，区分滚动与非滚动模式。
    const listPadding = useMemo(
      (): { paddingTop: number; paddingBottom: number } =>
        getListPadding(needsScrolling, isSmallScreen),
      [needsScrolling, isSmallScreen],
    );

    // 处理滚动事件（监听列表容器）
    React.useEffect(() => {
      const element = listApi?.element ?? null;
      if (element === null) {
        return;
      }

      const handleScroll = (): void => {
        handleScrollEvent(element.scrollTop);
      };

      element.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        element.removeEventListener("scroll", handleScroll);
      };
    }, [handleScrollEvent, listApi]);

    // 简化的虚拟列表样式
    const virtualListStyle = useMemo((): React.CSSProperties => {
      return {
        overflowX: "hidden" as const,
        overflowY: needsScrolling ? ("auto" as const) : ("hidden" as const),
        ...listPadding,
      };
    }, [needsScrolling, listPadding]);

    const containerStyle = {
      width: "100%",
      bgcolor: "background.paper",
      borderRadius: theme.responsiveG3Styles.fileListContainer(isSmallScreen),
      mb: 2,
      overflow: "hidden",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
      border: "1px solid",
      borderColor: "divider",
      position: "relative" as const,
      zIndex: 1,
    };

    if (!needsScrolling) {
      const totalContentHeight = contents.length * rowHeight;
      const finalHeight = totalContentHeight + listPadding.paddingTop + listPadding.paddingBottom;

      return (
        <Box
          sx={{
            ...containerStyle,
            height: finalHeight,
            p: containerPadding,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className={`file-list-container ${hasFewItems ? "few-items" : ""} no-scroll`}
          role="list"
          aria-label={`文件列表，共 ${String(contents.length)} 项`}
        >
          <Box
            style={{
              width: "100%",
              paddingTop: listPadding.paddingTop,
              paddingBottom: listPadding.paddingBottom,
            }}
            key={currentPath}
            className="file-list-fade-in"
          >
            {contents.map((item, index) => (
              <div key={`${item.name}-${String(index)}`} style={{ height: rowHeight }}>
                <RowComponent
                  index={index}
                  style={{ height: rowHeight }}
                  ariaAttributes={{
                    role: "listitem",
                    "aria-posinset": index + 1,
                    "aria-setsize": contents.length,
                  }}
                  {...itemData}
                />
              </div>
            ))}
          </Box>
        </Box>
      );
    }

    // 滚动模式：使用虚拟化
    return (
      <Box
        sx={{
          position: "relative",
        }}
      >
        <Box
          sx={{
            ...containerStyle,
            height: availableHeight,
            pl: { xs: 0.5, sm: 1.0 },
            py: containerPadding,
          }}
          className={`file-list-container ${hasFewItems ? "few-items" : ""}`}
          role="list"
          aria-label={`文件列表，共 ${String(contents.length)} 项`}
        >
          <Box
            style={{ height: "100%", width: "100%" }}
            key={currentPath}
            className="file-list-fade-in"
          >
            <AutoSizer
              renderProp={({ width, height }) => {
                if (width === undefined || height === undefined) {
                  return null;
                }

                return (
                  <List
                    listRef={setListApi}
                    rowCount={contents.length}
                    rowHeight={rowHeight}
                    rowProps={itemData}
                    rowComponent={RowComponent}
                    style={{ ...virtualListStyle, height, width }}
                    overscanCount={10}
                    className={`virtual-file-list ${isScrolling ? "is-scrolling" : ""}`}
                  />
                );
              }}
            />
          </Box>
        </Box>

        {/* 右侧悬停触发区域 */}
        <Box
          sx={{
            position: "absolute",
            right: { xs: -32, sm: -36 },
            top: 0,
            bottom: 0,
            width: { xs: 60, sm: 64 },
            zIndex: 5,
            cursor: "default",
            // 预览时禁用指针事件
            pointerEvents: isPreviewActive ? "none" : "auto",
            // 预览时完全隐藏（不占用空间）
            display: isPreviewActive ? "none" : "block",
          }}
          onMouseEnter={() => {
            setShowAlphabetIndex(true);
          }}
          onMouseLeave={() => {
            setShowAlphabetIndex(false);
          }}
        >
          {/* 字母索引 */}
          <AlphabetIndex
            contents={contents}
            onScrollToIndex={handleScrollToIndex}
            visible={visibleAlphabetIndex}
          />
        </Box>
      </Box>
    );
  },
);

FileList.displayName = "FileList";

export default FileList;
