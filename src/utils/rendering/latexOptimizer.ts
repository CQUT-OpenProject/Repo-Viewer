import { logger } from "../logging/logger";

// 防抖函数避免循环引用
const debounce = <F extends (...args: unknown[]) => unknown>(
  func: F,
  waitFor: number,
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, waitFor);
  };
};

// 存储临时移除的LaTeX元素
interface StoredElement {
  element: HTMLElement;
  parent: HTMLElement;
  nextSibling: Node | null;
  container: HTMLElement;
}

let storedElements: StoredElement[] = [];
let isThemeChanging = false;

/**
 * 移除所有LaTeX元素
 *
 * 在主题切换时临时移除LaTeX元素以优化性能，
 * 用占位符保持布局稳定性。
 *
 * @returns void
 */
export const removeLatexElements = (): void => {
  if (isThemeChanging) {
    return;
  }

  isThemeChanging = true;
  storedElements = [];

  // 获取所有LaTeX容器
  const containers = document.querySelectorAll(".katex-display, .katex:not(.katex-display .katex)");
  let count = 0;

  containers.forEach((container) => {
    const parent = container.parentElement;
    if (parent === null) {
      return;
    }

    const element = container as HTMLElement;
    const nextSibling = container.nextSibling;

    // 存储元素，以便之后恢复
    storedElements.push({
      element,
      parent,
      nextSibling,
      container: element.cloneNode(false) as HTMLElement,
    });

    // 替换为占位符元素，保持布局稳定
    const placeholder = document.createElement("div");
    placeholder.classList.add("latex-placeholder");
    placeholder.style.height = `${element.offsetHeight.toString()}px`;
    placeholder.style.width = `${element.offsetWidth.toString()}px`;
    placeholder.style.display = "inline-block";
    placeholder.style.visibility = "hidden";

    // 从DOM中移除原始元素
    parent.replaceChild(placeholder, element);
    count++;
  });

  if (count > 0) {
    logger.debug(`已移除 ${count.toString()} 个LaTeX元素以优化主题切换性能`);
  }
};

/**
 * 分批恢复LaTeX元素
 *
 * 在主题切换完成后，分批恢复LaTeX元素以避免阻塞主线程。
 *
 * @returns void
 */
export const restoreLatexElements = (): void => {
  if (!isThemeChanging || storedElements.length === 0) {
    return;
  }

  const BATCH_SIZE = 10; // 每批恢复的元素数量
  const BATCH_DELAY = 50; // 批次间延迟(ms)

  const batchedRestore = (startIndex: number): void => {
    // 批量恢复，逐步降低对主线程的压力
    const endIndex = Math.min(startIndex + BATCH_SIZE, storedElements.length);

    // 处理当前批次
    for (const entry of storedElements.slice(startIndex, endIndex)) {
      const { element, parent, nextSibling } = entry;

      // 查找占位符
      const placeholder = parent.querySelector(".latex-placeholder");
      if (placeholder !== null) {
        parent.replaceChild(element, placeholder);
        continue;
      }

      // 如果没有找到占位符，则尝试使用原始位置信息
      if (nextSibling !== null) {
        parent.insertBefore(element, nextSibling);
      } else {
        parent.appendChild(element);
      }
    }

    // 递归处理下一批
    if (endIndex < storedElements.length) {
      setTimeout(() => {
        batchedRestore(endIndex);
      }, BATCH_DELAY);
    } else {
      // 全部恢复完成
      storedElements = [];
      isThemeChanging = false;
      logger.debug("已完成所有LaTeX元素的恢复");
    }
  };

  // 开始批量恢复
  setTimeout(() => {
    batchedRestore(0);
  }, 100);
};

/**
 * 隐藏所有LaTeX元素
 *
 * 后备方案，调用removeLatexElements实现。
 *
 * @returns void
 */
/**
 * 防抖版的LaTeX元素恢复函数
 */
export const debouncedShowLatexElements = debounce(restoreLatexElements, 100);

/**
 * 计算页面中LaTeX元素的数量
 *
 * @returns LaTeX元素总数
 */
export const countLatexElements = (): number => {
  return document.querySelectorAll(".katex-display, .katex:not(.katex-display .katex)").length;
};

/**
 * 添加LaTeX优化器样式
 *
 * 在文档中注入优化LaTeX渲染所需的CSS样式。
 *
 * @returns void
 */
const addLatexOptimizerStyles = (): void => {
  // 如果样式已存在，则不重复添加
  if (document.getElementById("latex-optimizer-styles") !== null) {
    return;
  }

  const styleElement = document.createElement("style");
  styleElement.id = "latex-optimizer-styles";
  styleElement.textContent = `
    .latex-placeholder {
      min-height: 1.2em;
      margin: 0.5em 0;
      background: transparent;
    }
    body.theme-transition .katex-display,
    body.theme-transition .katex {
      visibility: hidden !important;
      opacity: 0 !important;
      transition: none !important;
    }
  `;

  document.head.appendChild(styleElement);
};

/**
 * 设置LaTeX优化
 *
 * 设置主题变化监听器，自动处理LaTeX元素的移除和恢复。
 *
 * @returns 清理函数
 */
export const setupLatexOptimization = (): (() => void) => {
  // 添加必要的样式
  addLatexOptimizerStyles();

  // 创建MutationObserver监听data-theme变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "data-theme" && mutation.target === document.documentElement) {
        // 检测到主题变化时移除LaTeX元素
        removeLatexElements();

        // 延迟恢复LaTeX元素
        setTimeout(() => {
          debouncedShowLatexElements();
        }, 500);
      }
    });
  });

  // 开始监听
  observer.observe(document.documentElement, { attributes: true });

  // 返回清理函数
  return () => {
    observer.disconnect();
    const styleElement = document.getElementById("latex-optimizer-styles");
    if (styleElement !== null) {
      styleElement.remove();
    }
  };
};
