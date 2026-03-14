import type { FC } from "react";
import { useState, useEffect, useCallback } from "react";
import { Fab, useTheme, useMediaQuery, Zoom, alpha, Tooltip } from "@mui/material";
import { KeyboardArrowUp as ArrowUpIcon } from "@mui/icons-material";
import { useI18n } from "@/contexts/I18nContext";
import { scroll } from "@/utils";

/**
 * 返回顶部浮动按钮组件属性接口
 */
interface ScrollToTopFabProps {
  /** 显示按钮的滚动阈值（像素） */
  threshold?: number;
  /** 滚动到顶部的动画持续时间（毫秒） */
  scrollDuration?: number;
  /** 自定义样式 */
  sx?: object;
  /** 是否在有内容时才显示 */
  showOnlyWithContent?: boolean;
}

/**
 * 返回顶部浮动按钮组件
 *
 * 滚动超过阈值时显示，点击平滑滚动到页面顶部。
 * 支持响应式设计和自定义样式。
 */
const ScrollToTopFab: FC<ScrollToTopFabProps> = ({
  threshold = 200,
  scrollDuration = 800,
  sx = {},
  showOnlyWithContent = true,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useI18n();
  const getInitialVisibility = (): boolean => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return false;
    }

    const scrollTop = scroll.getScrollTop();
    const hasContent = showOnlyWithContent ? document.body.scrollHeight > window.innerHeight : true;

    return scrollTop > threshold && hasContent;
  };

  const [isVisible, setIsVisible] = useState(getInitialVisibility);
  const [isScrolling, setIsScrolling] = useState(false);

  // 检查滚动位置和内容
  const checkScrollPosition = useCallback((): void => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const scrollTop = scroll.getScrollTop();
    const hasContent = showOnlyWithContent ? document.body.scrollHeight > window.innerHeight : true;
    const shouldBeVisible = scrollTop > threshold && hasContent;

    // 可见性改变时更新状态，避免复杂重渲染
    setIsVisible((prev) => {
      if (prev === shouldBeVisible) {
        return prev;
      }
      return shouldBeVisible;
    });
  }, [threshold, showOnlyWithContent]);

  // 平滑滚动到顶部
  const handleScrollToTop = useCallback((): void => {
    if (isScrolling) {
      return;
    }

    setIsScrolling(true);
    void scroll.scrollToTop({ duration: scrollDuration }).finally(() => {
      setIsScrolling(false);
    });
  }, [scrollDuration, isScrolling]);

  // 监听滚动事件
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let rafId: number | null = null;

    const handleScroll = (): void => {
      // 使用 requestAnimationFrame 节流
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        checkScrollPosition();
        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [checkScrollPosition]);

  const fabStyles = {
    position: "fixed" as const,
    bottom: isSmallScreen ? 16 : 24,
    right: isSmallScreen ? 16 : 24,
    zIndex: theme.zIndex.fab,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: theme.shadows[6],
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, 0.9),
      boxShadow: theme.shadows[8],
    },
    "&:active": {
      transform: "scale(0.95)",
      boxShadow: theme.shadows[6],
    },
    transition:
      "background-color 650ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 800ms cubic-bezier(0.4, 0, 0.2, 1), transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
    ...(isSmallScreen && {
      width: 48,
      height: 48,
      minHeight: 48,
    }),
    ...sx,
  };

  return (
    <Zoom
      in={isVisible}
      timeout={{
        enter: theme.transitions.duration.enteringScreen,
        exit: theme.transitions.duration.leavingScreen,
      }}
      style={{
        transitionDelay: isVisible ? "0ms" : "100ms",
      }}
    >
      <Tooltip title={t("ui.scrollToTop.aria")} placement="left" enterDelay={300}>
        <Fab
          size={isSmallScreen ? "medium" : "large"}
          aria-label={t("ui.scrollToTop.aria")}
          onClick={handleScrollToTop}
          disabled={isScrolling}
          sx={fabStyles}
        >
          <ArrowUpIcon
            fontSize={isSmallScreen ? "medium" : "large"}
            sx={{
              transition: theme.transitions.create("transform", {
                duration: theme.transitions.duration.short,
              }),
              transform: isScrolling ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Fab>
      </Tooltip>
    </Zoom>
  );
};

export default ScrollToTopFab;
