import { useEffect, useRef } from "react";
import { GitHub } from "@/services/github";
import { logger } from "@/utils/logging/logger";
import type { NavigationDirection } from "@/contexts/unified";

interface RefreshSessionState {
  version: number;
  branch?: string;
  path?: string;
  timestamp: number;
}

interface UseRefreshSyncOptions {
  handleRefresh: () => void;
  refreshBranches: () => Promise<void> | void;
  currentBranch: string;
  currentPath: string;
  setCurrentBranch: (branch: string) => void;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
}

const BROWSER_REFRESH_FLAG = "repo-viewer:pending-refresh";

function readStoredRefreshState(): RefreshSessionState | null {
  try {
    const raw = sessionStorage.getItem(BROWSER_REFRESH_FLAG);
    if (raw === null) {
      return null;
    }

    if (raw === "1") {
      return {
        version: 0,
        timestamp: Date.now(),
      };
    }

    const parsed = JSON.parse(raw) as Partial<RefreshSessionState> | null;

    if (parsed === null || typeof parsed !== "object") {
      return null;
    }

    const state: RefreshSessionState = {
      version: typeof parsed.version === "number" ? parsed.version : 0,
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
    };

    if (typeof parsed.branch === "string") {
      state.branch = parsed.branch;
    }

    if (typeof parsed.path === "string") {
      state.path = parsed.path;
    }

    return state;
  } catch (error) {
    logger.debug("解析刷新状态标记失败", error);
    return null;
  }
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

function shouldTriggerRefresh(): boolean {
  if (readStoredRefreshState() !== null) {
    return true;
  }

  try {
    if (sessionStorage.getItem(BROWSER_REFRESH_FLAG) === "1") {
      return true;
    }
  } catch (error) {
    logger.debug("读取刷新状态标记失败", error);
  }

  return isReloadNavigation();
}

export function useRefreshSync({
  handleRefresh,
  refreshBranches,
  currentBranch,
  currentPath,
  setCurrentBranch,
  setCurrentPath,
}: UseRefreshSyncOptions): void {
  const refreshSyncHandledRef = useRef<boolean>(false);
  const branchValueRef = useRef(currentBranch);
  const pathValueRef = useRef(currentPath);
  branchValueRef.current = currentBranch;
  pathValueRef.current = currentPath;

  useEffect(() => {
    const handleBeforeUnload = (): void => {
      try {
        const state: RefreshSessionState = {
          version: 1,
          branch: branchValueRef.current,
          path: pathValueRef.current,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(BROWSER_REFRESH_FLAG, JSON.stringify(state));
      } catch (error) {
        logger.debug("无法在刷新前缓存状态标记", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (refreshSyncHandledRef.current) {
      return;
    }

    let isActive = true;

    if (!shouldTriggerRefresh()) {
      return () => {
        isActive = false;
      };
    }

    refreshSyncHandledRef.current = true;

    try {
      sessionStorage.removeItem(BROWSER_REFRESH_FLAG);
    } catch (error) {
      logger.debug("移除刷新状态标记失败", error);
    }

    const storedState = readStoredRefreshState();

    const applyStoredState = (): void => {
      if (storedState === null) {
        return;
      }

      const targetBranch = typeof storedState.branch === "string" ? storedState.branch.trim() : "";
      const targetPath = typeof storedState.path === "string" ? storedState.path : null;
      let branchChanged = false;

      if (targetBranch.length > 0 && targetBranch !== branchValueRef.current) {
        setCurrentBranch(targetBranch);
        branchChanged = true;
      }

      if (targetPath !== null) {
        const restorePath = (): void => {
          setCurrentPath(targetPath, "none");
        };

        if (branchChanged) {
          window.setTimeout(restorePath, 0);
        } else if (targetPath !== pathValueRef.current) {
          restorePath();
        }
      }
    };

    applyStoredState();

    const runRefresh = async (): Promise<void> => {
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

    if (storedState !== null) {
      const schedule =
        typeof window.requestAnimationFrame === "function"
          ? window.requestAnimationFrame.bind(window)
          : (callback: FrameRequestCallback): void => {
              window.setTimeout(() => {
                callback(performance.now());
              }, 0);
            };

      schedule(() => {
        void runRefresh();
      });
    } else {
      void runRefresh();
    }

    return () => {
      isActive = false;
    };
  }, [handleRefresh, refreshBranches, setCurrentBranch, setCurrentPath]);
}
