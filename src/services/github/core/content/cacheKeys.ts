import { hashStringSync } from "@/utils/crypto/hashUtils";

/**
 * 缓存键工具。
 *
 * @remarks 统一封装目录/文件内容的缓存键生成规则，确保不同模块之间保持一致性。
 */

/**
 * 构建目录内容缓存键。
 *
 * @param path - 目录路径
 * @param branch - Git 分支名
 * @returns 唯一的缓存键
 */
export function buildContentsCacheKey(path: string, branch: string): string {
  const normalizedPath = path === "" ? "/" : path;
  const keyString = `${branch}:${normalizedPath}`;
  const hash = hashStringSync(keyString);
  return `content:v2:${hash}`;
}
