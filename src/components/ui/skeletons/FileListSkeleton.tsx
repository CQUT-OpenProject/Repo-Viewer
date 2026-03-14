import React from "react";
import { Box, Skeleton, useTheme, List, ListItem, ListItemIcon } from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { getSkeletonStyles, getContainerTransitionStyles, useSkeletonVisibility } from "./shared";

/**
 * 文件列表骨架屏组件属性接口
 */
interface FileListSkeletonProps {
  itemCount?: number;
  isSmallScreen?: boolean;
  visible?: boolean;
  onExited?: () => void;
}

/**
 * 文件列表骨架屏组件
 *
 * 在文件列表加载时显示的占位骨架屏。
 */
export const FileListSkeleton: React.FC<FileListSkeletonProps> = ({
  itemCount = 10,
  isSmallScreen = false,
  visible = true,
  onExited,
}) => {
  const isExiting = useSkeletonVisibility(visible, onExited);
  const listBaseStyles = React.useMemo(
    () => ({
      width: "100%",
      bgcolor: "background.paper",
      borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
      mb: 2,
      overflow: "hidden",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
      border: "1px solid",
      borderColor: "divider",
      p: { xs: 1, sm: 2 },
    }),
    [],
  );

  return (
    <List sx={[listBaseStyles, getContainerTransitionStyles(isExiting)]} data-oid="jaa7p3i">
      {Array.from({ length: itemCount }, (_, index) => (
        <FileListItemSkeleton
          key={index}
          isSmallScreen={isSmallScreen}
          visible={visible}
          data-oid=".rgd-ue"
        />
      ))}
    </List>
  );
};

// 单个文件列表项骨架屏
interface FileListItemSkeletonProps {
  isSmallScreen?: boolean;
  visible?: boolean;
}

export const FileListItemSkeleton: React.FC<FileListItemSkeletonProps> = ({
  isSmallScreen = false,
  visible = true,
}) => {
  const theme = useTheme();
  const skeletonStyles = React.useMemo(() => getSkeletonStyles(theme), [theme]);
  const isExiting = useSkeletonVisibility(visible);
  const listItemBaseStyles = React.useMemo(
    () => ({
      mb: 0.6,
      "&:last-child": { mb: 0 },
      overflow: "visible",
      width: "100%",
      position: "relative",
      minHeight: { xs: "40px", sm: "48px" },
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
    }),
    [],
  );
  const itemContentBaseStyles = React.useMemo(
    () => ({
      borderRadius: g3BorderRadius(G3_PRESETS.fileListItem),
      py: { xs: 1, sm: 1.5 },
      pr: { xs: 6, sm: 8 },
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "flex-start", sm: "center" },
      flex: 1,
      mx: "auto",
      position: "relative",
      width: "100%",
      bgcolor: "transparent",
    }),
    [],
  );
  const itemContentInnerStyles = React.useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      width: "100%",
      minWidth: 0,
    }),
    [],
  );

  return (
    <ListItem
      disablePadding
      sx={[listItemBaseStyles, getContainerTransitionStyles(isExiting)]}
      secondaryAction={
        <Box
          sx={{
            display: "inline-block",
            cursor: "default",
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
          data-oid="qqy7.f_"
        >
          <Skeleton
            variant="circular"
            width={isSmallScreen ? 28 : 32}
            height={isSmallScreen ? 28 : 32}
            animation="wave"
            sx={skeletonStyles}
            data-oid="ah8p2-g"
          />
        </Box>
      }
      data-oid=".a:nzp-"
    >
      <Box sx={[itemContentBaseStyles]} data-oid="njw4ru1">
        <Box sx={[itemContentInnerStyles]} data-oid="0be3k2w">
          <ListItemIcon
            sx={{
              minWidth: { xs: "32px", sm: "40px" },
              mt: "2px",
              mr: { xs: 1, sm: 1.5 },
            }}
            data-oid="iun1ohx"
          >
            <Skeleton
              variant="circular"
              width={isSmallScreen ? 24 : 28}
              height={isSmallScreen ? 24 : 28}
              animation="wave"
              sx={skeletonStyles}
              data-oid="1z9s-n9"
            />
          </ListItemIcon>
          <Skeleton
            variant="rectangular"
            width="70%"
            height={isSmallScreen ? 24 : 28}
            animation="wave"
            sx={[
              {
                borderRadius: g3BorderRadius(G3_PRESETS.skeletonLine),
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                fontWeight: 400,
                width: "100%",
                overflow: "hidden",
                display: "block",
              },
              skeletonStyles,
            ]}
            data-oid="zc21:k-"
          />
        </Box>
      </Box>
    </ListItem>
  );
};
