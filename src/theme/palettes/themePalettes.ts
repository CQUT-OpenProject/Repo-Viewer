/**
 * 主题调色板配置模块
 *
 * 提供基于主题配色方案生成MUI调色板配置的功能，
 * 包括浅色模式和深色模式的完整调色板定义。
 */

import { alpha } from "@mui/material/styles";
import type { ThemeColorConfig } from "./themeColors";

/**
 * 调色板配置接口
 *
 * 定义MUI主题所需的完整调色板结构，包括主色、次色、错误色、背景和文字颜色。
 */
export interface PaletteConfig {
  primary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  error: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  background: {
    default: string;
    paper: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

/**
 * 浅色模式调色板配置
 */
export function getLightPalette(themeConfig: ThemeColorConfig): PaletteConfig {
  return {
    primary: themeConfig.light.primary,
    secondary: themeConfig.light.secondary,
    error: {
      main: "#B3261E",
      light: "#F9DEDC",
      dark: "#601410",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#FFFBFE",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1C1B1F",
      secondary: "#49454F",
      disabled: alpha("#1C1B1F", 0.38),
    },
  };
}

/**
 * 深色模式调色板配置
 */
export function getDarkPalette(themeConfig: ThemeColorConfig): PaletteConfig {
  return {
    primary: themeConfig.dark.primary,
    secondary: themeConfig.dark.secondary,
    error: {
      main: "#F2B8B5",
      light: "#F9DEDC",
      dark: "#B3261E",
      contrastText: "#601410",
    },
    background: {
      default: "#1C1B1F",
      paper: "#2D2C34",
    },
    text: {
      primary: "#E6E1E5",
      secondary: "#CAC4D0",
      disabled: alpha("#E6E1E5", 0.38),
    },
  };
}
