import React from "react";
import { Box, Skeleton, useTheme, Paper } from "@mui/material";
import { getSkeletonStyles, getContainerTransitionStyles, useSkeletonVisibility } from "./shared";
import { responsiveG3Styles, g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

/**
 * Markdown预览骨架屏组件
 *
 * 在Markdown内容加载时显示的占位骨架屏。
 */
export const MarkdownPreviewSkeleton: React.FC<{
  isSmallScreen?: boolean;
  visible?: boolean;
  onExited?: () => void;
}> = ({ isSmallScreen = false, visible = true, onExited }) => {
  const theme = useTheme();
  const skeletonStyles = getSkeletonStyles(theme);
  const isExiting = useSkeletonVisibility(visible, onExited);

  const containerBorderRadius = responsiveG3Styles.readmeContainer(isSmallScreen);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...getContainerTransitionStyles(isExiting),
      }}
      data-oid="8zc.-op"
    >
      <Paper
        elevation={0}
        sx={{
          py: 2,
          px: { xs: 2, sm: 3, md: 4 },
          mt: 2,
          mb: 3,
          borderRadius: containerBorderRadius,
          bgcolor: "background.paper",
          overflowX: "auto",
          border: "1px solid",
          borderColor: "divider",
        }}
        data-oid="hmly:se"
      >
        {/* 标题 */}
        <Skeleton
          variant="text"
          width="60%"
          height={isSmallScreen ? 32 : 40}
          animation="wave"
          sx={{
            mb: 2,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="umqge2l"
        />

        {/* 副标题 */}
        <Skeleton
          variant="text"
          width="40%"
          height={isSmallScreen ? 24 : 32}
          animation="wave"
          sx={{
            mb: 3,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="dpvya_k"
        />

        {/* 段落 */}
        <Skeleton
          variant="text"
          width="100%"
          height={isSmallScreen ? 16 : 20}
          animation="wave"
          sx={{
            mb: 1,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="kcl3c2g"
        />

        <Skeleton
          variant="text"
          width="95%"
          height={isSmallScreen ? 16 : 20}
          animation="wave"
          sx={{
            mb: 1,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="ofcg4gg"
        />

        <Skeleton
          variant="text"
          width="98%"
          height={isSmallScreen ? 16 : 20}
          animation="wave"
          sx={{
            mb: 3,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="lr2nssc"
        />

        {/* 代码块 */}
        <Skeleton
          variant="rectangular"
          width="100%"
          height={isSmallScreen ? 80 : 100}
          animation="wave"
          sx={{
            mb: 3,
            borderRadius: g3BorderRadius(G3_PRESETS.card),
            ...skeletonStyles,
          }}
          data-oid="-e4b85x"
        />

        {/* 更多段落 */}
        <Skeleton
          variant="text"
          width="90%"
          height={isSmallScreen ? 16 : 20}
          animation="wave"
          sx={{
            mb: 1,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="qx9pw9p"
        />

        <Skeleton
          variant="text"
          width="100%"
          height={isSmallScreen ? 16 : 20}
          animation="wave"
          sx={{
            mb: 1,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="fqv1uav"
        />

        <Skeleton
          variant="text"
          width="92%"
          height={isSmallScreen ? 16 : 20}
          animation="wave"
          sx={{
            mb: 3,
            borderRadius: g3BorderRadius(G3_PRESETS.breadcrumbItem),
            ...skeletonStyles,
          }}
          data-oid="k11:d_g"
        />
      </Paper>
    </Box>
  );
};
