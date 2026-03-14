/**
 * G3曲线工具函数
 * G3曲线提供比普通圆角更平滑的连续性，具有连续的曲率变化
 * 通过CSS的border-radius和clip-path结合实现G3曲线效果
 */

/**
 * 配置接口
 */
export interface G3CurveConfig {
  /** 基础半径大小 */
  radius: number;
  /** 曲率平滑度 (0-1，越大越平滑) */
  smoothness?: number;
}

/**
 * 默认曲线配置
 */
const DEFAULT_G3_CONFIG: Required<G3CurveConfig> = {
  radius: 16,
  smoothness: 0.6,
};

/**
 * 创建G3曲线边框半径
 *
 * 根据配置生成带有G3曲线效果的CSS border-radius值。
 *
 * @param config - G3曲线配置
 * @returns CSS边框半径字符串
 */
export function createG3BorderRadius(config: G3CurveConfig): string {
  const { radius, smoothness = DEFAULT_G3_CONFIG.smoothness } = config;
  const adjustedRadius = radius * (1.0 + smoothness * 0.6);
  return `${Math.round(adjustedRadius).toString()}px`;
}

// 预定义的曲线配置
export const G3_PRESETS = {
  // 文件列表项
  fileListItem: {
    radius: 14,
    smoothness: 0.8,
  } as G3CurveConfig,

  // 文件列表容器
  fileListContainer: {
    radius: 20,
    smoothness: 0.8,
  } as G3CurveConfig,

  // 卡片
  card: {
    radius: 20,
    smoothness: 0.5,
  } as G3CurveConfig,

  // 按钮
  button: {
    radius: 24,
    smoothness: 0.8,
  } as G3CurveConfig,

  // 对话框
  dialog: {
    radius: 28,
    smoothness: 0.4,
  } as G3CurveConfig,

  // 图片
  image: {
    radius: 16,
    smoothness: 0.6,
  } as G3CurveConfig,

  // 面包屑导航
  breadcrumb: {
    radius: 28,
    smoothness: 1.0,
  } as G3CurveConfig,

  // 面包屑项
  breadcrumbItem: {
    radius: 28,
    smoothness: 1.0,
  } as G3CurveConfig,

  // 提示框
  tooltip: {
    radius: 16,
    smoothness: 0.5,
  } as G3CurveConfig,

  // 骨架线条
  skeletonLine: {
    radius: 8,
    smoothness: 0.8,
  } as G3CurveConfig,
} as const;

/**
 * 响应式圆角配置接口
 */
export interface ResponsiveG3Config {
  desktop: G3CurveConfig;
  mobile: G3CurveConfig;
}

/**
 * 预定义的响应式圆角配置
 */
export const RESPONSIVE_G3_PRESETS = {
  // 文件列表容器 - 响应式
  fileListContainer: {
    desktop: { radius: 20, smoothness: 0.8 },
    mobile: { radius: 16, smoothness: 0.8 },
  } as ResponsiveG3Config,

  // README预览容器 - 响应式
  readmeContainer: {
    desktop: { radius: 20, smoothness: 0.8 },
    mobile: { radius: 16, smoothness: 0.8 },
  } as ResponsiveG3Config,

  // 卡片 - 响应式
  card: {
    desktop: { radius: 20, smoothness: 0.5 },
    mobile: { radius: 16, smoothness: 0.5 },
  } as ResponsiveG3Config,
} as const;

/**
 * 获取响应式圆角样式
 *
 * 根据屏幕大小返回对应的边框半径。
 *
 * @param preset - 响应式G3配置
 * @param isSmallScreen - 是否为小屏幕
 * @returns CSS边框半径字符串
 */
export function getResponsiveG3BorderRadius(
  preset: ResponsiveG3Config,
  isSmallScreen: boolean,
): string {
  const config = isSmallScreen ? preset.mobile : preset.desktop;
  return createG3BorderRadius(config);
}

/**
 * 响应式G3样式工具集
 *
 * 提供响应式预设配置的快捷访问方法。
 */
export const responsiveG3Styles = {
  fileListContainer: (isSmallScreen: boolean) =>
    getResponsiveG3BorderRadius(RESPONSIVE_G3_PRESETS.fileListContainer, isSmallScreen),
  readmeContainer: (isSmallScreen: boolean) =>
    getResponsiveG3BorderRadius(RESPONSIVE_G3_PRESETS.readmeContainer, isSmallScreen),
  card: (isSmallScreen: boolean) =>
    getResponsiveG3BorderRadius(RESPONSIVE_G3_PRESETS.card, isSmallScreen),
};

/**
 * G3边框半径快捷函数
 *
 * 用于Emotion styled-components的简化API。
 *
 * @param config - G3曲线配置
 * @returns CSS边框半径字符串
 */
export function g3BorderRadius(config: G3CurveConfig): string {
  return createG3BorderRadius(config);
}
