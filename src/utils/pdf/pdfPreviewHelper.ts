/**
 * PDF 预览辅助工具
 *
 * 提供 PDF 文件在新标签页中预览的完整功能，包括：
 * - 加载进度显示
 * - 取消下载支持
 * - 错误处理
 * - 主题色彩支持
 *
 * @module pdfPreviewHelper
 */

import type { Theme } from "@mui/material";
import {
  extractPDFThemeColors,
  generatePDFLoadingHTML,
  generatePDFErrorHTML,
  type PDFLoadingTranslations,
} from "./pdfLoading";

/**
 * PDF 预览配置选项
 */
export interface PDFPreviewOptions {
  /** PDF 文件名 */
  fileName: string;
  /** 下载 URL */
  downloadUrl: string;
  /** 服务端代理 URL（可选） */
  serverProxyUrl?: string;
  /** MUI 主题对象 */
  theme: Theme;
  /** 翻译文本 */
  translations: PDFLoadingTranslations;
  /** 是否是开发环境 */
  isDev?: boolean;
}

/**
 * 初始化 PDF 预览窗口
 *
 * @param fileName - PDF 文件名
 * @param theme - MUI 主题对象
 * @param translations - 翻译文本
 * @returns 新打开的窗口对象或 null
 */
function initializePDFWindow(
  fileName: string,
  theme: Theme,
  translations: PDFLoadingTranslations,
): Window | null {
  const newTab = window.open("", "_blank");

  if (newTab === null) {
    return null;
  }

  const themeColors = extractPDFThemeColors(theme);
  const loadingHTML = generatePDFLoadingHTML(fileName, themeColors, translations);
  const parser = new DOMParser();
  const doc = parser.parseFromString(loadingHTML, "text/html");

  newTab.document.documentElement.innerHTML = doc.documentElement.innerHTML;
  Array.from(doc.head.children).forEach((child) => {
    if (child.tagName === "STYLE" || child.tagName === "SCRIPT" || child.tagName === "META") {
      newTab.document.head.appendChild(child.cloneNode(true));
    }
  });

  return newTab;
}

/**
 * 绑定取消下载功能
 *
 * @param newTab - PDF 预览窗口
 * @param abortController - 用于取消下载的控制器
 * @param translations - 翻译文本
 */
function bindCancelHandler(
  newTab: Window,
  abortController: AbortController,
  translations: PDFLoadingTranslations,
): void {
  const cancel = (): void => {
    try {
      abortController.abort();
    } catch {
      // 忽略取消错误
    }

    const status = newTab.document.getElementById("status");
    if (status !== null) {
      status.textContent = translations.cancelled;
    }

    const progress = newTab.document.getElementById("progress");
    if (progress !== null) {
      progress.textContent = "";
    }

    const btn = newTab.document.getElementById("cancel-btn") as HTMLButtonElement | null;
    if (btn !== null) {
      btn.disabled = true;
      btn.style.display = "none";
    }

    window.setTimeout(() => {
      try {
        newTab.close();
      } catch {
        // 忽略关闭错误
      }
    }, 1500);
  };

  // 将取消函数注入到新窗口
  (newTab as Window & { cancelDownload?: () => void }).cancelDownload = cancel;
  (newTab as Window & { abortController?: AbortController }).abortController = abortController;

  const btn = newTab.document.getElementById("cancel-btn");
  if (btn !== null) {
    btn.addEventListener("click", cancel, { once: true });
  }
}

/**
 * 格式化字节数为可读的 MB 格式
 *
 * @param bytes - 字节数
 * @returns 格式化后的字符串（如 "2.45 MB"）
 */
