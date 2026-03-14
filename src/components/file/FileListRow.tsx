/**
 * 文件列表行组件模块
 *
 * 提供虚拟列表的行渲染组件，用于文件列表的每一行。
 * 集成动画效果和性能优化，支持动态高度和滚动优化。
 */

import type { CSSProperties, ReactElement } from "react";
import { motion } from "framer-motion";
import type { MotionStyle } from "framer-motion";
import type { RowComponentProps } from "react-window";

import FileListItem from "./FileListItem";
import { getDynamicItemVariants, optimizedAnimationStyle } from "./utils/fileListAnimations";
import type { VirtualListItemData } from "./utils/types";

/**
 * 文件列表行组件
 *
 * react-window虚拟列表的行渲染组件，负责渲染单个文件项。
 * 包含动画效果和滚动性能优化。
 *
 * @param props - react-window提供的行组件属性
 * @returns 渲染的文件列表行元素
 */
const RowComponent = ({
  ariaAttributes,
  index,
  style,
  ...rowData
}: RowComponentProps<VirtualListItemData>): ReactElement => {
  const {
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
  } = rowData;

  const item = contents[index];

  if (item === undefined) {
    return <div style={style} {...ariaAttributes} aria-hidden="true" />;
  }

  const isHighlighted = highlightedIndex === index;

  const adjustedStyle: CSSProperties = {
    ...style,
    boxSizing: "border-box",
    alignItems: "flex-start",
  };

  const innerStyle: MotionStyle = {
    height: "100%",
    width: "100%",
    paddingTop: 0,
    paddingBottom: rowPaddingBottom,
    paddingRight: "12px",
    boxSizing: "border-box",
    ...optimizedAnimationStyle,
  };

  const currentVariants = getDynamicItemVariants(scrollSpeed, isScrolling);

  return (
    <div
      style={adjustedStyle}
      className="file-list-item-container"
      {...ariaAttributes}
      data-oid="_c:db-1"
    >
      <motion.div
        style={innerStyle}
        variants={currentVariants}
        custom={index}
        initial="hidden"
        animate="visible"
      >
        <FileListItem
          key={item.path}
          item={item}
          downloadingPath={downloadingPath}
          downloadingFolderPath={downloadingFolderPath}
          folderDownloadProgress={folderDownloadProgress}
          handleItemClick={handleItemClick}
          handleDownloadClick={handleDownloadClick}
          handleFolderDownloadClick={handleFolderDownloadClick}
          handleCancelDownload={handleCancelDownload}
          currentPath={currentPath}
          contents={contents}
          isHighlighted={isHighlighted}
          data-oid="k4zj3qr"
        />
      </motion.div>
    </div>
  );
};

export { RowComponent };
