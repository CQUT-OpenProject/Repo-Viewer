/**
 * @fileoverview 动态图标 Hook
 *
 * 根据当前主题自动切换网站图标(favicon)和提供主题对应的图标路径。
 * 监听多种主题变化来源：DOM属性变化、localStorage变化、MutationObserver。
 *
 * @module hooks/useDynamicIcon
 */

import { useState, useEffect } from "react";
import { getCurrentThemeName } from "@/theme/index";
import { logger } from "@/utils";

/** 默认图标路径 */
const DEFAULT_ICON = "/icons/icon-pink.svg";

/** 主题名称到图标路径的映射表 */
const themeIconMap: Readonly<Record<string, string>> = {
  默认: DEFAULT_ICON,
  蓝色: "/icons/icon-blue.svg",
  绿色: "/icons/icon-green.svg",
  紫色: "/icons/icon-purple.svg",
  橙色: "/icons/icon-orange.svg",
  红色: "/icons/icon-red.svg",
  青色: "/icons/icon-cyan.svg",
};

/**
 * 获取当前主题的图标路径
 *
 * @returns 当前主题对应的图标路径，失败时返回默认图标
 */
const getThemeIconPath = (): string => {
  try {
    const currentTheme = getCurrentThemeName();
    return themeIconMap[currentTheme] ?? DEFAULT_ICON;
  } catch (error) {
    logger.error("获取当前主题名称失败:", error);
    return DEFAULT_ICON;
  }
};

/**
 * 动态图标 Hook 返回值接口
 */
interface DynamicIconHook {
  /** 当前图标路径 */
  iconPath: string;
  /** 更新图标 */
  updateIcon: () => void;
  /** 获取当前主题图标路径 */
  getCurrentThemeIconPath: () => string;
}

/**
 * 动态图标Hook
 *
 * 根据当前主题返回对应的图标路径，自动监听主题变化。
 *
 * @returns 动态图标状态和操作函数
 */
export const useDynamicIcon = (): DynamicIconHook => {
  const [iconPath, setIconPath] = useState<string>(getThemeIconPath);

  const updateIcon = (): void => {
    setIconPath(getThemeIconPath());
  };

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    logger.info("[DynamicIcon] 初始化动态图标系统");

    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "data-theme" || mutation.attributeName === "class")
        ) {
          logger.debug("[DynamicIcon] 通过MutationObserver检测到主题变化");
          updateIcon();
        }
      });
    });

    // 监听document和html元素的属性变化
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === "colorMode" || e.key === "themeData" || e.key === "lastThemeColorDate") {
        logger.debug("[DynamicIcon] 通过localStorage检测到主题变化:", e.key);
        setTimeout(updateIcon, 100);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return {
    iconPath,
    updateIcon,
    getCurrentThemeIconPath: (): string => {
      const currentTheme = getCurrentThemeName();
      return themeIconMap[currentTheme] ?? DEFAULT_ICON;
    },
  };
};

/**
 * Favicon更新Hook
 *
 * 自动根据主题变化更新网站的favicon图标。
 *
 * @returns 当前favicon路径
 */
export const useFaviconUpdater = (): string => {
  const { iconPath } = useDynamicIcon();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const updateFavicon = (): void => {
      // 移除所有现有的favicon相关链接
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach((linkNode) => {
        if (linkNode instanceof HTMLLinkElement) {
          logger.debug("[DynamicIcon] 移除现有的favicon:", linkNode.href);
        }
        linkNode.remove();
      });

      // 强制等待一点时间确保DOM更新
      setTimeout(() => {
        const timestamp = Date.now().toString();

        // 创建主要的favicon链接
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/svg+xml";
        favicon.href = `${iconPath}?v=${timestamp}`;
        document.head.appendChild(favicon);

        // 创建备用的shortcut icon
        const shortcutIcon = document.createElement("link");
        shortcutIcon.rel = "shortcut icon";
        shortcutIcon.type = "image/svg+xml";
        shortcutIcon.href = `${iconPath}?v=${timestamp}`;
        document.head.appendChild(shortcutIcon);

        logger.info("[DynamicIcon] Favicon已更新为:", `${iconPath}?v=${timestamp}`);

        // 强制触发浏览器重新加载favicon
        const linkElement = document.querySelector('link[rel="icon"]');
        if (linkElement instanceof HTMLLinkElement) {
          linkElement.setAttribute("href", `${iconPath}?v=${timestamp}`);
        }
      }, 10);
    };

    updateFavicon();
  }, [iconPath]);

  return iconPath;
};
