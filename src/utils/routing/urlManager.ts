import { GitHub } from "@/services/github";
import { logger } from "../index";

/**
 * 验证路径格式
 *
 * 检查路径是否包含非法字符。
 *
 * @param path - 待验证的路径
 * @returns 如果路径有效返回 true
 */
function isValidPath(path: string): boolean {
  // 检查是否包含 Windows/Unix 文件系统非法字符
  const illegalChars = /[<>"|?*]/;
  return !illegalChars.test(path);
}

/**
 * 从URL解析路径参数
 *
 * 仅从路径段解析，并包含路径格式验证和详细的错误处理。
 *
 * @returns 文件路径字符串，如果解析失败或路径无效则返回空字符串
 */
export function getPathFromUrl(): string {
  try {
    // 首先尝试从路径段获取
    let pathname = window.location.pathname;

    // 移除开头的斜杠
    if (pathname.startsWith("/")) {
      pathname = pathname.substring(1);
    }

    // 如果路径段不为空，解码并验证
    if (pathname.length > 0 && pathname !== "/") {
      try {
        const decodedPath = decodeURIComponent(pathname);

        // 验证路径格式
        if (!isValidPath(decodedPath)) {
          logger.warn(`URL 路径包含非法字符，已忽略: ${pathname}`);
          return "";
        }

        return decodedPath;
      } catch (decodeError) {
        logger.error("URL 路径解码失败:", decodeError);
        // 尝试返回原始路径（可能已经解码）
        if (isValidPath(pathname)) {
          return pathname;
        }
        return "";
      }
    }

    return "";
  } catch (error) {
    logger.error("解析 URL 路径参数失败:", error);
    return "";
  }
}

/**
 * 从URL解析分支参数
 *
 * 从history state中获取分支名称。
 *
 * @returns 分支名称字符串
 */
export function getBranchFromUrl(): string {
  try {
    const state = window.history.state as { branch?: string } | null;
    const stateBranch = state?.branch;

    if (typeof stateBranch === "string" && stateBranch.trim().length > 0) {
      return stateBranch.trim();
    }

    return "";
  } catch (error) {
    logger.error("解析 URL 分支参数失败:", error);
    return "";
  }
}

/**
 * 从URL解析预览文件参数
 *
 * 通过哈希部分获取预览文件名。
 *
 * @returns 预览文件名
 */
export function getPreviewFromUrl(): string {
  try {
    // 如果没有查询参数，检查是否有 #preview 哈希标记
    const hash = window.location.hash;
    if (hash.length > 0 && hash.startsWith("#preview=")) {
      return decodeURIComponent(hash.substring("#preview=".length));
    }

    return "";
  } catch (error) {
    logger.error("解析 URL 预览参数失败:", error);
    return "";
  }
}

/**
 * URL 构建结果接口
 */
interface UrlBuildResult {
  url: string;
  state: {
    path: string;
    preview?: string;
    branch: string;
  };
}

/**
 * 统一的 URL 构建核心函数
 *
 * 将路径、预览参数和分支名称构建为完整的URL和状态对象。
 *
 * @param path - 文件路径
 * @param preview - 预览文件路径（可选）
 * @param branch - 分支名称（可选）
 * @returns URL和状态对象
 */
function buildUrl(path: string, preview?: string, branch?: string): UrlBuildResult {
  // 将路径编码为 URL 路径段
  const encodedPath = path.length > 0 ? encodeURI(path) : "";

  // 基础 URL 是路径
  let url = `/${encodedPath}`;

  const branchValue = branch ?? GitHub.Branch.getCurrentBranch();
  const activeBranch = branchValue.trim();

  // 如果有预览参数，添加为哈希部分，但仅使用文件名
  if (preview !== undefined && preview.length > 0) {
    // 从路径中提取文件名
    const fileName = preview.split("/").pop();
    url += `#preview=${encodeURI(fileName ?? "")}`;
  }

  return {
    url,
    state: {
      path,
      ...(preview !== undefined ? { preview } : {}),
      branch: activeBranch,
    },
  };
}

/**
 * 更新浏览器URL（不添加历史记录）
 *
 * 使用replaceState更新URL，不会在浏览器历史中创建新条目。
 *
 * @param path - 文件路径
 * @param preview - 预览文件路径（可选）
 * @param branch - 分支名称（可选）
 * @returns void
 */
export function updateUrlWithoutHistory(path: string, preview?: string, branch?: string): void {
  try {
    const { url, state } = buildUrl(path, preview, branch);
    window.history.replaceState(state, "", url);
    logger.debug(`URL 已更新（不添加历史记录）: ${url}`);
  } catch (error) {
    logger.error("更新 URL 失败:", error);
  }
}

/**
 * 更新浏览器URL（添加历史记录）
 *
 * 使用pushState更新URL，在浏览器历史中创建新条目。
 *
 * @param path - 文件路径
 * @param preview - 预览文件路径（可选）
 * @param branch - 分支名称（可选）
 * @returns void
 */
export function updateUrlWithHistory(path: string, preview?: string, branch?: string): void {
  try {
    const { url, state } = buildUrl(path, preview, branch);
    window.history.pushState(state, "", url);
    logger.debug(`URL 已更新（添加历史记录）: ${url}`);
  } catch (error) {
    logger.error("更新 URL 失败:", error);
  }
}

/**
 * 检查URL中是否有预览参数
 *
 * 检查哈希部分是否包含预览参数。
 *
 * @returns 如果包含预览参数返回true
 */
export function hasPreviewParam(): boolean {
  try {
    // 检查哈希部分
    const hash = window.location.hash;
    return hash.startsWith("#preview=");
  } catch (error) {
    logger.error("检查 URL 预览参数失败:", error);
    return false;
  }
}
