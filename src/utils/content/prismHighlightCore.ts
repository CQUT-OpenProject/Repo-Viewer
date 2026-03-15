import * as Prism from "prismjs";
import { encodeLines, escapeHtml, normalizeContentLines } from "./textPreviewLines";
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

type TokenValue = string | TokenValue[] | { type: string; content: TokenValue } | null | undefined;

function encodeHtml(value: string): string {
  const encoded = Prism.util.encode(value);
  return typeof encoded === "string" ? encoded : escapeHtml(value);
}

function tokensToHtml(tokens: TokenValue): string {
  if (typeof tokens === "string") {
    return encodeHtml(tokens);
  }

  if (Array.isArray(tokens)) {
    return tokens.map((token) => tokensToHtml(token)).join("");
  }

  if (tokens !== null && tokens !== undefined && typeof tokens === "object") {
    if ("type" in tokens && typeof tokens.type === "string" && "content" in tokens) {
      const content = tokensToHtml(tokens.content);
      return `<span class="token ${tokens.type}">${content}</span>`;
    }
  }

  return "";
}

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

      if (tagBuffer.startsWith("</")) {
        openTags.pop();
      } else if (!tagBuffer.endsWith("/>")) {
        openTags.push(tagBuffer);
      }

      tagBuffer = "";
    } else if (inTag) {
      tagBuffer = tagBuffer + char;
    } else if (char === "\n") {
      result.push(currentLine !== "" ? currentLine : "\u00A0");

      currentLine = "";
      for (const tag of openTags) {
        currentLine = currentLine + tag;
      }
    } else {
      currentLine = currentLine + char;
    }
  }

  if (currentLine !== "" || result.length === 0) {
    result.push(currentLine !== "" ? currentLine : "\u00A0");
  }

  while (result.length < lineCount) {
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
    return encodeLines(lines);
  }

  const grammar = Prism.languages[language];
  if (grammar === undefined) {
    return encodeLines(lines);
  }

  const fullCode = lines.join("\n");

  try {
    const tokens = Prism.tokenize(fullCode, grammar);
    return splitHighlightedHtml(tokensToHtml(tokens), lines.length);
  } catch {
    try {
      const highlighted = Prism.highlight(fullCode, grammar, language);
      return splitHighlightedHtml(highlighted, lines.length);
    } catch {
      return encodeLines(lines);
    }
  }
}

export function highlightContent(content: string, language: string | null): string[] {
  return highlightLines(normalizeContentLines(content), language);
}
