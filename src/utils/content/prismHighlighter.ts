import * as Prism from "prismjs";
import { detectLanguage } from "./languageDetector";
import { logger } from "@/utils";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-sass";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-scala";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-objectivec";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-php";
import "prismjs/components/prism-lua";
import "prismjs/components/prism-perl";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-powershell";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-ini";
import "prismjs/components/prism-properties";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-clojure";
import "prismjs/components/prism-elixir";
import "prismjs/components/prism-erlang";
import "prismjs/components/prism-haskell";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-latex";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-gradle";
import "prismjs/components/prism-cmake";
import "prismjs/components/prism-makefile";
import "prismjs/components/prism-nix";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-git";
import "prismjs/components/prism-batch";

/**
 * 高亮文本文件的每一行
 *
 * 为了保持 HTML 标签的完整性并确保每行都能正确高亮，
 * 我们先将整个代码块高亮，然后使用标记来分割行。
 *
 * @param html - 高亮后的 HTML 字符串
 * @param lineCount - 需要切分的行数
 * @returns 每行高亮后的 HTML 字符串数组
 */
function splitHighlightedHtml(html: string, lineCount: number): string[] {
  const result: string[] = [];
  let currentLine = "";
  let inTag = false;
  let tagBuffer = "";
  const openTags: string[] = [];

  for (const char of html) {
    if (char === "<") {
      inTag = true;
      tagBuffer = "<";
    } else if (char === ">") {
      tagBuffer += ">";
      inTag = false;
      currentLine += tagBuffer;

      // 处理标签栈
      if (tagBuffer.startsWith("</")) {
        // 结束标签：从栈中移除对应的开始标签
        openTags.pop();
      } else if (!tagBuffer.endsWith("/>")) {
        // 开始标签（非自闭合）：保存完整标签以便在换行时重新打开
        openTags.push(tagBuffer);
      }

      tagBuffer = "";
    } else if (inTag) {
      tagBuffer = tagBuffer + char;
    } else if (char === "\n") {
      // 换行：保存当前行
      // 需要在当前行末尾关闭未完成的标签，并在下一行重新打开
      result.push(currentLine !== "" ? currentLine : "\u00A0");

      // 准备下一行：重新打开所有未关闭的标签
      currentLine = "";
      // 将未关闭的标签重新添加到下一行开头，保持语法高亮上下文
      for (const tag of openTags) {
        currentLine = currentLine + tag;
      }
    } else {
      currentLine = currentLine + char;
    }
  }

  // 添加最后一行（可能包含未关闭的标签）
  if (currentLine !== "" || result.length === 0) {
    result.push(currentLine !== "" ? currentLine : "\u00A0");
  }

  // 确保行数匹配
  while (result.length < lineCount) {
    // 如果还有未关闭的标签，需要在新增的行中继续打开
    let paddingLine = "";
    if (openTags.length > 0) {
      for (const tag of openTags) {
        paddingLine = paddingLine + tag;
      }
    }
    result.push(paddingLine !== "" ? paddingLine : "\u00A0");
  }

  return result.slice(0, lineCount);
}

export function highlightLines(lines: string[], language: string | null): string[] {
  if (language === null || language === "") {
    // 如果没有检测到语言，只转义每行
    return lines.map((line) => {
      const encoded = Prism.util.encode(line);
      return typeof encoded === "string"
        ? encoded
        : line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    });
  }

  // 检查语言是否已加载
  const grammar = Prism.languages[language];
  if (grammar === undefined) {
    // 语言未加载，只转义每行
    return lines.map((line) => {
      const encoded = Prism.util.encode(line);
      return typeof encoded === "string"
        ? encoded
        : line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    });
  }

  // 将整个代码块一起高亮，然后智能分割
  // 这样可以保持上下文（如多行注释、字符串等）
  const fullCode = lines.join("\n");

  // 使用 tokenize 方法，这是更底层且更安全的 API
  try {
    // 先使用 tokenize 分词
    const tokens = Prism.tokenize(fullCode, grammar);

    // 将 tokens 递归转换为 HTML 字符串
    type TokenValue =
      | string
      | TokenValue[]
      | { type: string; content: TokenValue }
      | null
      | undefined;

    function tokensToHtml(tokens: TokenValue): string {
      if (typeof tokens === "string") {
        const encoded = Prism.util.encode(tokens);
        return typeof encoded === "string"
          ? encoded
          : tokens.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      if (Array.isArray(tokens)) {
        return tokens.map((token) => tokensToHtml(token)).join("");
      }
      if (tokens !== null && tokens !== undefined && typeof tokens === "object") {
        // 检查是否是 Prism.Token 实例
        if ("type" in tokens && typeof tokens.type === "string" && "content" in tokens) {
          const content = tokensToHtml(tokens.content);
          return `<span class="token ${tokens.type}">${content}</span>`;
        }
      }
      return "";
    }

    const highlightedString = tokensToHtml(tokens);
    return splitHighlightedHtml(highlightedString, lines.length);
  } catch (error) {
    logger.warn("[Prism] Tokenize failed, trying highlight API:", error);

    try {
      const highlighted = Prism.highlight(fullCode, grammar, language);
      return splitHighlightedHtml(highlighted, lines.length);
    } catch (highlightError) {
      // 完全失败，只转义 HTML，不进行语法高亮
      logger.warn("[Prism] Highlight also failed, using plain text:", highlightError);
      return lines.map((line) => {
        if (line.length === 0) {
          return "\u00A0";
        }
        const encoded = Prism.util.encode(line);
        return typeof encoded === "string"
          ? encoded
          : line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      });
    }
  }
}

/**
 * 根据文件名获取高亮后的代码
 *
 * @param code - 代码内容
 * @param filename - 文件名（用于检测语言）
 * @returns 高亮后的 HTML 字符串数组（每行一个）
 */
export function highlightCodeByFilename(code: string, filename: string | undefined): string[] {
  const language = filename !== undefined && filename !== "" ? detectLanguage(filename) : null;

  if (typeof window !== "undefined") {
    const windowAny = window as unknown as Record<string, unknown>;
    const windowDev = windowAny["__DEV__"];
    const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process;
    const nodeEnv = globalProcess?.env?.["NODE_ENV"];
    const viteDev = import.meta.env.DEV;
    const explicitWindowDev = typeof windowDev === "boolean" ? windowDev : undefined;
    const isDev =
      explicitWindowDev ??
      (nodeEnv === "development" ||
        viteDev ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1");

    if (isDev) {
      logger.debug("[Prism] Highlighting file:", filename, "Detected language:", language);
      if (language !== null && language !== "") {
        if (Prism.languages[language] !== undefined) {
          logger.debug("[Prism] Language loaded:", language);
        } else {
          logger.warn(
            `[Prism] Language "${language}" is NOT loaded. Available languages:`,
            Object.keys(Prism.languages).sort(),
          );
        }
      } else {
        logger.debug("[Prism] No language detected for file:", filename);
      }
    }
  }

  const lines = code.replace(/\r\n/g, "\n").split("\n");
  return highlightLines(lines, language);
}
