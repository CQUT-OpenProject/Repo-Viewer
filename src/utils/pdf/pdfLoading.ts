import type { Theme } from "@mui/material";

/**
 * PDF加载页面主题颜色接口
 */
export interface PDFLoadingThemeColors {
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  outline: string;
  outlineVariant: string;
  isDark: boolean;
}

/**
 * PDF加载页面翻译文本接口
 */
export interface PDFLoadingTranslations {
  loading: string;
  cancel: string;
  cancelled: string;
  loadFailed: string;
  openOriginal: string;
  viewerTitle: string;
  downloaded: string;
  downloadedWithProgress: string;
}

/**
 * 从MUI主题提取PDF页面颜色
 *
 * @param muiTheme - Material-UI主题对象
 * @returns PDF主题颜色配置
 */
export const extractPDFThemeColors = (muiTheme: Theme): PDFLoadingThemeColors => {
  const palette = muiTheme.palette;
  return {
    primary: palette.primary.main,
    onPrimary: palette.primary.contrastText,
    secondary: palette.secondary.main,
    onSecondary: palette.secondary.contrastText,
    background: palette.background.default,
    surface: palette.background.paper,
    text: palette.text.primary,
    textSecondary: palette.text.secondary,
    outline: palette.divider,
    outlineVariant: palette.action.disabled,
    isDark: palette.mode === "dark",
  };
};

/**
 * 生成PDF加载页面的完整HTML内容
 *
 * @param fileName - PDF文件名
 * @param themeColors - 主题色配置
 * @param translations - 翻译文本配置
 * @returns 完整的HTML字符串
 */
export const generatePDFLoadingHTML = (
  fileName: string,
  themeColors: PDFLoadingThemeColors,
  translations: PDFLoadingTranslations,
): string => {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>加载 ${fileName}...</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html, body {
      height: 100%; margin: 0; padding: 0;
      font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* 使用全局 MUI 主题色 */
    :root {
      --md-sys-color-surface: ${themeColors.background};
      --md-sys-color-on-surface: ${themeColors.text};
      --md-sys-color-surface-variant: ${themeColors.surface};
      --md-sys-color-on-surface-variant: ${themeColors.textSecondary};
      --md-sys-color-primary: ${themeColors.primary};
      --md-sys-color-on-primary: ${themeColors.onPrimary};
      --md-sys-color-secondary: ${themeColors.secondary};
      --md-sys-color-on-secondary: ${themeColors.onSecondary};
      --md-sys-color-primary-container: ${themeColors.surface};
      --md-sys-color-on-primary-container: ${themeColors.text};
      --md-sys-color-outline: ${themeColors.outline};
      --md-sys-color-outline-variant: ${themeColors.outlineVariant};
      --md-elevation-1: 0px 1px 2px rgba(0, 0, 0, ${themeColors.isDark ? "0.3" : "0.1"}), 0px 1px 3px 1px rgba(0, 0, 0, ${themeColors.isDark ? "0.15" : "0.05"});
    }

    body {
      background-color: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
    }

    #loader {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      padding: 24px;
    }

    .loading-card {
      background-color: var(--md-sys-color-surface-variant);
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: var(--md-elevation-1);
      max-width: 320px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    /* Material 3 Circular Progress Indicator */
    .progress-circular {
      width: 48px;
      height: 48px;
      position: relative;
      flex-shrink: 0;
    }

    .progress-circular svg {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }

    .progress-track {
      fill: none;
      stroke: var(--md-sys-color-outline-variant);
      stroke-width: 4;
      stroke-linecap: round;
      opacity: 0.3;
      transform-origin: center;
    }

    .progress-indicator {
      fill: none;
      stroke: var(--md-sys-color-primary);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-dasharray: 126;
      stroke-dashoffset: 126;
      transform-origin: center;
      animation: progress-spin 1.5s linear infinite;
    }

    .progress-indicator.determinate {
      animation: none;
      transition: stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes progress-spin {
      0% {
        transform: rotate(-90deg);
        stroke-dashoffset: 126;
      }
      50% {
        transform: rotate(270deg);
        stroke-dashoffset: 31.5;
      }
      100% {
        transform: rotate(630deg);
        stroke-dashoffset: 126;
      }
    }

    .loading-text {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 18px;
      font-weight: 400;
      line-height: 26px;
      margin: 0;
    }

    .progress-text {
      color: var(--md-sys-color-primary);
      font-size: 12px;
      font-weight: 500;
      line-height: 18px;
      margin: 0;
      min-height: 18px;
    }

    /* 取消按钮样式 - 使用副主题色 */
    .cancel-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: 20px;
      background-color: transparent;
      border: 1px solid var(--md-sys-color-secondary);
      color: var(--md-sys-color-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      line-height: 18px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      margin-top: 12px;
      min-width: 72px;
    }

    .cancel-button:hover {
      background-color: var(--md-sys-color-secondary);
      color: var(--md-sys-color-on-secondary);
      transform: translateY(-1px);
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.2);
    }

    .cancel-button:active {
      transform: translateY(0);
      box-shadow: none;
    }

    #viewer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border: 0;
      visibility: hidden;
      background: var(--md-sys-color-surface);
    }

    .error-card {
      background-color: var(--md-sys-color-surface-variant);
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: var(--md-elevation-1);
      max-width: 400px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .error-title {
      color: var(--md-sys-color-on-surface);
      font-size: 18px;
      font-weight: 500;
      line-height: 24px;
      margin: 0;
    }

    .error-message {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
      margin: 0;
    }

    .error-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 24px;
      border-radius: 20px;
      background-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--md-elevation-1);
      margin-top: 8px;
    }

    .error-action:hover {
      box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
      background-color: var(--md-sys-color-primary);
      transform: translateY(-1px);
    }

    /* 响应式设计 */
    @media (max-width: 600px) {
      #loader { padding: 16px; gap: 20px; }
      .loading-card, .error-card {
        padding: 24px 20px;
        border-radius: 20px;
        max-width: none;
      }
      .loading-text { font-size: 16px; }
      .progress-text { font-size: 11px; }
      .cancel-button {
        font-size: 12px;
        padding: 6px 12px;
        margin-top: 8px;
      }
      .error-title { font-size: 16px; }
      .error-message { font-size: 13px; }
      .error-action { padding: 8px 16px; font-size: 13px; }
    }
  </style>
