import { useState, useEffect } from "react";
import { getCurrentThemeName } from "@/theme/index";

const DEFAULT_ICON = "/icons/icon-pink.svg";

const themeIconMap: Readonly<Record<string, string>> = {
  default: DEFAULT_ICON,
  blue: "/icons/icon-blue.svg",
  green: "/icons/icon-green.svg",
  purple: "/icons/icon-purple.svg",
  orange: "/icons/icon-orange.svg",
  red: "/icons/icon-red.svg",
  cyan: "/icons/icon-cyan.svg",
};

const getThemeIconPath = (): string => {
  try {
    return themeIconMap[getCurrentThemeName()] ?? DEFAULT_ICON;
  } catch {
    return DEFAULT_ICON;
  }
};

const useDynamicIcon = (): { iconPath: string } => {
  const [iconPath, setIconPath] = useState<string>(getThemeIconPath);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const updateIcon = (): void => {
      setIconPath(getThemeIconPath());
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          updateIcon();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return { iconPath };
};

/**
 * 根据主题更新 favicon
 */
export const useFaviconUpdater = (): string => {
  const { iconPath } = useDynamicIcon();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const href = `${iconPath}?v=${String(Date.now())}`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link === null) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [iconPath]);

  return iconPath;
};
