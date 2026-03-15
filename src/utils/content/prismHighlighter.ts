import * as Prism from "prismjs";
import { detectLanguage } from "./languageDetector";
import { highlightContent, highlightLines } from "./prismHighlightCore";
import { logger } from "@/utils";
export { highlightContent, highlightLines } from "./prismHighlightCore";
export { encodeLines, normalizeContentLines } from "./textPreviewLines";

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

  return highlightContent(code, language);
}
