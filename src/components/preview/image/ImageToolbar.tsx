import React from "react";
import { Box, IconButton, Typography, Button, alpha, useTheme } from "@mui/material";
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Fullscreen as FullscreenIcon,
} from "@mui/icons-material";
import type { ImageToolbarProps } from "./types";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { useI18n } from "@/contexts/I18nContext";

/**
 * 图片工具栏组件
 *
 * 提供图片预览的控制功能，包括缩放、旋转、全屏和关闭。
 */
const ImageToolbar: React.FC<ImageToolbarProps> = ({
  error,
  scale,
  isSmallScreen,
  fullScreenMode,
  zoomIn,
  zoomOut,
  resetTransform,
  handleRotateLeft,
  handleRotateRight,
  toggleFullScreen,
  handleClosePreview,
  closeButtonBorderRadius,
}) => {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: isSmallScreen ? 1 : 2,
        p: isSmallScreen ? 1 : 1.5,
        bgcolor:
          theme.palette.mode === "dark"
            ? alpha(theme.palette.background.paper, 0.7)
            : alpha(theme.palette.background.paper, 0.8),
        backdropFilter: "blur(10px)",
        borderTop: "1px solid",
        borderColor: alpha(theme.palette.divider, 0.1),
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        minHeight: isSmallScreen ? "64px" : "72px",
        height: "auto",
        paddingTop: isSmallScreen ? "8px" : "12px",
        paddingBottom: isSmallScreen ? "8px" : "12px",
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 -4px 12px rgba(0,0,0,0.2)"
            : "0 -4px 12px rgba(0,0,0,0.1)",
        flexWrap: isSmallScreen ? "wrap" : "nowrap",
        ...(fullScreenMode && {
          paddingRight: isSmallScreen ? "8px" : "120px",
          paddingLeft: isSmallScreen ? "8px" : undefined,
          width: isSmallScreen ? "calc(100% - 16px)" : "calc(100% - 48px)",
          right: isSmallScreen ? "8px" : "24px",
          left: isSmallScreen ? "8px" : "24px",
          borderRadius: g3BorderRadius(G3_PRESETS.card),
          bottom: isSmallScreen ? "8px" : "16px",
          border: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.1),
        }),
      }}
      data-oid="2ux6qrx"
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: isSmallScreen ? 0.75 : 2,
          width: "100%",
          paddingLeft: isSmallScreen ? 0 : "80px", // 为右侧关闭按钮平衡空间
          flexWrap: isSmallScreen ? "wrap" : "nowrap",
          paddingRight: isSmallScreen ? "88px" : 0, // 为小屏幕的关闭按钮留出空间
        }}
        data-oid="wlz6pbm"
      >
        {/* 缩小按钮 */}
        <IconButton
          onClick={() => {
            zoomOut();
          }}
          disabled={error}
          size={isSmallScreen ? "medium" : "large"}
          aria-label={t("ui.image.zoomOut")}
          title={t("ui.image.zoomOut")}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? "8px" : "10px",
            height: isSmallScreen ? "40px" : "48px",
            width: isSmallScreen ? "40px" : "48px",
          }}
          data-oid=":4kbc4k"
        >
          <ZoomOutIcon fontSize={isSmallScreen ? "small" : "medium"} data-oid="3-:jjhw" />
        </IconButton>

        {/* 缩放比例显示和重置按钮 */}
        <IconButton
          onClick={() => {
            resetTransform();
          }}
          disabled={error}
          size={isSmallScreen ? "medium" : "large"}
          aria-label={t("ui.image.reset")}
          title={t("ui.image.reset")}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? "8px" : "10px",
            width: isSmallScreen ? "64px" : "80px",
            minWidth: isSmallScreen ? "64px" : "80px",
            height: isSmallScreen ? "40px" : "48px",
            justifyContent: "center",
          }}
          data-oid="mx.rtt4"
        >
          <Typography
            variant={isSmallScreen ? "caption" : "body2"}
            sx={{
              fontWeight: 500,
              minWidth: isSmallScreen ? "36px" : "44px",
              textAlign: "center",
            }}
            data-oid="vn9ul2y"
          >
            {Math.round(scale * 100)}%
          </Typography>
        </IconButton>

        {/* 放大按钮 */}
        <IconButton
          onClick={() => {
            zoomIn();
          }}
          disabled={error}
          size={isSmallScreen ? "medium" : "large"}
          aria-label={t("ui.image.zoomIn")}
          title={t("ui.image.zoomIn")}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? "8px" : "10px",
            height: isSmallScreen ? "40px" : "48px",
            width: isSmallScreen ? "40px" : "48px",
          }}
          data-oid="rpj_u5-"
        >
          <ZoomInIcon fontSize={isSmallScreen ? "small" : "medium"} data-oid="78o_sgq" />
        </IconButton>

        {/* 左旋转按钮 */}
        <IconButton
          onClick={handleRotateLeft}
          disabled={error}
          size={isSmallScreen ? "medium" : "large"}
          aria-label={t("ui.image.rotateLeft")}
          title={t("ui.image.rotateLeft")}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? "8px" : "10px",
            height: isSmallScreen ? "40px" : "48px",
            width: isSmallScreen ? "40px" : "48px",
          }}
          data-oid="eorlbul"
        >
          <RotateLeftIcon fontSize={isSmallScreen ? "small" : "medium"} data-oid="mg660l-" />
        </IconButton>

        {/* 右旋转按钮 */}
        <IconButton
          onClick={handleRotateRight}
          disabled={error}
          size={isSmallScreen ? "medium" : "large"}
          aria-label={t("ui.image.rotateRight")}
          title={t("ui.image.rotateRight")}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
            borderRadius: g3BorderRadius(G3_PRESETS.button),
            padding: isSmallScreen ? "8px" : "10px",
            height: isSmallScreen ? "40px" : "48px",
            width: isSmallScreen ? "40px" : "48px",
          }}
          data-oid="e.aaidi"
        >
          <RotateRightIcon fontSize={isSmallScreen ? "small" : "medium"} data-oid="9xuw2t_" />
        </IconButton>

        {/* 全屏按钮（仅在非全屏模式下显示） */}
        {!fullScreenMode && (
          <IconButton
            onClick={toggleFullScreen}
            disabled={error}
            size={isSmallScreen ? "medium" : "large"}
            aria-label={t("ui.image.fullscreen")}
            title={t("ui.image.fullscreen")}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
              },
              borderRadius: g3BorderRadius(G3_PRESETS.button),
              padding: isSmallScreen ? "8px" : "10px",
              height: isSmallScreen ? "40px" : "48px",
              width: isSmallScreen ? "40px" : "48px",
            }}
            data-oid="cul6zri"
          >
            <FullscreenIcon fontSize={isSmallScreen ? "small" : "medium"} data-oid="7ykiypv" />
          </IconButton>
        )}
      </Box>

      {/* 关闭按钮 */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleClosePreview}
        aria-label={t("ui.image.close")}
        sx={{
          position: "absolute",
          right: isSmallScreen ? theme.spacing(1) : theme.spacing(2),
          borderRadius: closeButtonBorderRadius,
          minWidth: isSmallScreen ? "64px" : "80px",
          height: isSmallScreen ? "40px" : "48px",
          fontSize: isSmallScreen ? "0.875rem" : "1rem",
          fontWeight: "bold",
          backgroundColor:
            theme.palette.mode === "dark" ? theme.palette.primary.dark : theme.palette.primary.main,
          color: "#fff",
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "dark"
                ? alpha(theme.palette.primary.dark, 0.9)
                : alpha(theme.palette.primary.main, 0.9),
          },
          zIndex: theme.zIndex.modal + 50,
          padding: isSmallScreen ? "8px 12px" : "8px 16px",
        }}
        data-oid="rqnqmvq"
      >
        {t("ui.image.close")}
      </Button>
    </Box>
  );
};

export default ImageToolbar;
