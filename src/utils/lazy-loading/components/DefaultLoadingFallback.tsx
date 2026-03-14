import React from "react";
import { CircularProgress, Box } from "@mui/material";

/**
 * 默认加载回退组件
 *
 * 用于懒加载组件的默认加载状态显示。
 *
 * @param props - 组件属性
 * @param props.loadingText - 加载提示文本
 * @returns React组件
 */
export const DefaultLoadingFallback: React.FC<{ loadingText?: string }> = ({ loadingText }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "300px",
      gap: 2,
      py: 4,
    }}
  >
    <CircularProgress size={40} />
    {loadingText !== undefined && loadingText.length > 0 && (
      <Box
        component="span"
        sx={{
          fontSize: "0.875rem",
          color: "text.secondary",
          fontWeight: 500,
        }}
      >
        {loadingText}
      </Box>
    )}
  </Box>
);
