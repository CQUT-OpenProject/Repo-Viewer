import React, { memo } from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  Typography,
  Box,
  Tooltip,
  IconButton,
  CircularProgress,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Folder as FolderIcon,
  Description as DefaultFileIcon,
  Download as DownloadIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { logger, theme as themeUtils } from "@/utils";
import { fileExtensionIcons } from "@/utils/files/fileHelpers";
import type { GitHubContent } from "@/types";
import { getFeaturesConfig } from "@/config";
import { useI18n } from "@/contexts/I18nContext";

const featuresConfig = getFeaturesConfig();
const HOMEPAGE_FILTER_ENABLED = featuresConfig.homepageFilter.enabled;
const HOMEPAGE_ALLOWED_FOLDERS = featuresConfig.homepageFilter.allowedFolders;
const HIDE_MAIN_FOLDER_DOWNLOAD = featuresConfig.hideDownload.enabled;
const HIDE_DOWNLOAD_FOLDERS = featuresConfig.hideDownload.hiddenFolders;

/**
 * 文件列表项组件属性接口
 */
interface FileListItemProps {
  item: GitHubContent;
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  handleItemClick: (item: GitHubContent) => void;
  handleDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleFolderDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleCancelDownload: (e: React.MouseEvent) => void;
  currentPath: string;
  contents?: GitHubContent[];
  isHighlighted?: boolean;
  isVisible?: boolean;
}

/**
 * 自定义比较函数
 *
 * 优化渲染性能：只在必要的 props 变化时才重新渲染。
 */
function arePropsEqual(prevProps: FileListItemProps, nextProps: FileListItemProps): boolean {
  // 使用 sha 来判断 item 是否变化（更可靠）
  const itemUnchanged =
    prevProps.item.sha === nextProps.item.sha &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.type === nextProps.item.type;

  // 检查下载状态
  const downloadStateUnchanged =
    prevProps.downloadingPath === nextProps.downloadingPath &&
    prevProps.downloadingFolderPath === nextProps.downloadingFolderPath &&
    prevProps.folderDownloadProgress === nextProps.folderDownloadProgress;

  // 检查路径
  const pathUnchanged = prevProps.currentPath === nextProps.currentPath;

  // 检查回调函数（如果使用 useCallback，这些应该是稳定的）
  const callbacksUnchanged =
    prevProps.handleItemClick === nextProps.handleItemClick &&
    prevProps.handleDownloadClick === nextProps.handleDownloadClick &&
    prevProps.handleFolderDownloadClick === nextProps.handleFolderDownloadClick &&
    prevProps.handleCancelDownload === nextProps.handleCancelDownload;

  // 检查 contents 长度（用于涟漪效果优化）
  const contentsLengthUnchanged =
    (prevProps.contents?.length ?? 0) === (nextProps.contents?.length ?? 0);

  // 检查高亮状态
  const highlightUnchanged = prevProps.isHighlighted === nextProps.isHighlighted;

  // 检查可见性状态
  const visibilityUnchanged = prevProps.isVisible === nextProps.isVisible;

  // 所有关键 props 都未变化时返回 true（不重新渲染）
  return (
    itemUnchanged &&
    downloadStateUnchanged &&
    pathUnchanged &&
    callbacksUnchanged &&
    contentsLengthUnchanged &&
    highlightUnchanged &&
    visibilityUnchanged
  );
}

/**
 * 文件列表项组件
 *
 * 显示单个文件或文件夹，包含图标、名称和下载功能。
 * 支持下载进度显示和取消操作。
 *
 * 使用自定义比较函数优化渲染性能，避免不必要的重新渲染。
 */