function formatBytes(bytes: number): string {
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

/**
 * 更新下载进度显示
 *
 * @param newTab - PDF 预览窗口
 * @param loaded - 已下载字节数
 * @param total - 总字节数
 * @param translations - 翻译文本
 */
function updateProgress(
  newTab: Window,
  loaded: number,
  total: number,
  translations: PDFLoadingTranslations,
): void {
  const progressEl = newTab.document.getElementById("progress");
  const progressCircle = newTab.document.getElementById(
    "progress-circle",
  ) as SVGCircleElement | null;

  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;

  // 更新文本进度
  if (progressEl !== null) {
    progressEl.textContent =
      total > 0 && pct !== null
        ? translations.downloadedWithProgress
            .replace("@@loaded@@", formatBytes(loaded))
            .replace("@@total@@", formatBytes(total))
            .replace("@@percent@@", pct.toString())
        : translations.downloaded.replace("@@loaded@@", formatBytes(loaded));
  }

  // 更新进度条
  if (progressCircle !== null && total > 0 && pct !== null) {
    progressCircle.classList.add("determinate");
    const circumference = 2 * Math.PI * 20; // radius = 20
    const dashOffset = circumference - (circumference * pct) / 100;
    progressCircle.style.strokeDashoffset = dashOffset.toString();
  }
}

/**
 * 下载并显示 PDF
 *
 * @param newTab - 新标签页窗口
 * @param downloadUrl - PDF 下载链接
 * @param fileName - 文件名
 * @param themeColors - 主题色彩对象
 * @param translations - 翻译文本
 */
async function downloadAndDisplayPDF(
  newTab: Window,
  downloadUrl: string,
  fileName: string,
  themeColors: ReturnType<typeof extractPDFThemeColors>,
  translations: PDFLoadingTranslations,
): Promise<void> {
  const abortController = new AbortController();
  bindCancelHandler(newTab, abortController, translations);

  try {
    const resp = await fetch(downloadUrl, {
      mode: "cors",
      signal: abortController.signal,
    });

    if (!resp.ok || resp.body === null) {
      throw new Error(`HTTP ${resp.status.toString()}`);
    }

    const contentLengthHeader =
      resp.headers.get("Content-Length") ?? resp.headers.get("content-length");
    const total = contentLengthHeader !== null ? parseInt(contentLengthHeader, 10) : 0;
    let loaded = 0;
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];

    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      loaded += result.value.byteLength;
      updateProgress(newTab, loaded, total, translations);
      result = await reader.read();
    }

    const blob = new Blob(chunks as BlobPart[], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    // 60秒后清理 blob URL
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60_000);

    const viewerEl = newTab.document.getElementById("viewer") as HTMLIFrameElement | null;
    if (viewerEl !== null) {
      viewerEl.src = blobUrl;
      viewerEl.style.visibility = "visible";
    } else {
      newTab.location.replace(blobUrl);
    }

    const loaderEl = newTab.document.getElementById("loader");
    if (loaderEl !== null) {
      loaderEl.style.display = "none";
    }

    // 隐藏取消按钮
    const cancelBtn = newTab.document.getElementById("cancel-btn");
    if (cancelBtn !== null) {
      cancelBtn.style.display = "none";
    }

    newTab.document.title = fileName !== "" ? fileName : "PDF";
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error("未知错误");

    // 检查是否是用户主动取消
    if (errorObj.name === "AbortError") {
      return; // 用户取消，不显示错误信息
    }

    // 显示错误页面
    const loaderEl = newTab.document.getElementById("loader");
    if (loaderEl !== null) {
      loaderEl.innerHTML = generatePDFErrorHTML(
        fileName,
        errorObj.message,
        downloadUrl,
        themeColors,
        translations,
      );
    } else {
      newTab.location.replace(downloadUrl);
    }
  }
}

/**
 * 创建降级链接并触发点击（当无法打开新窗口时使用）
 *
 * @param downloadUrl - PDF 下载 URL
 */
function createFallbackLink(downloadUrl: string): void {
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.target = "_blank";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * 在新标签页中预览 PDF 文件
 *
 * 主要功能：
 * 1. 打开新标签页并显示加载界面
 * 2. 支持下载进度显示
 * 3. 支持取消下载
 * 4. 错误处理和降级方案
 *
 * @param options - PDF 预览配置选项
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await openPDFPreview({
 *   fileName: 'document.pdf',
 *   downloadUrl: 'https://example.com/document.pdf',
 *   theme: muiTheme,
 *   isDev: true
 * });
 * ```
 */
export async function openPDFPreview(options: PDFPreviewOptions): Promise<void> {
  const { fileName, downloadUrl, serverProxyUrl, theme, translations, isDev = false } = options;

  // 初始化预览窗口
  const newTab = initializePDFWindow(fileName, theme, translations);

  if (newTab === null) {
    // 无法打开新窗口，使用降级方案
    createFallbackLink(downloadUrl);
    return;
  }

  const themeColors = extractPDFThemeColors(theme);

  // 根据环境选择下载 URL
  const finalDownloadUrl =
    serverProxyUrl ??
    (isDev
      ? downloadUrl
      : `/api/github?action=getGitHubAsset&url=${encodeURIComponent(downloadUrl)}`);

  // 下载并显示 PDF
  await downloadAndDisplayPDF(newTab, finalDownloadUrl, fileName, themeColors, translations);
}
