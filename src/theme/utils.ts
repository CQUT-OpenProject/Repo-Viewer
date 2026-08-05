import { BRAND_THEME, type ThemeColorConfig } from "./palettes/themeColors";

/** 返回固定的品牌主题配置 */
export function getCurrentTheme(): ThemeColorConfig {
  return BRAND_THEME;
}

/** 返回品牌主题名称 */
export function getCurrentThemeName(): string {
  return BRAND_THEME.name;
}
