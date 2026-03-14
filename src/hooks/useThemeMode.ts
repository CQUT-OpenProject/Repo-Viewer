import { useState, useEffect, useMemo, useRef } from "react";
import type { PaletteMode } from "@mui/material";
import { logger } from "@/utils";
import { removeLatexElements, restoreLatexElements } from "@/utils/rendering/latexOptimizer";

const getSystemBasedMode = (): PaletteMode => {
  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    return mediaQuery.matches ? "dark" : "light";
  }
  return "light";
};

const shouldRefreshThemeColor = (): boolean => {
  const lastThemeColorDate = localStorage.getItem("lastThemeColorDate");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (lastThemeColorDate === null || lastThemeColorDate !== todayStr) {
    const daysSince1970 = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));

    if (daysSince1970 % 2 === 0) {
      localStorage.setItem("lastThemeColorDate", todayStr);
      return true;
    } else if (lastThemeColorDate !== todayStr) {
      localStorage.setItem("lastThemeColorDate", todayStr);
    }
  }

  return false;
};

/**
 * 主题模式Hook
 *
 * 管理应用的明暗主题模式，支持手动切换和跟随系统主题。
 * 包含主题切换动画和LaTeX元素优化处理。
 *
 * @returns 主题模式状态和切换函数
 */
export const useThemeMode = (): {
  /** 切换明暗模式 */
  toggleColorMode: () => void;
  /** 切换自动模式 */
  toggleAutoMode: () => void;
  /** 当前主题模式 */
  mode: PaletteMode;
  /** 是否为自动模式 */
  isAutoMode: boolean;
} => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedThemeData = localStorage.getItem("themeData");
    if (savedThemeData !== null) {
      try {
        const { mode, timestamp, isAutoMode } = JSON.parse(savedThemeData) as {
          mode: PaletteMode;
          timestamp: number;
          isAutoMode: boolean;
        };
        const currentTime = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        if (currentTime - timestamp < oneHour) {
          if (!isAutoMode) {
            return mode;
          }
        }
      } catch (e) {
        logger.error("读取主题数据时出错:", e);
      }
    }
    return getSystemBasedMode();
  });

  const [isAutoMode, setIsAutoMode] = useState<boolean>(() => {
    const savedThemeData = localStorage.getItem("themeData");
    if (savedThemeData !== null) {
      try {
        const { isAutoMode, timestamp } = JSON.parse(savedThemeData) as {
          isAutoMode?: boolean;
          timestamp: number;
        };
        const currentTime = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        if (currentTime - timestamp < oneHour) {
          return isAutoMode ?? true;
        }
      } catch {
        return true;
      }
    }
    return true;
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const modeRef = useRef(mode);
  const isAutoModeRef = useRef(isAutoMode);
  const isInitialRenderRef = useRef(true);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    isAutoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  useEffect(() => {
    if (shouldRefreshThemeColor()) {
      logger.info("每隔一天更新主题色");
      setTimeout(() => {
        setMode((prevMode) => prevMode);
      }, 100);
    }
  }, []);

  useEffect(() => {
    const themeData = JSON.stringify({
      mode,
      timestamp: new Date().getTime(),
      isAutoMode,
    });
    localStorage.setItem("themeData", themeData);

    const isInitialRender = isInitialRenderRef.current;
    if (isInitialRender) {
      isInitialRenderRef.current = false;
      document.documentElement.setAttribute("data-theme", mode);
      return;
    }

    removeLatexElements();

    // 发出主题切换开始事件
    window.dispatchEvent(new CustomEvent("theme:changing"));

    let transitionTimeout: number | null = null;

    const startTransition = window.setTimeout(() => {
      setIsTransitioning(true);
      document.body.classList.add("theme-transition");
      document.documentElement.setAttribute("data-theme", mode);

      transitionTimeout = window.setTimeout(() => {
        document.body.classList.remove("theme-transition");

        window.setTimeout(() => {
          setIsTransitioning(false);

          // 发出主题切换完成事件
          window.dispatchEvent(
            new CustomEvent("theme:changed", {
              detail: { mode, isAutoMode },
            }),
          );

          window.setTimeout(() => {
            restoreLatexElements();
          }, 100);
        }, 50);
      }, 600);
    }, 10);

    return () => {
      window.clearTimeout(startTransition);
      if (transitionTimeout !== null) {
        window.clearTimeout(transitionTimeout);
      }
      document.body.classList.remove("theme-transition");
    };
  }, [mode, isAutoMode]);

  useEffect(() => {
    if (!isAutoMode) {
      return;
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent): void => {
      if (isAutoModeRef.current) {
        const newMode = e.matches ? "dark" : "light";
        const currentMode = modeRef.current;
        if (newMode !== currentMode) {
          logger.info(`系统主题变化，自动切换主题模式: ${currentMode} -> ${newMode}`);
          modeRef.current = newMode;
          setMode(newMode);
        }
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [isAutoMode]);

  return useMemo(
    () => ({
      toggleColorMode: () => {
        if (!isTransitioning) {
          setIsAutoMode(false);
          const newMode = mode === "light" ? "dark" : "light";
          logger.info(`手动切换主题模式: ${mode} -> ${newMode}`);
          setMode(newMode);
        }
      },
      toggleAutoMode: () => {
        if (!isTransitioning) {
          const newAutoMode = !isAutoMode;
          logger.info(`切换自动主题模式: ${isAutoMode.toString()} -> ${newAutoMode.toString()}`);
          setIsAutoMode(newAutoMode);
          if (newAutoMode) {
            const systemBasedMode = getSystemBasedMode();
            if (systemBasedMode !== mode) {
              setMode(systemBasedMode);
            }
          }
        }
      },
      mode,
      isAutoMode,
    }),
    [mode, isAutoMode, isTransitioning],
  );
};
