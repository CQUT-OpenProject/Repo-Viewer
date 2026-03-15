import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import "@/index.css";
import "github-markdown-css/github-markdown.css";
import { logger } from "@/utils";
import ThemeProvider from "@/providers/ThemeProvider";
import { GitHub } from "@/services/github";
import { setupLatexOptimization } from "@/utils/rendering/latexOptimizer";
import SEOProvider from "@/contexts/SEOContext";
import { ResponsiveSnackbarProvider } from "@/components/ui/ResponsiveSnackbarProvider";
import { getDeveloperConfig } from "@/config";
import { ErrorManager, setupGlobalErrorHandlers } from "@/utils/error";
import { loadInitialContentPayload } from "@/services/github/core/content/initialContentLoader";

// 扩展Window接口以支持LaTeX优化清理函数
declare global {
  interface Window {
    __latexOptimizerCleanup?: () => void;
  }
}

// 开发者模式配置 - 控制调试信息显示
const developerConfig = getDeveloperConfig();
const allowConsoleOutput = developerConfig.mode || developerConfig.consoleLogging;

/**
 * 初始化日志系统
 *
 * 在非开发模式下禁用 console 输出以提升性能和减少包大小。
 * 使用 queueMicrotask 异步执行以避免阻塞初始渲染。
 */
if (!allowConsoleOutput) {
  // 使用 microtask 队列异步执行，避免阻塞主线程
  queueMicrotask(() => {
    const noop = (..._args: unknown[]): undefined => undefined;
    // oxlint-disable-next-line no-console
    console.log = noop;
    // oxlint-disable-next-line no-console
    console.info = noop;
    // oxlint-disable-next-line no-console
    console.debug = noop;
    // oxlint-disable-next-line no-console
    console.group = noop as typeof console.group;
    // oxlint-disable-next-line no-console
    console.groupCollapsed = noop as typeof console.groupCollapsed;
    // oxlint-disable-next-line no-console
    console.groupEnd = (): undefined => undefined;
  });
}

// 设置全局错误处理器
setupGlobalErrorHandlers(ErrorManager);

// 应用LaTeX渲染优化
// 在应用加载后设置LaTeX优化监听器
document.addEventListener("DOMContentLoaded", (): void => {
  // 设置LaTeX优化
  // 记录到窗口对象上，以防需要手动清理
  window.__latexOptimizerCleanup = setupLatexOptimization();

  logger.debug("LaTeX渲染优化已启用");
});

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error('找不到根元素：请确保 HTML 中存在 id="root" 的元素');
}

async function bootstrap(): Promise<void> {
  const initialContentPayload = await loadInitialContentPayload();
  GitHub.Content.hydrate(initialContentPayload);

  ReactDOM.createRoot(rootElement).render(
    // 开发环境已启用React严格模式以帮助发现潜在的错误，进行刷新后页面抽动属正常现象
    <React.StrictMode>
      <SEOProvider>
        <ThemeProvider>
          <ResponsiveSnackbarProvider>
            <App />
          </ResponsiveSnackbarProvider>
        </ThemeProvider>
      </SEOProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
