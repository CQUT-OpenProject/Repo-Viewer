import React, { useContext, useState, useEffect, useRef, lazy, Suspense } from "react";
import { Box, IconButton, Tooltip, useTheme } from "@mui/material";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  GitHub as GitHubIcon,
  SearchRounded as SearchIcon,
} from "@mui/icons-material";
import { ColorModeContext } from "@/contexts/colorModeContext";
import { useRefresh } from "@/hooks/useRefresh";
import axios from "axios";
import { getGithubConfig } from "@/config";
import { logger } from "@/utils/logging/logger";
import { useContentContext, usePreviewContext } from "@/contexts/unified";
import { useI18n } from "@/contexts/I18nContext";
import { useRefreshSync } from "./hooks/useRefreshSync";
import { buildGitHubUrl } from "./utils/githubUrl";

// 懒加载搜索组件
const SearchDrawer = lazy(async () => import("@/components/interactions/SearchDrawer"));

/**
 * 仓库信息接口
 */
interface RepoInfo {
  repoOwner: string;
  repoName: string;
}

/**
 * GitHub配置状态类型
 */
type GitHubConfigStatus = "success" | "error";

/**
 * GitHub配置响应接口
 */
interface GitHubConfigResponse {
  status?: GitHubConfigStatus;
  data?: Partial<RepoInfo>;
}

/**
 * 工具栏按钮组件属性接口
 */
interface ToolbarButtonsProps {
  showBreadcrumbInToolbar?: boolean;
  isSmallScreen?: boolean;
}

/**
 * 工具栏按钮组件
 *
 * 提供主题切换、刷新和跳转到GitHub等功能按钮。
 */
const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({
  showBreadcrumbInToolbar = false,
  isSmallScreen = false,
}) => {
  const { toggleColorMode } = useContext(ColorModeContext);
  const theme = useTheme();
  const handleRefresh = useRefresh();
  const [searchDrawerOpen, setSearchDrawerOpen] = useState<boolean>(false);
  const { t } = useI18n();
  const repoInfoRef = useRef<RepoInfo>(
    (() => {
      const githubConfig = getGithubConfig();
      return {
        repoOwner: githubConfig.repoOwner,
        repoName: githubConfig.repoName,
      };
    })(),
  );
  const { currentBranch, defaultBranch, currentPath, refreshBranches } = useContentContext();

  const { previewState, selectFile, closePreview } = usePreviewContext();

  useRefreshSync({
    handleRefresh,
    refreshBranches,
  });

  // 在组件加载时获取仓库信息
  useEffect(() => {
    const fetchRepoInfo = async (): Promise<void> => {
      try {
        // 尝试从API获取仓库信息
        const response = await axios.get<GitHubConfigResponse>("/api/github?action=getConfig");
        if (response.data.status === "success") {
          const { repoOwner, repoName } = response.data.data ?? {};
          if (
            typeof repoOwner === "string" &&
            repoOwner.length > 0 &&
            typeof repoName === "string" &&
            repoName.length > 0
          ) {
            repoInfoRef.current = { repoOwner, repoName };
          }
        }
      } catch (error) {
        // 如果API请求失败，保持使用默认值或环境变量值
        logger.error("获取仓库信息失败:", error);
      }
    };

    void fetchRepoInfo();
  }, []);

  // 处理主题切换按钮点击
  // 如果存在文本文件预览，先关闭预览，切换主题，然后自动重新打开
  const onThemeToggleClick = async () => {
    // 检查是否有文本文件预览（性能优化：避免主题切换时的卡顿）
    const hasTextPreview =
      previewState.previewType === "text" && previewState.previewingItem !== null;

    let previewItemToRestore: typeof previewState.previewingItem = null;

    if (hasTextPreview) {
      // 保存当前预览的文件信息
      previewItemToRestore = previewState.previewingItem;

      // 关闭预览
      closePreview();

      // 等待一小段时间，确保预览已完全关闭
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // 执行主题切换
    toggleColorMode();

    // 如果有文本文件预览，在主题切换后重新打开
    if (hasTextPreview && previewItemToRestore !== null) {
      // 等待主题切换完成（通常在 600ms 左右）
      setTimeout(() => {
        // 重新打开之前预览的文件
        void selectFile(previewItemToRestore, "theme-reopen");
      }, 650);
    }
  };

  // 处理GitHub按钮点击
  const onGitHubClick = () => {
    const url = buildGitHubUrl(repoInfoRef.current, currentBranch, defaultBranch, currentPath);
    window.open(url, "_blank");
  };

  const openSearchDrawer = () => {
    setSearchDrawerOpen(true);
  };

  const closeSearchDrawer = () => {
    setSearchDrawerOpen(false);
  };

  // 保留分支逻辑但不显示UI：这些代码确保分支功能的后台逻辑正常工作
  // branchLabelId, handleBranchChange, handleBranchOpen, branchOptions 等
  // 虽然不再渲染UI，但保留这些逻辑以备将来需要或其他组件调用

  const isHomePage = currentPath.trim().length === 0;
  const shouldHideButtons = isSmallScreen && showBreadcrumbInToolbar && !isHomePage;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          transform: shouldHideButtons
            ? { xs: "translateX(120px)", sm: "translateX(0)" }
            : "translateX(0)",
          opacity: shouldHideButtons ? 0 : 1,
          transition: shouldHideButtons ? "none" : "all 0.2s ease-out",
          pointerEvents: shouldHideButtons ? "none" : "auto",
          position: shouldHideButtons ? { xs: "absolute", sm: "relative" } : "relative",
          right: shouldHideButtons ? { xs: 0, sm: "auto" } : "auto",
        }}
      >
        <Tooltip title={t("ui.toolbar.searchFiles")}>
          <span>
            <IconButton
              color="inherit"
              onClick={openSearchDrawer}
              aria-label={t("ui.toolbar.searchFiles")}
              sx={{ ml: { xs: 1, sm: 1.5 } }}
            >
              <SearchIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={t("ui.toolbar.viewOnGitHub")}>
          <IconButton
            color="inherit"
            onClick={onGitHubClick}
            aria-label={t("ui.toolbar.viewOnGitHub")}
            sx={{
              "&:hover": {
                color: theme.palette.primary.light,
              },
            }}
          >
            <GitHubIcon />
          </IconButton>
        </Tooltip>

        {/* 主题切换按钮 - 点击时不会触发内容重新加载 */}
        <Tooltip
          title={
            theme.palette.mode === "dark" ? t("ui.toolbar.lightMode") : t("ui.toolbar.darkMode")
          }
        >
          <IconButton
            onClick={() => {
              void onThemeToggleClick();
            }}
            color="inherit"
            aria-label={
              theme.palette.mode === "dark" ? t("ui.toolbar.lightMode") : t("ui.toolbar.darkMode")
            }
            sx={{
              "&:hover": {
                color:
                  theme.palette.mode === "dark"
                    ? theme.palette.warning.light
                    : theme.palette.primary.light,
              },
            }}
          >
            {theme.palette.mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      {searchDrawerOpen && (
        <Suspense fallback={null}>
          <SearchDrawer open={searchDrawerOpen} onClose={closeSearchDrawer} />
        </Suspense>
      )}
    </>
  );
};

export default ToolbarButtons;
