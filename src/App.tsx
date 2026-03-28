import React, { useEffect, useRef } from "react";
import { AppBar, Toolbar, Typography, Box, useTheme, useMediaQuery, Collapse } from "@mui/material";
import { AppContextProvider } from "@/contexts/unified";
import MainContent from "@/components/layout/MainContent";
import ToolbarButtons from "@/components/layout/ToolbarButtons";
import { SITE_TITLE } from "@/constants";
import { GitHub } from "@/services/github";
import { logger } from "@/utils";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import SEO from "@/components/seo/SEO";
import Footer from "@/components/layout/Footer";
import { FaviconManager } from "@/components/ui/DynamicIcon";
import { PageErrorBoundary, FeatureErrorBoundary } from "@/components/ui/ErrorBoundary";

/**
 * 应用主组件
 *
 * 应用的根组件，包含顶部导航栏、主内容区和页脚。
 * 处理标题点击、滚动监听和token状态检查。
 */
const App = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleRef = useRef<HTMLDivElement | null>(null);

  // 使用自定义 Hook 监听滚动位置
  const showBreadcrumbInToolbar = useScrollVisibility(100);

  /**
   * 重置应用状态
   *
   * 清除所有缓存的GitHub内容数据并记录日志。
   * 如果清除失败，只记录错误日志而不会抛出异常。
   *
   * @returns Promise<boolean> - 清除缓存是否成功
   */
  const resetApplicationState = async (): Promise<boolean> => {
    try {
      await GitHub.Cache.clearCache();
      logger.debug("已清除所有缓存");
      return true;
    } catch (e) {
      logger.error("清除缓存失败:", e);
      return false;
    }
  };

  /**
   * 处理应用标题的点击事件
   *
   * 当用户点击应用标题时，在桌面端会触发以下操作：
   * 1. 清除所有缓存的GitHub内容数据
   * 2. 重定向到网站根路径（首页）
   *
   * 注意：
   * - 在移动端（小屏幕）设备上，此功能被禁用以防止误触
   * - 只有当点击目标是标题元素本身时才会触发
   *
   * @param event - React鼠标点击事件对象
   */
  const handleTitleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (isSmallScreen) {
      return;
    }

    if (
      titleRef.current !== null &&
      (event.target === titleRef.current || titleRef.current.contains(event.target as Node))
    ) {
      void resetApplicationState();
      window.dispatchEvent(new Event("navigate-to-home"));
    }
  };

  // 启动时检查token状态
  useEffect(() => {
    // 在控制台显示token状态
    const tokenCount = GitHub.Auth.getTokenCount();
    const hasTokenFlag = GitHub.Auth.hasToken();
    logger.info(
      `GitHub Token状态: ${hasTokenFlag ? "已配置" : "未配置"}, Token数量: ${tokenCount.toString()}`,
    );

    // 此日志仅供本地开发环境使用，部署至平台后无法检测环境变量
    if (!hasTokenFlag) {
      logger.warn(
        "未检测到GitHub Token，API搜索功能可能受限。请考虑配置Token以获取更好的搜索体验。",
      );
      logger.info("您可以使用以下代码在开发环境中设置临时token:");
      logger.info('GitHubService.setLocalToken("your_github_token_here")');
    }
  }, []);

  return (
    <>
      {/* 动态favicon管理器 */}
      <FaviconManager />
      {/* 基础SEO设置 */}
      <SEO data-oid="542h-3i" />

      <style data-oid="b003vxu">
        {`
            .notistack-SnackbarContainer {
              bottom: 24px !important;
            }

            .notistack-MuiContent {
              border-radius: ${theme.shape.borderRadius.toString()}px !important;
              box-shadow: ${theme.shadows[3]} !important;
            }

            .notistack-MuiContent-success,
            .notistack-MuiContent-error,
            .notistack-MuiContent-warning,
            .notistack-MuiContent-info {
              padding: 10px 16px !important;
            }
          `}
      </style>
      <PageErrorBoundary>
        <AppContextProvider data-oid="a29dni6">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
            }}
            data-oid="x1__:v_"
          >
            <AppBar
              position="fixed"
              elevation={0}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                zIndex: theme.zIndex.appBar,
              }}
              data-oid="wo6wy.h"
            >
              <Toolbar data-oid="3t2uspn">
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                  data-oid="ldirzxg"
                >
                  <Typography
                    ref={titleRef}
                    variant="h6"
                    component="div"
                    sx={{
                      cursor: isSmallScreen ? "default" : "pointer",
                      transition: "opacity 0.2s ease-in-out",
                      "&:hover": isSmallScreen
                        ? {}
                        : {
                            opacity: 0.8,
                          },
                      fontSize: {
                        xs: "0.9rem",
                        sm: "1rem",
                        md: "1.25rem",
                      },
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flexShrink: 0,
                    }}
                    onClick={handleTitleClick}
                    data-oid="isr-jsd"
                  >
                    {SITE_TITLE}
                  </Typography>

                  {/* 面包屑导航（顶部栏）的容器 */}
                  <Collapse
                    in={showBreadcrumbInToolbar}
                    orientation="horizontal"
                    timeout={300}
                    sx={{
                      flexGrow: 1,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      id="toolbar-breadcrumb-container"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        minWidth: 0,
                        flexGrow: 1,
                      }}
                    />
                  </Collapse>
                </Box>
                <ToolbarButtons
                  showBreadcrumbInToolbar={showBreadcrumbInToolbar}
                  isSmallScreen={isSmallScreen}
                  data-oid="enprsdk"
                />
              </Toolbar>
            </AppBar>

            {/* 占位符，用于为固定的AppBar留出空间 */}
            <Toolbar />

            <FeatureErrorBoundary featureName="MainContent">
              <MainContent showBreadcrumbInToolbar={showBreadcrumbInToolbar} data-oid="jgn58er" />
            </FeatureErrorBoundary>

            {/* 添加页脚组件 */}
            <Footer data-oid="ntwtx22" />
          </Box>
        </AppContextProvider>
      </PageErrorBoundary>
    </>
  );
};

export default App;
