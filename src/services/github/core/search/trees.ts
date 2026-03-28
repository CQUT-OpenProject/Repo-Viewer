/**
 * Git Trees API 模块
 *
 * 提供获取 Git 分支完整文件树的功能，支持递归获取所有文件和目录。
 * 适用于大规模仓库的文件遍历和批量操作。
 *
 * @module search/trees
 */

import axios from "axios";
import { SmartCache } from "@/utils/cache/SmartCache";
import { createAbortError, isAbortError } from "@/utils/network/abort";

import { GITHUB_API_BASE, GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from "../Config";
import { shouldUseServerAPI } from "../../config";
import { getAuthHeaders } from "../Auth";

/**
 * Git 树节点项接口
 *
 * 表示 Git 树中的一个文件或目录节点。
 */
export interface GitTreeItem {
  /** 文件或目录的完整路径 */
  path?: string;
  /** 节点类型：blob（文件）或 tree（目录） */
  type?: string;
  /** 文件大小（字节），目录为 undefined */
  size?: number;
  /** API URL */
  url?: string;
  /** Git 对象的 SHA 哈希 */
  sha?: string;
}

interface GitRefResponse {
  object?: {
    sha?: string;
  };
}

interface CachedBranchTree {
  tree: GitTreeItem[] | null;
}

const TREE_CACHE_TTL = 5 * 60 * 1000;
const TREE_CACHE_MAX_SIZE = 24;

const branchTreeCache = new SmartCache<string, CachedBranchTree>({
  maxSize: TREE_CACHE_MAX_SIZE,
  ttl: TREE_CACHE_TTL,
  cleanupThreshold: 0.75,
  cleanupRatio: 0.25,
});

const inFlightTreeRequests = new Map<string, Promise<GitTreeItem[] | null>>();

function encodePathSegments(value: string): string {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizeSha(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized !== undefined && normalized !== "" ? normalized : null;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) {
    throw createAbortError("Request aborted");
  }
}

async function fetchBranchHeadShaViaServerApi(
  branch: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const query = new URLSearchParams({
    action: "getGitRef",
    ref: `heads/${branch}`,
  });

  const response = await axios.get(`/api/github?${query.toString()}`, { signal });
  const data = response.data as GitRefResponse;
  return normalizeSha(data.object?.sha);
}

async function fetchBranchHeadShaDirectly(
  branch: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const encodedRef = encodePathSegments(`heads/${branch}`);
  const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/ref/${encodedRef}`;

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
  }

  const data = (await response.json()) as GitRefResponse;
  return normalizeSha(data.object?.sha);
}

async function resolveBranchHeadSha(branch: string, signal?: AbortSignal): Promise<string | null> {
  if (shouldUseServerAPI()) {
    return fetchBranchHeadShaViaServerApi(branch, signal);
  }

  return fetchBranchHeadShaDirectly(branch, signal);
}

/**
 * 通过服务端 API 获取分支树
 *
 * @param branch - 分支名称
 * @returns Promise，解析为树节点数组，失败时返回 null
 */
async function fetchTreeViaServerApi(
  branch: string,
  signal?: AbortSignal,
): Promise<GitTreeItem[] | null> {
  const query = new URLSearchParams({
    action: "getTree",
    branch,
    recursive: "1",
  });
  const response = await axios.get(`/api/github?${query.toString()}`, { signal });
  const data = response.data as { tree?: GitTreeItem[] };
  return Array.isArray(data.tree) ? data.tree : null;
}

/**
 * 直接请求 GitHub API 获取分支树
 *
 * @param branch - 分支名称
 * @returns Promise，解析为树节点数组，失败时抛出错误
 * @throws 当 API 请求失败时抛出错误
 */
async function fetchTreeDirectly(
  branch: string,
  signal?: AbortSignal,
): Promise<GitTreeItem[] | null> {
  const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: getAuthHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
  }

  const data = (await response.json()) as { tree?: GitTreeItem[] };
  return Array.isArray(data.tree) ? data.tree : null;
}

function getTreeCacheKey(branch: string, branchHeadSha: string | null): string {
  if (branchHeadSha !== null) {
    return `sha:${branchHeadSha}`;
  }

  return `branch:${branch}`;
}

export function clearBranchTreeCache(): void {
  branchTreeCache.clear();
  inFlightTreeRequests.clear();
}

/**
 * 获取分支的完整文件树
 *
 * 根据环境自动选择使用服务端 API 或直接请求 GitHub API。
 * 递归获取指定分支的所有文件和目录结构。
 *
 * @param branch - 分支名称
 * @returns Promise，解析为树节点数组，失败时返回 null
 */
export async function getBranchTree(
  branch: string,
  signal?: AbortSignal,
): Promise<GitTreeItem[] | null> {
  const normalizedBranch = branch.trim();
  if (normalizedBranch === "") {
    return null;
  }

  let branchHeadSha: string | null = null;
  try {
    branchHeadSha = await resolveBranchHeadSha(normalizedBranch, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw createAbortError("Request aborted");
    }
    // Ref 查询失败时回退到分支名级别缓存，避免影响搜索可用性。
  }

  const cacheKey = getTreeCacheKey(normalizedBranch, branchHeadSha);
  const cached = branchTreeCache.get(cacheKey);
  if (cached !== null) {
    throwIfAborted(signal);
    return cached.tree;
  }

  if (signal === undefined) {
    const inFlightRequest = inFlightTreeRequests.get(cacheKey);
    if (inFlightRequest !== undefined) {
      return inFlightRequest;
    }
  }

  const request = (
    shouldUseServerAPI()
      ? fetchTreeViaServerApi(normalizedBranch, signal)
      : fetchTreeDirectly(normalizedBranch, signal)
  )
    .then((tree) => {
      throwIfAborted(signal);
      branchTreeCache.set(cacheKey, { tree });
      return tree;
    })
    .catch((error: unknown) => {
      if (isAbortError(error)) {
        throw createAbortError("Request aborted");
      }
      throw error;
    });

  if (signal === undefined) {
    inFlightTreeRequests.set(
      cacheKey,
      request.finally(() => {
        inFlightTreeRequests.delete(cacheKey);
      }),
    );
  }

  return request;
}
