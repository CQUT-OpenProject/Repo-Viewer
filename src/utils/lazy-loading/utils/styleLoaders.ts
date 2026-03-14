/**
 * 动态加载KaTeX样式
 *
 * 仅在需要时才加载KaTeX CSS，避免首屏加载。
 * 优先使用CDN，失败时回退到本地资源。
 *
 * @returns Promise，样式加载完成后解析
 */
export const loadKatexStyles = (() => {
  let loaded = false;
  let loadPromise: Promise<void> | null = null;
  const DATA_ID = "katex-styles";

  const loadByHref = (href: string, withCrossOrigin = false): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 避免重复注入
      const existing = document.querySelector(`link[data-style-id="${DATA_ID}"]`);
      if (existing !== null) {
        loaded = true;
        resolve();
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-style-id", DATA_ID);
      if (withCrossOrigin) {
        link.crossOrigin = "anonymous";
      }

      link.onload = () => {
        resolve();
      };

      link.onerror = () => {
        // 失败后移除占位，允许回退或重试
        try {
          link.remove();
        } catch {}
        reject(new Error(`Failed to load stylesheet: ${href}`));
      };

      document.head.appendChild(link);
    });
  };

  return (): Promise<void> => {
    if (loaded) {
      return Promise.resolve();
    }
    if (loadPromise !== null) {
      return loadPromise;
    }

    // 若已经存在标记的 link，则直接视为已加载
    const existing = document.querySelector(`link[data-style-id="${DATA_ID}"]`);
    if (existing !== null) {
      loaded = true;
      return Promise.resolve();
    }

    const CDN_HREF = "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css";

    loadPromise = (async () => {
      try {
        // 优先加载 CDN
        await loadByHref(CDN_HREF, true);
        loaded = true;
        return;
      } catch {
        // CDN 失败时，尝试本地构建资源回退（Vite 会在构建产物中提供该文件 URL）
        try {
          const { default: localCssUrl } = (await import("katex/dist/katex.min.css?url")) as {
            default: string;
          };
          await loadByHref(localCssUrl, false);
          loaded = true;
          return;
        } catch {
          loadPromise = null; // 允许后续重试
          throw new Error("Failed to load KaTeX styles from CDN and local fallback");
        }
      }
    })();

    return loadPromise;
  };
})();

/**
 * 通用的动态样式加载器
 *
 * @param href - 样式文件URL
 * @param id - 可选的唯一标识符，用于避免重复加载
 * @returns Promise，样式加载完成后解析
 */
export const loadStylesheet = (href: string, id?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    const selector =
      typeof id === "string" && id.length > 0
        ? `link[data-style-id="${id}"]`
        : `link[href="${href}"]`;
    const existingLink = document.querySelector(selector);

    if (existingLink !== null) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    if (typeof id === "string" && id.length > 0) {
      link.setAttribute("data-style-id", id);
    }

    link.onload = () => {
      resolve();
    };
    link.onerror = () => {
      reject(new Error(`Failed to load stylesheet: ${href}`));
    };

    document.head.appendChild(link);
  });
};
