/**
 * 品牌主题配色
 *
 * 单一固定主题，遵循 CQUT-OSP 设计规范。
 * @see https://cqut-openproject.github.io/.github/brand/color/
 */

import { BRAND_COLORS } from "./brandColors";

export interface ThemeColorConfig {
  name: string;
  light: {
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
  };
  dark: {
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
  };
}

/** 应用唯一品牌主题 */
export const BRAND_THEME: ThemeColorConfig = {
  name: "brand",
  light: {
    primary: {
      main: BRAND_COLORS.blue700,
      light: BRAND_COLORS.blue100,
      dark: BRAND_COLORS.actionPrimaryHover,
      contrastText: BRAND_COLORS.neutral0,
    },
    secondary: {
      main: BRAND_COLORS.mint400,
      light: "#E8FBF2",
      dark: "#4BC98A",
      contrastText: BRAND_COLORS.neutral900,
    },
  },
  dark: {
    primary: {
      main: BRAND_COLORS.softBlue,
      light: "#C5D9FC",
      dark: BRAND_COLORS.actionPrimaryHoverDark,
      contrastText: BRAND_COLORS.neutral900,
    },
    secondary: {
      main: BRAND_COLORS.mint400,
      light: "#E8FBF2",
      dark: "#4BC98A",
      contrastText: BRAND_COLORS.neutral900,
    },
  },
};
