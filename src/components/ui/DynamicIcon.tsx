/**
 * 动态图标组件模块
 *
 * 提供根据当前主题自动切换应用图标和favicon的功能。
 * 包含动态图标显示组件和favicon管理组件。
 */

import React from "react";
import { useFaviconUpdater } from "@/hooks/useDynamicIcon";
import { logger } from "@/utils/logging/logger";

/**
 * Favicon管理组件
 *
 * 用于管理浏览器标签页favicon的独立组件，根据当前主题自动切换favicon图标。
 * 此组件不渲染任何UI元素。
 */
export const FaviconManager: React.FC = () => {
  useFaviconUpdater();

  // 添加调试信息
  React.useEffect(() => {
    logger.info("[FaviconManager] 初始化完成");
  }, []);

  return null;
};
