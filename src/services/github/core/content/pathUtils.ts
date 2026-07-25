/**
 * 目录路径规范化。
 *
 * @param path - 原始目录路径
 * @returns 规范化后的目录路径
 *
 * @remarks
 * - 将空路径统一映射为根目录 '/'
 * - 移除多余前缀与重复斜杠
 */
export function normalizeDirectoryPath(path: string): string {
  if (path === "" || path === "/") {
    return "/";
  }
  return path.replace(/^\/+/u, "").replace(/\/+/gu, "/");
}

/**
 * 文件路径规范化。
 *
 * @param path - 原始文件路径
 * @returns 规范化后的文件路径
 *
 * @remarks 去掉开头的多余斜杠，保留空字符串表示根目录文件。
 */
export function normalizeFilePath(path: string): string {
  if (path === "") {
    return "";
  }
  return path.replace(/^\/+/u, "");
}

export { escapeRegExp } from "@/utils/string/escapeRegExp";
