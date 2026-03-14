import { memo, type ReactElement } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * 加载旋转器组件属性接口
 */
interface LoadingSpinnerProps {
  message?: string;
  isSmallScreen: boolean;
  fullHeight?: boolean;
}

/**
 * 加载旋转器组件
 *
 * 显示加载状态的旋转动画和可选消息。
 */
const LoadingSpinner = memo<LoadingSpinnerProps>(
  ({ message = "加载中...", isSmallScreen, fullHeight = false }): ReactElement => {
    const normalizedMessage = message.trim();
    const showMessage = normalizedMessage.length > 0;

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: fullHeight ? "100%" : "auto",
          minHeight: fullHeight ? "60vh" : "200px",
          p: 4,
        }}
        data-oid="ygnuy3y"
      >
        <CircularProgress
          color="primary"
          size={isSmallScreen ? 32 : 40}
          sx={{ mb: 2 }}
          data-oid="v-vl.mu"
        />
        {showMessage && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: "center",
              maxWidth: "300px",
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
            }}
            data-oid=".x07k0m"
          >
            {normalizedMessage}
          </Typography>
        )}
      </Box>
    );
  },
);

// 添加显示名称以便调试
LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
