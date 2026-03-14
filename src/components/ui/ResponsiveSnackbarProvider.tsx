import React from "react";
import { SnackbarProvider } from "notistack";
import { useTheme, useMediaQuery } from "@mui/material";
import CustomSnackbar from "./CustomSnackbar";

/**
 * 响应式通知提供者组件
 *
 * 根据屏幕大小自动调整通知显示配置，提供统一的通知服务。
 */
export const ResponsiveSnackbarProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      autoHideDuration={3000}
      dense={isSmallScreen}
      preventDuplicate
      TransitionProps={{ direction: "up" }}
      Components={{
        default: CustomSnackbar,
        success: CustomSnackbar,
        error: CustomSnackbar,
        warning: CustomSnackbar,
        info: CustomSnackbar,
      }}
      data-oid="kcy4t9o"
    >
      {children}
    </SnackbarProvider>
  );
};
