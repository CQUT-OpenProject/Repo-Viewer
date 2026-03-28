import {
  Box,
  Breadcrumbs,
  Typography,
  Link,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  HomeRounded as HomeIcon,
  ChevronRight as ChevronRightIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useI18n } from "@/contexts/I18nContext";
import type { FC, ReactNode, RefObject } from "react";
import type { NavigationDirection } from "@/contexts/unified";
import { theme as themeUtils } from "@/utils";

/**
 * 面包屑导航组件属性接口
 */
interface BreadcrumbNavigationProps {
  breadcrumbSegments: { name: string; path: string }[];
  handleBreadcrumbClick: (path: string, direction?: NavigationDirection) => void;
  breadcrumbsMaxItems: number;
  isSmallScreen: boolean;
  breadcrumbsContainerRef: RefObject<HTMLDivElement | null>;
  compact?: boolean; // 紧凑模式，用于顶部栏
  showBackButton?: boolean;
}

/**
 * 面包屑导航组件
 *
 * 显示当前路径的层级导航，支持点击跳转和返回上级功能。
 */
const actionButtonSize = {
  width: { xs: 36, sm: 40 },
  height: { xs: 36, sm: 40 },
};

const BreadcrumbNavigationComponent: FC<BreadcrumbNavigationProps> = ({
  breadcrumbSegments,
  handleBreadcrumbClick,
  breadcrumbsMaxItems,
  isSmallScreen,
  breadcrumbsContainerRef,
  compact = false,
  showBackButton = true,
}) => {
  const theme = useTheme();
  const { t } = useI18n();

  // 处理返回上一级
  const handleGoUp = (): void => {
    // 如果只有Home或者当前已经在Home，不执行操作
    if (breadcrumbSegments.length <= 1) {
      return;
    }

    // 获取倒数第二个路径（当前路径的父级）
    const parentIndex = breadcrumbSegments.length - 2;
    if (parentIndex >= 0) {
      const parentSegment = breadcrumbSegments[parentIndex];
      if (parentSegment === undefined) {
        return;
      }
      const parentPath = parentSegment.path;
      handleBreadcrumbClick(parentPath, "backward");
    }
  };

  // 检查是否有上级目录可返回
  const canGoUp = breadcrumbSegments.length > 1;

  const renderHomeContent = (isLast: boolean): ReactNode => (
    <Box
      component="span"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: theme.palette.primary.main,
        width: { xs: 20, sm: 24 },
        height: { xs: 20, sm: 24 },
        borderRadius: "50%",
        flexShrink: 0,
        position: "relative",
        transition: "all 0.2s",
        ...(isLast
          ? {}
          : {
              ".MuiLink-root:hover &": {
                transform: "rotate(-5deg)",
              },
            }),
      }}
      data-oid=".e0qa-0"
    >
      <HomeIcon
        sx={{
          fontSize: { xs: "0.9rem", sm: "1.1rem" },
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        data-oid="xxu.9dy"
      />
    </Box>
  );

  return (
    <Box
      ref={breadcrumbsContainerRef}
      sx={{
        mb: compact ? 0 : { xs: 1.5, sm: 2.25 },
        position: "relative",
        display: "flex",
        alignItems: "center",
        overflow: "visible",
        zIndex: 1,
        width: compact ? "100%" : "auto",
      }}
      data-oid="zmb:p06"
    >
      <Breadcrumbs
        aria-label="breadcrumb"
        separator={<ChevronRightIcon fontSize="small" color="action" data-oid="kbdj3p7" />}
        maxItems={breadcrumbsMaxItems > 0 ? breadcrumbsMaxItems : 100}
        itemsBeforeCollapse={isSmallScreen ? 1 : 2}
        itemsAfterCollapse={isSmallScreen ? 1 : 2}
        sx={{
          px: compact ? { xs: 0.75, sm: 1 } : { xs: 1, sm: 1.2 },
          py: compact ? { xs: 0.5, sm: 0.6 } : { xs: 0.75, sm: 1 },
          bgcolor: compact ? "transparent" : "background.paper",
          borderRadius: themeUtils.createG3BorderRadius(themeUtils.G3_PRESETS.breadcrumb),
          boxShadow: compact ? "none" : "0px 2px 6px rgba(0, 0, 0, 0.05)",
          "& .MuiBreadcrumbs-ol": {
            alignItems: "center",
            flexWrap: "nowrap",
            width: "100%",
            overflow: "visible",
            position: "relative",
          },
          "& .MuiBreadcrumbs-li": {
            whiteSpace: "nowrap",
            maxWidth: isSmallScreen ? "90px" : "200px",
            overflow: "visible",
            textOverflow: "ellipsis",
            display: "inline-block",
            position: "relative",
            fontSize: compact ? { xs: "0.7rem", sm: "0.8rem" } : { xs: "0.75rem", sm: "inherit" },
          },
          "& .MuiBreadcrumbs-separator": {
            mx: { xs: 0.5, sm: 1 },
          },
          "& .MuiBreadcrumbs-collapsed": {
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.07),
            borderRadius: themeUtils.createG3BorderRadius(themeUtils.G3_PRESETS.breadcrumbItem),
            px: { xs: 0.5, sm: 1 },
            py: 0.2,
            mx: { xs: 0.25, sm: 0.5 },
            fontWeight: 500,
            fontSize: { xs: "0.7rem", sm: "0.75rem" },
            position: "relative",
            zIndex: 1,
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              transform: "scale(1.05)",
              transition: "all 0.2s",
            },
          },
          overflowX: "auto",
          overflowY: "visible",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          flexGrow: 1,
          mr: { xs: 0.75, sm: 1.5 },
        }}
        data-oid="v5dla3."
      >
        {breadcrumbSegments.map((segment, index) => {
          const isLast = index === breadcrumbSegments.length - 1;
          const isHome = segment.name === "Home";
          return isLast ? (
            <Typography
              key={segment.path}
              color="text.primary"
              sx={{
                display: "flex",
                alignItems: "center",
                py: compact ? { xs: 0.25, sm: 0.4 } : { xs: 0.5, sm: 0.75 },
                px: isHome
                  ? compact
                    ? { xs: 0.25, sm: 1.75 }
                    : { xs: 0.5, sm: 1.75 }
                  : { xs: 1.25, sm: 1.75 },
                borderRadius: themeUtils.createG3BorderRadius(themeUtils.G3_PRESETS.breadcrumbItem),
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                fontWeight: 500,
                height: compact ? { xs: "24px", sm: "28px" } : { xs: "28px", sm: "36px" },
                minWidth: isHome ? { xs: compact ? "24px" : "28px", sm: "auto" } : "auto",
                justifyContent: isHome ? "center" : "flex-start",
                fontSize: compact
                  ? { xs: "0.7rem", sm: "0.8rem" }
                  : { xs: "0.75rem", sm: "inherit" },
                boxSizing: "border-box",
                maxWidth: isSmallScreen ? "120px" : "250px",
                "& > span": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                },
              }}
              data-oid="77aldx7"
            >
              {isHome ? (
                renderHomeContent(true)
              ) : (
                <Box
                  component="span"
                  sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  data-oid="hd814k3"
                >
                  {segment.name}
                </Box>
              )}
            </Typography>
          ) : (
            <Link
              key={segment.path}
              underline="none"
              color={isHome ? "primary" : "inherit"}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleBreadcrumbClick(segment.path, "backward");
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                position: "relative",
                px: isHome
                  ? compact
                    ? { xs: 0.25, sm: 1.75 }
                    : { xs: 0.5, sm: 1.75 }
                  : { xs: 1.25, sm: 1.75 },
                py: compact ? { xs: 0.25, sm: 0.4 } : { xs: 0.5, sm: 0.75 },
                borderRadius: themeUtils.createG3BorderRadius(themeUtils.G3_PRESETS.breadcrumbItem),
                bgcolor: isHome ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                minWidth: isHome ? { xs: compact ? "24px" : "28px", sm: "auto" } : "auto",
                justifyContent: isHome ? "center" : "flex-start",
                "&:hover": {
                  bgcolor: isHome
                    ? alpha(theme.palette.primary.main, 0.12)
                    : alpha(theme.palette.primary.main, 0.04),
                  color: isHome
                    ? theme.palette.primary.main
                    : alpha(theme.palette.primary.main, 0.9),
                  transform: "translateY(-1px)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all 0.2s",
                },
                fontSize: compact
                  ? { xs: "0.7rem", sm: "0.8rem" }
                  : { xs: "0.75rem", sm: "inherit" },
                fontWeight: isHome ? 500 : 400,
                transition: "all 0.2s",
                height: compact ? { xs: "24px", sm: "28px" } : { xs: "28px", sm: "36px" },
                boxSizing: "border-box",
                whiteSpace: "nowrap",
                maxWidth: isSmallScreen ? "90px" : "220px",
              }}
              aria-label={
                isHome
                  ? t("ui.breadcrumb.toHome.aria")
                  : t("ui.breadcrumb.toSegment.aria", { name: segment.name })
              }
              data-oid="xsbii_h"
            >
              {isHome ? (
                renderHomeContent(false)
              ) : (
                <Box
                  component="span"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  }}
                  data-oid="nss20f_"
                >
                  {segment.name}
                </Box>
              )}
            </Link>
          );
        })}
      </Breadcrumbs>

      {/* 返回上一级或占位按钮 */}
      {!compact &&
        (showBackButton ? (
          <Tooltip
            title={
              canGoUp
                ? t("ui.breadcrumb.back.tooltip.canGoUp")
                : t("ui.breadcrumb.back.tooltip.atRoot")
            }
            data-oid="ujxfsq2"
          >
            <span data-oid="0rhl8w6">
              <IconButton
                onClick={handleGoUp}
                disabled={!canGoUp}
                aria-label={t("ui.breadcrumb.back.aria")}
                size={isSmallScreen ? "small" : "medium"}
                sx={{
                  bgcolor: "background.paper",
                  color: canGoUp ? theme.palette.primary.main : "text.disabled",
                  boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.05)",
                  ...actionButtonSize,
                  position: "relative",
                  "&:hover": canGoUp
                    ? {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        transform: "translateX(-2px)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }
                    : {},
                  "&:active": canGoUp
                    ? {
                        transform: "translateX(-4px)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                        transition: "all 0.18s cubic-bezier(0.3, 0, 0.5, 1)",
                      }
                    : {},
                  "&:not(:active)": canGoUp
                    ? {
                        transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1.5)",
                      }
                    : {},
                  "&::after": canGoUp
                    ? {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        backgroundColor: theme.palette.primary.main,
                        transition: "all 0.3s cubic-bezier(0.2, 0, 0.3, 1)",
                        opacity: 0,
                        zIndex: -1,
                      }
                    : {},
                  "&:active::after": canGoUp
                    ? {
                        opacity: 0.18,
                        transform: "scale(1.3)",
                        transition: "all 0.2s cubic-bezier(0, 0, 0.2, 1)",
                      }
                    : {},
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                data-oid="s6h78f1"
              >
                <ArrowBackIcon
                  fontSize={isSmallScreen ? "small" : "medium"}
                  sx={{
                    transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    ".MuiIconButton-root:active &": canGoUp
                      ? {
                          transform: "translateX(-1px)",
                          transition: "transform 0.15s cubic-bezier(0.1, 0, 0.4, 1)",
                        }
                      : {},
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Box
            aria-hidden
            sx={{
              ...actionButtonSize,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: theme.palette.background.paper,
              boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.05)",
              opacity: 0.45,
            }}
            data-oid="breadcrumb-back-placeholder"
          />
        ))}
    </Box>
  );
};

const BreadcrumbNavigation = BreadcrumbNavigationComponent;

BreadcrumbNavigation.displayName = "BreadcrumbNavigation";

export default BreadcrumbNavigation;
