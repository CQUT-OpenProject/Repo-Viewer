import React from "react";
import { Box, Typography, useTheme, alpha, Paper, Stack, Button } from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { scaleInAnimation } from "@/theme/animations";
import {
  FolderOpen as FolderOpenIcon,
  CloudOff as CloudOffIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
} from "@mui/icons-material";

/**
 * 空状态类型
 */
export type EmptyStateType = "empty-directory" | "network-error" | "search-empty" | "general-error";

/**
 * 空状态组件属性接口
 */
interface EmptyStateProps {
  /** 空状态类型 */
  type: EmptyStateType;
  /** 自定义标题 */
  title?: string;
  /** 自定义描述 */
  description?: string;
  /** 操作按钮文本 */
  actionText?: string;
  /** 操作按钮点击事件 */
  onAction?: () => void;
  /** 是否显示操作按钮 */
  showAction?: boolean;
  /** 是否为小屏幕 */
  isSmallScreen?: boolean;
  /** 自定义样式 */
  sx?: Record<string, unknown>;
}

// 预定义的空状态配置
const emptyStateConfigs = {
  "empty-directory": {
    icon: FolderOpenIcon,
    title: "此目录为空",
    description: "当前文件夹中没有任何文件或子文件夹",
    actionText: "刷新",
    color: "text.secondary",
  },
  "network-error": {
    icon: CloudOffIcon,
    title: "网络连接错误",
    description: "无法连接到服务器，请检查您的网络连接",
    actionText: "重试",
    color: "error.main",
  },
  "search-empty": {
    icon: SearchIcon,
    title: "未找到匹配结果",
    description: "没有找到符合搜索条件的文件或文件夹",
    actionText: "清除搜索",
    color: "info.main",
  },
  "general-error": {
    icon: ErrorIcon,
    title: "出现错误",
    description: "加载内容时发生了错误，请稍后重试",
    actionText: "重试",
    color: "error.main",
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  showAction = true,
  isSmallScreen = false,
  sx = {},
}) => {
  const theme = useTheme();
  const config = emptyStateConfigs[type];
  const IconComponent = config.icon;

  const actionHandler = typeof onAction === "function" ? onAction : undefined;
  const shouldRenderAction = showAction && actionHandler !== undefined;

  // 获取最终的文本内容
  const normalize = (value: string | undefined, fallback: string): string => {
    if (value === undefined) {
      return fallback;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? value : fallback;
  };

  const finalTitle = normalize(title, config.title);
  const finalDescription = normalize(description, config.description);
  const finalActionText = normalize(actionText, config.actionText);

  // 容器样式
  const containerStyles = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    py: isSmallScreen ? 4 : 6,
    px: isSmallScreen ? 2 : 4,
    minHeight: isSmallScreen ? 200 : 300,
    ...sx,
  };

  // 图标容器样式
  const iconContainerStyles = {
    width: isSmallScreen ? 80 : 120,
    height: isSmallScreen ? 80 : 120,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    mb: 3,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    border: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
    transition: theme.transitions.create(["background-color", "border-color"], {
      duration: theme.transitions.duration.short,
    }),
  };

  // 图标样式
  const iconStyles = {
    fontSize: isSmallScreen ? 40 : 56,
    color: config.color,
    transition: theme.transitions.create("color", {
      duration: theme.transitions.duration.short,
    }),
  };

  // 标题样式
  const titleVariant = isSmallScreen ? "h6" : "h5";
  const titleStyles = {
    fontWeight: 600,
    color: "text.primary",
    mb: 1.5,
    fontSize: isSmallScreen ? "1.1rem" : "1.25rem",
  };

  // 描述样式
  const descriptionStyles = {
    color: "text.secondary",
    mb: shouldRenderAction ? 3 : 0,
    maxWidth: isSmallScreen ? 280 : 400,
    lineHeight: 1.6,
    fontSize: isSmallScreen ? "0.875rem" : "1rem",
  };

  // 按钮样式
  const buttonSize = isSmallScreen ? "medium" : "large";
  const buttonStyles = {
    borderRadius: g3BorderRadius(G3_PRESETS.button),
    px: isSmallScreen ? 2 : 3,
    py: isSmallScreen ? 1 : 1.5,
    fontWeight: 500,
    textTransform: "none" as const,
    boxShadow: theme.shadows[2],
    "&:hover": {
      boxShadow: theme.shadows[4],
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0px)",
    },
    transition: theme.transitions.create(["box-shadow", "transform"], {
      duration: theme.transitions.duration.short,
    }),
  };

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: "transparent",
        animation: `${scaleInAnimation} 0.4s ease-out`,
        ...containerStyles,
      }}
    >
      <Stack spacing={0} alignItems="center">
        {/* 图标容器 */}
        <Box sx={iconContainerStyles}>
          <IconComponent sx={iconStyles} />
        </Box>

        {/* 标题 */}
        <Typography variant={titleVariant} component="h2" sx={titleStyles}>
          {finalTitle}
        </Typography>

        {/* 描述 */}
        <Typography variant="body1" sx={descriptionStyles}>
          {finalDescription}
        </Typography>

        {/* 操作按钮 */}
        {shouldRenderAction && (
          <Button
            variant="contained"
            size={buttonSize}
            startIcon={<RefreshIcon />}
            onClick={actionHandler}
            sx={buttonStyles}
          >
            {finalActionText}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

export default EmptyState;