const FileListItem = memo<FileListItemProps>(
  ({
    item,
    downloadingPath,
    downloadingFolderPath,
    folderDownloadProgress,
    handleItemClick,
    handleDownloadClick,
    handleFolderDownloadClick,
    handleCancelDownload,
    currentPath,
    contents = [], // 提供默认空数组值
    isHighlighted = false,
    isVisible = true, // 默认可见
  }) => {
    const theme = useTheme();
    const { t } = useI18n();
    const [isHoveringDownload, setIsHoveringDownload] = React.useState(false);
    const [hoverCount, setHoverCount] = React.useState(0);

    const isDownloading = downloadingPath === item.path;
    const isFolderDownloading = downloadingFolderPath === item.path;
    const isItemDownloading = isDownloading || isFolderDownloading;

    // 当下载状态改变时重置悬停计数
    React.useEffect(() => {
      if (!isItemDownloading) {
        setHoverCount(0);
        setIsHoveringDownload(false);
      }
    }, [isItemDownloading]);

    const IconComponent = React.useMemo(() => {
      if (item.type === "dir") {
        return FolderIcon;
      }

      const extension = item.name.split(".").pop()?.toLowerCase();
      if (typeof extension === "string" && extension.length > 0) {
        const icon = fileExtensionIcons[extension];
        if (icon !== undefined) {
          return icon;
        }
      }

      return DefaultFileIcon;
    }, [item.type, item.name]);

    // 检查是否是首页文件夹（用于显示过滤）
    const isMainFolder =
      currentPath === "" &&
      item.type === "dir" &&
      HOMEPAGE_FILTER_ENABLED &&
      HOMEPAGE_ALLOWED_FOLDERS.includes(item.name);

    // 检查是否需要隐藏下载按钮
    const shouldHideDownloadButton = React.useMemo(() => {
      return (
        currentPath === "" &&
        item.type === "dir" &&
        HIDE_MAIN_FOLDER_DOWNLOAD &&
        HIDE_DOWNLOAD_FOLDERS.includes(item.name)
      );
    }, [currentPath, item.type, item.name]);

    // 调试信息
    React.useEffect(() => {
      if (import.meta.env.DEV) {
        if (currentPath === "" && item.type === "dir") {
          logger.debug(
            `首页文件夹 ${item.name}: 是主文件夹=${String(isMainFolder)}, 隐藏下载按钮=${String(shouldHideDownloadButton)}`,
          );
        }
      }
    }, [currentPath, item.type, item.name, isMainFolder, shouldHideDownloadButton]);

    // 判断是否禁用涟漪效果（针对大列表优化）
    const { disableRipple, disableTouchRipple } = React.useMemo(() => {
      const windowWidth = window.innerWidth;
      const contentLength = contents.length;
      return {
        disableRipple: windowWidth < 768 && contentLength > 50,
        disableTouchRipple: windowWidth < 768 && contentLength > 100,
      };
    }, [contents.length]);

    const handleFileItemClick = React.useCallback(() => {
      handleItemClick(item);
    }, [handleItemClick, item]);

    const handleFileDownloadClick = React.useCallback(
      (e: React.MouseEvent) => {
        handleDownloadClick(e, item);
      },
      [handleDownloadClick, item],
    );

    const handleFileFolderDownloadClick = React.useCallback(
      (e: React.MouseEvent) => {
        handleFolderDownloadClick(e, item);
      },
      [handleFolderDownloadClick, item],
    );

    const onCancelDownload = React.useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleCancelDownload(e);
      },
      [handleCancelDownload],
    );

    const handleDownloadMouseEnter = React.useCallback(() => {
      if (isItemDownloading) {
        setHoverCount((prev) => {
          const newCount = prev + 1;
          // 只有第二次及以后的悬停才显示取消图标
          if (newCount >= 2) {
            setIsHoveringDownload(true);
          }
          return newCount;
        });
      }
    }, [isItemDownloading]);

    const handleDownloadMouseLeave = React.useCallback(() => {
      setIsHoveringDownload(false);
    }, []);

    return (
      <ListItem
        disablePadding
        sx={{
          overflow: "visible",
          width: "100%",
          position: "relative",
          minHeight: { xs: "40px", sm: "48px" },
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          "&:hover .file-download-action": {
            opacity: 1,
            pointerEvents: "auto",
          },
          "& .MuiListItemButton-root.Mui-focusVisible ~ .MuiListItemSecondaryAction-root .file-download-action":
            {
              opacity: 1,
              pointerEvents: "auto",
            },
        }}
        secondaryAction={
          !shouldHideDownloadButton ? (
            <Tooltip
              title={
                isItemDownloading
                  ? hoverCount >= 2
                    ? t("ui.download.cancel")
                    : ""
                  : item.type === "file"
                    ? t("ui.download.file", { name: item.name })
                    : t("ui.download.folder", { name: item.name })
              }
              disableInteractive
              placement="left"
              enterDelay={isItemDownloading ? 0 : 300}
              leaveDelay={0}
              slotProps={{
                tooltip: {
                  sx: {
                    bgcolor: "background.paper",
                    color: "text.primary",
                    boxShadow: 3,
                    borderRadius: themeUtils.createG3BorderRadius(themeUtils.G3_PRESETS.tooltip),
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    fontWeight: 500,
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  },
                },
              }}
              data-oid="53unr1g"
            >
              <Box
                component="span"
                className="file-download-action"
                sx={{
                  display: "inline-flex",
                  cursor: "pointer",
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  opacity: {
                    xs: 1, // 移动端默认显示
                    sm: isItemDownloading ? 1 : 0, // 桌面端悬停显示
                  },
                  pointerEvents: {
                    xs: "auto", // 移动端始终可点击
                    sm: isItemDownloading ? "auto" : "none", // 桌面端悬停可点击
                  },
                  transition: "opacity 0.2s ease-in-out",
                }}
                onMouseEnter={handleDownloadMouseEnter}
                onMouseLeave={handleDownloadMouseLeave}
                data-oid="p5-7:mp"
              >
                <IconButton
                  className={isItemDownloading ? "cancel-button" : "download-button"}
                  edge="end"
                  aria-label={
                    isItemDownloading
                      ? "cancel download"
                      : item.type === "file"
                        ? "download file"
                        : "download folder"
                  }
                  onClick={
                    isItemDownloading
                      ? isHoveringDownload
                        ? onCancelDownload
                        : undefined
                      : item.type === "file"
                        ? handleFileDownloadClick
                        : handleFileFolderDownloadClick
                  }
                  {...(isVisible ? {} : { tabIndex: -1 })}
                  sx={{
                    position: "relative",
                    padding: { xs: 1, sm: 1.5 },
                    color: isItemDownloading ? "error.main" : "inherit",
                  }}
                  data-oid="bwl9ig-"
                >
                  {isItemDownloading ? (
                    <Box sx={{ position: "relative", display: "inline-flex" }} data-oid="02vmy6b">
                      <CircularProgress
                        size={20}
                        variant={
                          isFolderDownloading && folderDownloadProgress > 0
                            ? "determinate"
                            : "indeterminate"
                        }
                        value={folderDownloadProgress}
                        color="error"
                        data-oid="0oqwaa-"
                      />

                      {/* 第二次及以后悬停时显示取消图标 */}
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: "absolute",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: isHoveringDownload ? 1 : 0,
                          transition: "opacity 0.2s ease-in-out",
                          backgroundColor: isHoveringDownload
                            ? alpha(theme.palette.error.main, 0.1)
                            : "transparent",
                          borderRadius: "50%",
                          pointerEvents: isHoveringDownload ? "auto" : "none",
                        }}
                        data-oid="g-4-y6c"
                      >
                        <CancelIcon
                          fontSize="small"
                          sx={{
                            fontSize: "0.8rem",
                            color: "error.main",
                            transform: isHoveringDownload ? "scale(1)" : "scale(0.8)",
                            transition: "transform 0.2s ease-in-out",
                          }}
                          data-oid="6_m3uc-"
                        />
                      </Box>
                    </Box>
                  ) : (
                    <DownloadIcon fontSize="small" data-oid="9-.24f5" />
                  )}
                </IconButton>
              </Box>
            </Tooltip>
          ) : null
        }
        data-oid=".a2fg5_"
      >
        <ListItemButton
          onClick={handleFileItemClick}
          disabled={isDownloading || isFolderDownloading}
          disableRipple={disableRipple}
          disableTouchRipple={disableTouchRipple}
          {...(isVisible ? {} : { tabIndex: -1 })}
          sx={{
            borderRadius: themeUtils.createG3BorderRadius(themeUtils.G3_PRESETS.fileListItem),
            transition:
              "transform 0.1s ease-in-out, background-color 0.1s ease-in-out, box-shadow 0.1s ease-in-out",
            // 高亮状态样式（应用悬停效果）
            ...(isHighlighted && {
              transform: "translateX(3px)",
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              boxShadow: `-1px 2px 3px ${alpha(theme.palette.common.black, 0.1)}`,
            }),
            "&:hover": {
              transform: "translateX(3px)",
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
              boxShadow: `-1px 2px 3px ${alpha(theme.palette.common.black, 0.1)}`,
            },
            pr: { xs: 7, sm: 9 },
            py: { xs: 0.75, sm: 1.25 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            flex: 1,
            mx: "auto",
            position: "relative",
            willChange: "transform, background-color",
            transform: "translateZ(0)",
          }}
          data-oid="y0qdjig"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              minWidth: 0,
              py: { xs: 0.25, sm: 0.5 },
            }}
            data-oid=".58zkds"
          >
            <ListItemIcon
              sx={{
                minWidth: { xs: "32px", sm: "40px" },
                mt: "2px",
                mr: { xs: 1, sm: 1.5 },
              }}
              data-oid=":ewe_8t"
            >
              <IconComponent
                sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                data-oid="ekhgl12"
              />
            </ListItemIcon>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                fontWeight: 400,
                color: theme.palette.text.primary,
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
              data-oid="al5kw84"
            >
              {item.name}
            </Typography>
          </Box>
        </ListItemButton>
      </ListItem>
    );
  },
  arePropsEqual, // 使用自定义比较函数
);

FileListItem.displayName = "FileListItem";

export default FileListItem;
