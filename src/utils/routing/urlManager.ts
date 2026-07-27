import { GitHub } from "@/services/github";
import { logger } from "../logging/logger";
import { buildAppPath, stripBasePath } from "./basePath";

function isValidPath(path: string): boolean {
  const illegalChars = /[<>"|*]/;
  return !illegalChars.test(path);
}

function encodePathSegments(path: string): string {
  if (path.length === 0) {
    return "";
  }
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * 从 URL 路径段解析文件路径
 */
export function getPathFromUrl(): string {
  try {
    let pathname = stripBasePath(window.location.pathname);

    if (pathname.startsWith("/")) {
      pathname = pathname.substring(1);
    }

    if (pathname.length > 0 && pathname !== "/") {
      try {
        const decodedPath = decodeURIComponent(pathname);
        if (!isValidPath(decodedPath)) {
          logger.warn(`URL 路径包含非法字符，已忽略: ${pathname}`);
          return "";
        }
        return decodedPath;
      } catch (decodeError) {
        logger.error("URL 路径解码失败:", decodeError);
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
 * 从 URL 解析分支：优先 ?branch=，再 history.state（兼容旧链接）
 */
export function getBranchFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryBranch = params.get("branch");
    if (queryBranch !== null && queryBranch.trim().length > 0) {
      return queryBranch.trim();
    }

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
 * 从 hash 解析预览文件名
 */
export function getPreviewFromUrl(): string {
  try {
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

interface UrlBuildResult {
  url: string;
  state: {
    path: string;
    preview?: string;
    branch: string;
  };
}

function buildUrl(path: string, preview?: string, branch?: string): UrlBuildResult {
  const encodedPath = encodePathSegments(path);
  let url = buildAppPath(encodedPath);

  const defaultBranch = GitHub.Branch.getDefaultBranchName().trim();
  const branchValue = (branch ?? GitHub.Branch.getCurrentBranch()).trim();
  const activeBranch = branchValue.length > 0 ? branchValue : defaultBranch;

  if (activeBranch.length > 0 && activeBranch !== defaultBranch) {
    url += `${url.includes("?") ? "&" : "?"}branch=${encodeURIComponent(activeBranch)}`;
  }

  if (preview !== undefined && preview.length > 0) {
    const fileName = preview.split("/").pop();
    url += `#preview=${encodeURIComponent(fileName ?? "")}`;
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

export function updateUrlWithoutHistory(path: string, preview?: string, branch?: string): void {
  try {
    const { url, state } = buildUrl(path, preview, branch);
    window.history.replaceState(state, "", url);
    logger.debug(`URL 已更新（不添加历史记录）: ${url}`);
  } catch (error) {
    logger.error("更新 URL 失败:", error);
  }
}

export function updateUrlWithHistory(path: string, preview?: string, branch?: string): void {
  try {
    const { url, state } = buildUrl(path, preview, branch);
    window.history.pushState(state, "", url);
    logger.debug(`URL 已更新（添加历史记录）: ${url}`);
  } catch (error) {
    logger.error("更新 URL 失败:", error);
  }
}

export function hasPreviewParam(): boolean {
  try {
    return window.location.hash.startsWith("#preview=");
  } catch (error) {
    logger.error("检查 URL 预览参数失败:", error);
    return false;
  }
}
