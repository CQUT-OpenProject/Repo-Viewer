import { THEME_COLORS, type ThemeColorConfig } from "./palettes/themeColors";

/**
 * 获取基于日期的主题索引
 *
 * 根据当前日期计算主题索引，每天使用不同的主题。
 *
 * @returns 主题索引
 */
export function getThemeIndexByDate(): number {
  const today = new Date();
  const dayCount = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
  return dayCount % THEME_COLORS.length;
}

/**
 * 获取当前主题配置
 *
 * @returns 当前主题配置对象
 */
export function getCurrentTheme(): ThemeColorConfig {
  const index = getThemeIndexByDate();
  const theme = THEME_COLORS[index];
  if (theme === undefined) {
    throw new Error(`Invalid theme index: ${index.toString()}`);
  }
  return theme;
}

/**
 * 获取当前主题名称
 *
 * @returns 当前主题的显示名称
 */
export function getCurrentThemeName(): string {
  return getCurrentTheme().name;
}
