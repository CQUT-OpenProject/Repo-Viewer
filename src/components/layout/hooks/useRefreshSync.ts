import { useEffect, useRef } from "react";
import { GitHub } from "@/services/github";
import { logger } from "@/utils/logging/logger";

interface UseRefreshSyncOptions {
  handleRefresh: () => void;
  refreshBranches: () => Promise<void> | void;
}

function isReloadNavigation(): boolean {
  try {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const navigationEntry = entries[0];
    if (navigationEntry !== undefined) {
      return navigationEntry.type === "reload";
    }
  } catch (error) {
    logger.debug("检测浏览器刷新时发生错误", error);
  }
  return false;
}

/**
 * 硬刷新时清缓存并触发内容/分支刷新。
 * path / branch 由 URL（含 ?branch=）恢复，不再写 sessionStorage。
 */
export function useRefreshSync({ handleRefresh, refreshBranches }: UseRefreshSyncOptions): void {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || !isReloadNavigation()) {
      return;
    }
    handledRef.current = true;

    let isActive = true;

    const run = async (): Promise<void> => {
      try {
        await GitHub.Cache.clearCache();
      } catch (error) {
        logger.error("清除缓存失败:", error);
      }
      if (!isActive) {
        return;
      }
      logger.info("检测到浏览器刷新，执行同步刷新逻辑");
      handleRefresh();
      void refreshBranches();
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [handleRefresh, refreshBranches]);
}
