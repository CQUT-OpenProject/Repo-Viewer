import type { GitHubContent } from "@/types";
import { hashStringSync } from "@/utils/crypto/hashUtils";

/**
 * 缓存键与版本号工具。
 *
 * @remarks 统一封装目录/文件内容的缓存键生成规则以及版本签名算法，确保不同模块之间保持一致性。
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

/**
 * 生成内容列表的缓存版本标识。
 *
 * @param path - 目录路径
 * @param branch - Git 分支名
 * @param contents - 内容数组
 * @returns 内容版本标识
 */
export function generateContentVersion(
  path: string,
  branch: string,
  contents: GitHubContent[],
): string {
  const contentSignature = contents
    .map((item) => {
      const identifier = item.sha !== "" ? item.sha : (item.size?.toString() ?? "unknown");
      return `${item.name}-${identifier}`;
    })
    .join("|");

  const versionString = `${branch}:${path}:${contentSignature}:${Date.now().toString()}`;
  const hash = hashStringSync(versionString);
  return `v_${hash}`;
}

/**
 * 生成文件内容的缓存版本标识。
 *
 * @param fileUrl - 文件 URL
 * @param content - 文件内容
 * @returns 文件版本标识
 */
export function generateFileVersion(fileUrl: string, content: string): string {
  const contentLength = content.length;
  const timestamp = Date.now();
  const versionString = `${fileUrl}:${contentLength.toString()}:${timestamp.toString()}`;
  const hash = hashStringSync(versionString);
  return `fv_${hash}`;
}
