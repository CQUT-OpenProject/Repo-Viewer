import React from "react";
import { Box, IconButton, Typography, alpha, useTheme } from "@mui/material";
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
 * 提供图片预览的控制功能，包括缩放、旋转和全屏。
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
}) => {
  const theme = useTheme();
  const { t } = useI18n();

  const controlBarSx = {
    display: "inline-flex",
    alignItems: "center",
    gap: isSmallScreen ? 0 : 0.25,
    bgcolor: alpha(theme.palette.background.paper, 0.95),
    backdropFilter: "blur(10px)",
    boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
    borderRadius: g3BorderRadius(G3_PRESETS.card),
    px: isSmallScreen ? 0.5 : 1,
    py: isSmallScreen ? 0.25 : 0.5,
    height: isSmallScreen ? "40px" : "48px",
    maxWidth: "100%",
    overflow: "auto",
  };

  const controlButtonSx = {
    color: theme.palette.text.primary,
    borderRadius: g3BorderRadius(G3_PRESETS.button),
    flexShrink: 0,
    "&:hover": {
      bgcolor: alpha(theme.palette.text.primary, 0.08),
    },
    padding: isSmallScreen ? "6px" : "8px",
    height: isSmallScreen ? "32px" : "36px",
    width: isSmallScreen ? "32px" : "36px",
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: isSmallScreen ? 1 : 1.5,
        flexShrink: 0,
        bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid",
        borderColor: "divider",
        minHeight: isSmallScreen ? "64px" : "72px",
        height: "auto",
        paddingTop: isSmallScreen ? "8px" : "12px",
        paddingBottom: isSmallScreen ? "calc(8px + env(safe-area-inset-bottom, 0px))" : "12px",
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 -2px 8px rgba(0,0,0,0.15)"
            : "0 -2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <Box sx={controlBarSx}>
        <IconButton
          onClick={() => {
            zoomOut();
          }}
          disabled={error}
          size="small"
          aria-label={t("ui.image.zoomOut")}
          title={t("ui.image.zoomOut")}
          sx={controlButtonSx}
        >
          <ZoomOutIcon fontSize={isSmallScreen ? "small" : "medium"} />
        </IconButton>

        <IconButton
          onClick={() => {
            resetTransform();
          }}
          disabled={error}
          size="small"
          aria-label={t("ui.image.reset")}
          title={t("ui.image.reset")}
          sx={{
            ...controlButtonSx,
            width: isSmallScreen ? "52px" : "60px",
            minWidth: isSmallScreen ? "52px" : "60px",
          }}
        >
          <Typography
            variant={isSmallScreen ? "caption" : "body2"}
            sx={{
              fontWeight: 500,
              minWidth: isSmallScreen ? "32px" : "40px",
              textAlign: "center",
            }}
          >
            {Math.round(scale * 100)}%
          </Typography>
        </IconButton>

        <IconButton
          onClick={() => {
            zoomIn();
          }}
          disabled={error}
          size="small"
          aria-label={t("ui.image.zoomIn")}
          title={t("ui.image.zoomIn")}
          sx={controlButtonSx}
        >
          <ZoomInIcon fontSize={isSmallScreen ? "small" : "medium"} />
        </IconButton>

        <IconButton
          onClick={handleRotateLeft}
          disabled={error}
          size="small"
          aria-label={t("ui.image.rotateLeft")}
          title={t("ui.image.rotateLeft")}
          sx={controlButtonSx}
        >
          <RotateLeftIcon fontSize={isSmallScreen ? "small" : "medium"} />
        </IconButton>

        <IconButton
          onClick={handleRotateRight}
          disabled={error}
          size="small"
          aria-label={t("ui.image.rotateRight")}
          title={t("ui.image.rotateRight")}
          sx={controlButtonSx}
        >
          <RotateRightIcon fontSize={isSmallScreen ? "small" : "medium"} />
        </IconButton>

        {!fullScreenMode && (
          <IconButton
            onClick={toggleFullScreen}
            disabled={error}
            size="small"
            aria-label={t("ui.image.fullscreen")}
            title={t("ui.image.fullscreen")}
            sx={controlButtonSx}
          >
            <FullscreenIcon fontSize={isSmallScreen ? "small" : "medium"} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default ImageToolbar;
