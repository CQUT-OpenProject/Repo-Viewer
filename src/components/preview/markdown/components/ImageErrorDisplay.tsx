import React from "react";
import { Typography, Button, alpha, useTheme } from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

/**
 * 图片错误显示组件属性接口
 */
interface ImageErrorDisplayProps {
  imgSrc: string;
  onRetry: () => void;
}

/**
 * 图片错误显示组件
 *
 * 当Markdown中的图片加载失败时显示错误信息和重试按钮。
 */
export const ImageErrorDisplay: React.FC<ImageErrorDisplayProps> = ({ imgSrc, onRetry }) => {
  const theme = useTheme();
  const trimmedSrc = imgSrc.trim();
  const displaySrc = trimmedSrc.length > 0 ? imgSrc : "未知图片路径";

  return (
    <div
      style={{
        position: "relative",
        margin: "1em 0",
        border: `1px dashed ${theme.palette.error.main}`,
        borderRadius: g3BorderRadius(G3_PRESETS.card),
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100px",
        backgroundColor: alpha(theme.palette.error.main, 0.05),
      }}
      data-oid="jygfg5b"
    >
      <ErrorOutlineIcon
        color="error"
        style={{ fontSize: 40, marginBottom: 8 }}
        data-oid="g5glf05"
      />
      <Typography variant="body2" color="error" gutterBottom data-oid="wwi58v_">
        图片加载失败
      </Typography>
      <Typography
        variant="caption"
        color="textSecondary"
        style={{
          maxWidth: "90%",
          wordBreak: "break-all",
          textAlign: "center",
          marginBottom: 8,
        }}
        data-oid="dcz6qln"
      >
        {displaySrc}
      </Typography>
      <Button
        startIcon={<RefreshIcon data-oid="d5-tho9" />}
        size="small"
        variant="outlined"
        color="primary"
        onClick={onRetry}
        data-oid="e12fctp"
      >
        重试加载
      </Button>
    </div>
  );
};
