import type { FC, ReactNode } from "react";
import { Box, useTheme } from "@mui/material";

/**
 * 全屏预览组件属性接口
 */
interface FullScreenPreviewProps {
  children: ReactNode;
  onClose: () => void;
  backgroundColor?: string;
  disablePadding?: boolean;
}

/**
 * 全屏预览组件
 *
 * 提供全屏模式的预览容器，支持点击背景关闭。
 */
const FullScreenPreview: FC<FullScreenPreviewProps> = ({
  children,
  onClose,
  backgroundColor,
  disablePadding = false,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.modal + 100,
        backgroundColor: backgroundColor ?? theme.palette.background.default,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-oid="jlcyx:d"
    >
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
          height: "auto",
          minHeight: "100%",
          overflow: "visible",
          padding: disablePadding ? 0 : 2,
        }}
        data-oid=".o2q08e"
      >
        {children}
      </Box>
    </Box>
  );
};

export default FullScreenPreview;
