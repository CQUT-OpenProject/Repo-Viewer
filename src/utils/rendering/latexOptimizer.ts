import { logger } from "../logging/logger";

const STYLE_ID = "latex-optimizer-styles";

const OPTIMIZER_CSS = `
  body.theme-transition .katex-display,
  body.theme-transition .katex {
    visibility: hidden !important;
    opacity: 0 !important;
    transition: none !important;
  }
`;

/** no-op：body.theme-transition 下 CSS 已隐藏公式 */
export const removeLatexElements = (): void => {};

/** no-op：与 remove 对称 */
export const restoreLatexElements = (): void => {};

export const countLatexElements = (): number => {
  return document.querySelectorAll(".katex-display, .katex:not(.katex-display .katex)").length;
};

/**
 * 注入过渡期 KaTeX 隐藏样式（调用方负责 body.theme-transition）
 */
export const setupLatexOptimization = (): (() => void) => {
  if (document.getElementById(STYLE_ID) === null) {
    const styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    styleElement.textContent = OPTIMIZER_CSS;
    document.head.appendChild(styleElement);
    logger.debug("LaTeX 过渡样式已注入（CSS-only）");
  }

  return () => {
    document.getElementById(STYLE_ID)?.remove();
  };
};
