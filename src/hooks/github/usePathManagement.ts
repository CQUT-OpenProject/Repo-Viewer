import { useState, useEffect, useCallback, useRef } from "react";
import type { NavigationDirection } from "@/contexts/unified";
import {
  getPathFromUrl,
  updateUrlWithHistory,
  updateUrlWithoutHistory,
} from "@/utils/routing/urlManager";
import { logger } from "@/utils";
import type { PathManagementState } from "./types";

/**
 * 路径管理 Hook
 *
 * 管理当前路径、导航方向和 URL 同步
 *
 * @param branch - 当前分支名称
 * @returns 路径管理状态和操作函数
 */
export function usePathManagement(branch: string): PathManagementState {
  const [isThemeChanging, setIsThemeChanging] = useState<boolean>(false);

  // 尝试从URL获取路径
  const getSavedPath = (): string => {
    try {
      const urlPath = getPathFromUrl();
      if (urlPath !== "") {
        logger.debug(`从URL获取路径: ${urlPath}`);
        return urlPath;
      }
      return "";
    } catch (e) {
      logger.error("获取路径失败", e);
      return "";
    }
  };

  // 监听主题切换事件
  useEffect(() => {
    const handleThemeChanging = (): void => {
      setIsThemeChanging(true);
    };

    const handleThemeChanged = (): void => {
      setIsThemeChanging(false);
    };

    window.addEventListener("theme:changing", handleThemeChanging);
    window.addEventListener("theme:changed", handleThemeChanged);

    return () => {
      window.removeEventListener("theme:changing", handleThemeChanging);
      window.removeEventListener("theme:changed", handleThemeChanged);
    };
  }, []);

  const [currentPath, setCurrentPathState] = useState<string>(getSavedPath());
  const [navigationDirection, setNavigationDirection] = useState<NavigationDirection>("none");

  const isInitialLoad = useRef<boolean>(true);
  const currentPathRef = useRef<string>(currentPath);
  const currentBranchRef = useRef<string>(branch);
  const isRefreshInProgressRef = useRef(false);
  const refreshTargetPathRef = useRef<string | null>(null);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    currentBranchRef.current = branch;
  }, [branch]);

  const setCurrentPath = useCallback((path: string, direction: NavigationDirection = "none") => {
    if (isRefreshInProgressRef.current && refreshTargetPathRef.current !== null) {
      if (path !== refreshTargetPathRef.current) {
        if (direction === "none") {
          logger.debug(`刷新期间忽略路径更新: ${path}`);
          return;
        }
        logger.debug(`刷新期间检测到用户导航，取消路径锁定: ${path}`);
        isRefreshInProgressRef.current = false;
        refreshTargetPathRef.current = null;
      }
    }

    setNavigationDirection(direction);
    setCurrentPathState(path);
  }, []);

  // 处理路径变化时的 URL 更新
  useEffect(() => {
    // 主题切换期间跳过 URL 更新
    if (isThemeChanging) {
      return;
    }

    // 只有在非初始加载时更新URL
    if (!isInitialLoad.current) {
      updateUrlWithHistory(currentPath, undefined, currentBranchRef.current);
    } else {
      // 初始加载时，如果URL中已有path参数，则不需要更新URL
      const urlPath = getPathFromUrl();
      if (currentPath !== urlPath) {
        updateUrlWithoutHistory(currentPath, undefined, currentBranchRef.current);
      }
      isInitialLoad.current = false;
    }
  }, [currentPath, isThemeChanging]);

  // 同步分支变化到 URL 查询参数
  useEffect(() => {
    if (isThemeChanging || isInitialLoad.current) {
      return;
    }

    updateUrlWithoutHistory(currentPathRef.current, undefined, branch);
  }, [branch, isThemeChanging]);

  // 监听浏览器历史导航事件
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      if (isRefreshInProgressRef.current) {
        logger.debug("刷新进行中，忽略历史导航事件");
        return;
      }

      logger.debug("路径管理器: 检测到历史导航事件");

      const state = event.state as { path?: string; preview?: string; branch?: string } | null;
      logger.debug(`历史状态: ${JSON.stringify(state)}`);

      if (state?.path !== undefined) {
        logger.debug(`历史导航事件，路径: ${state.path}`);
        setCurrentPath(state.path, "backward");
      } else {
        const urlPath = getPathFromUrl();
        if (urlPath !== "") {
          logger.debug(`历史导航事件，从URL获取路径: ${urlPath}`);
          setCurrentPath(urlPath, "backward");
        } else {
          logger.debug("历史导航事件，无路径状态，重置为根路径");
          setCurrentPath("", "backward");
        }
      }
    };

    // 处理标题点击导航到首页事件
    const handleNavigateToHome = (): void => {
      if (isRefreshInProgressRef.current) {
        logger.debug("刷新进行中，忽略返回首页事件");
        return;
      }

      logger.debug("接收到返回首页事件，正在导航到首页");
      setCurrentPath("", "backward");
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("navigate-to-home", handleNavigateToHome as EventListener);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("navigate-to-home", handleNavigateToHome as EventListener);
    };
  }, [setCurrentPath]);

  // 设置刷新状态（供其他 Hook 使用）
  const setRefreshState = useCallback((isRefreshing: boolean, targetPath?: string) => {
    isRefreshInProgressRef.current = isRefreshing;
    refreshTargetPathRef.current = targetPath ?? null;
  }, []);

  return {
    currentPath,
    navigationDirection,
    setCurrentPath,
    setRefreshState,
    setNavigationDirection,
  };
}