</head>
<body>
  <div id="loader">
    <div class="loading-card">
      <div class="progress-circular">
        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <circle class="progress-track" cx="24" cy="24" r="20"></circle>
          <circle class="progress-indicator" id="progress-circle" cx="24" cy="24" r="20"></circle>
        </svg>
      </div>
      <p class="loading-text" id="status">${translations.loading}</p>
      <p class="progress-text" id="progress"></p>
      <button class="cancel-button" id="cancel-btn" onclick="cancelDownload()">${translations.cancel}</button>
    </div>
  </div>
  <iframe id="viewer" title="${translations.viewerTitle}"></iframe>
  <script>
    function cancelDownload() {
      if (window.abortController) {
        window.abortController.abort();
        document.getElementById('status').textContent = '${translations.cancelled}';
        document.getElementById('progress').textContent = '';
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
          cancelBtn.style.display = 'none';
        }
        setTimeout(() => {
          window.close();
        }, 1500);
      }
    }
  </script>
</body>
</html>`;
};

/**
 * 生成错误页面HTML
 *
 * @param fileName - PDF文件名
 * @param errorMessage - 错误信息
 * @param downloadUrl - 原始下载链接
 * @param themeColors - 主题色配置
 * @param translations - 翻译文本配置
 * @returns 错误页面HTML字符串
 */
export const generatePDFErrorHTML = (
  fileName: string,
  errorMessage: string,
  downloadUrl: string,
  themeColors: PDFLoadingThemeColors,
  translations: PDFLoadingTranslations,
): string => {
  const inlineStyles = `
    background-color: ${themeColors.surface};
    color: ${themeColors.text};
  `;
  const titleColor = themeColors.text;
  const messageColor = themeColors.textSecondary;
  const actionBg = themeColors.primary;
  const actionColor = themeColors.onPrimary;
  return `
    <div class="error-card" style="${inlineStyles}">
      <h2 class="error-title" style="color: ${titleColor};">${translations.loadFailed.replace("@@fileName@@", fileName)}</h2>
      <p class="error-message" style="color: ${messageColor};">${errorMessage}</p>
      <a href="${downloadUrl}" target="_self" rel="noopener" class="error-action" style="background-color: ${actionBg}; color: ${actionColor};">
        ${translations.openOriginal}
      </a>
    </div>
  `;
};
