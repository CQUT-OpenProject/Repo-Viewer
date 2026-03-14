import React from "react";
import type { PropsWithChildren, ReactElement, HTMLAttributes, ClassAttributes } from "react";
import { MarkdownCodeBlock } from "../components";
import { countLatexElements } from "@/utils/rendering/latexOptimizer";
import { logger } from "@/utils";

/**
 * 检测LaTeX公式数量
 *
 * 统计页面中的LaTeX公式数量，用于性能优化决策。
 *
 * @param markdownRef - Markdown容器的引用
 * @param setLatexCount - 设置公式数量的函数
 * @returns void
 */
export const checkLatexCount = (
  markdownRef: React.RefObject<HTMLDivElement | null>,
  setLatexCount: (count: number) => void,
): void => {
  window.setTimeout(() => {
    if (markdownRef.current === null) {
      return;
    }

    const count = countLatexElements();
    setLatexCount(count);

    if (count > 50) {
      logger.warn(`检测到${String(count)}个LaTeX公式，已启用性能优化模式`);
    }
  }, 500);
};

/**
 * LaTeX代码块属性接口
 */
interface LatexCodeProps extends ClassAttributes<HTMLElement>, HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string | undefined;
}

/**
 * 创建LaTeX代码处理器
 *
 * 返回处理Markdown中代码块的函数，支持LaTeX公式渲染和语法高亮。
 *
 * @returns 代码块处理函数
 */
export const createLatexCodeHandler = (): ((
  props: PropsWithChildren<LatexCodeProps>,
) => ReactElement) => {
  return ({ inline = false, className, children, ...rest }: PropsWithChildren<LatexCodeProps>) => {
    const normalizedClassName = typeof className === "string" ? className : "";
    const match = /language-(\w+)/.exec(normalizedClassName);
    const language = match?.[1]?.toLowerCase();
    const isLatexLanguage = language !== undefined && ["math", "latex", "tex"].includes(language);
    const isLatexBlock = !inline && isLatexLanguage;

    const flattenedChildren = React.Children.toArray(children ?? []);
    const childText = flattenedChildren
      .map((child) => (typeof child === "string" ? child : ""))
      .join("");
    const normalizedContent = childText.replace(/\n$/, "");
    const hasLineBreak = normalizedContent.includes("\n");
    const shouldRenderAsBlock =
      !isLatexBlock && !inline && (language !== undefined || hasLineBreak);

    const codeClassName = normalizedClassName.length > 0 ? normalizedClassName : undefined;

    if (isLatexBlock) {
      return React.createElement(
        "div",
        {
          className: "math math-display",
          style: { overflowX: "auto", padding: "0.5em 0" },
          "data-oid": "g0ievsv",
        },
        normalizedContent,
      );
    }

    if (shouldRenderAsBlock) {
      return React.createElement(MarkdownCodeBlock, {
        className: codeClassName,
        language,
        content: normalizedContent,
        codeProps: rest,
        dataOid: "b48y9g3",
      });
    }

    return React.createElement(
      "code",
      {
        className: codeClassName,
        ...rest,
        "data-oid": "nzwnmt7",
      },
      children,
    );
  };
};
