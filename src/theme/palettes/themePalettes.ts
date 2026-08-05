/**
 * 品牌主题调色板
 *
 */

import { alpha } from "@mui/material/styles";
import type { ThemeColorConfig } from "./themeColors";
import { BRAND_COLORS } from "./brandColors";

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
  success: {
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
  divider: string;
}

export function getLightPalette(themeConfig: ThemeColorConfig): PaletteConfig {
  return {
    primary: themeConfig.light.primary,
    secondary: themeConfig.light.secondary,
    error: {
      main: BRAND_COLORS.statusDanger,
      light: "#FEE4E2",
      dark: "#912018",
      contrastText: BRAND_COLORS.neutral0,
    },
    success: {
      main: BRAND_COLORS.statusSuccess,
      light: "#D1FADF",
      dark: "#05603A",
      contrastText: BRAND_COLORS.neutral0,
    },
    background: {
      default: BRAND_COLORS.neutral50,
      paper: BRAND_COLORS.neutral0,
    },
    text: {
      primary: BRAND_COLORS.neutral900,
      secondary: BRAND_COLORS.neutral600,
      disabled: alpha(BRAND_COLORS.neutral900, 0.38),
    },
    divider: BRAND_COLORS.neutral200,
  };
}

export function getDarkPalette(themeConfig: ThemeColorConfig): PaletteConfig {
  return {
    primary: themeConfig.dark.primary,
    secondary: themeConfig.dark.secondary,
    error: {
      main: BRAND_COLORS.statusDangerDark,
      light: "#FEE4E2",
      dark: BRAND_COLORS.statusDanger,
      contrastText: BRAND_COLORS.neutral900,
    },
    success: {
      main: BRAND_COLORS.statusSuccessDark,
      light: "#D1FADF",
      dark: BRAND_COLORS.statusSuccess,
      contrastText: BRAND_COLORS.neutral900,
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
    divider: "#49454F",
  };
}
