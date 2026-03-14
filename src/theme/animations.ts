/**
 * 动画定义模块
 *
 * 提供应用中使用的基础CSS动画，包括淡入淡出、缩放等效果。
 * 使用MUI的keyframes API定义，可用于styled-components或sx属性。
 */

import { keyframes } from "@mui/system";

/**
 * 淡入动画
 *
 * 元素渐变显示效果。
 */
export const fadeAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

/**
 * 淡出动画
 *
 * 元素渐变消失效果。
 */
export const fadeOutAnimation = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

/**
 * 缩放进入动画
 *
 * 元素放大淡入效果，用于空状态组件。
 */
export const scaleInAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;
