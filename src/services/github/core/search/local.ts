/**
 * 本地文件搜索模块
 *
 * 使用 Git Trees API 进行多分支文件搜索。
 *
 * @module search/local
 */

import type { GitHubContent } from "@/types";
import { logger } from "@/utils/logging/logger";
import { createAbortError, isAbortError } from "@/utils/network/abort";

import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from "../Config";

type FileTypeFilter = string | string[] | undefined;

function normalizeFileTypeFilters(fileTypeFilter: FileTypeFilter): Set<string> {
  const values = Array.isArray(fileTypeFilter) ? fileTypeFilter : [fileTypeFilter];
  const normalized = new Set<string>();

  for (const value of values) {
    const trimmed = value?.trim().toLowerCase();
    if (trimmed === undefined || trimmed === "") {
      continue;
    }

    normalized.add(trimmed.startsWith(".") ? trimmed.slice(1) : trimmed);
  }

  return normalized;
}

/**
 * 使用 Trees API 在多个分支中搜索
 */
export async function searchMultipleBranchesWithTreesApi(
  searchTerm: string,
  branches: string[],
  pathPrefix = "",
  fileTypeFilter?: FileTypeFilter,
  signal?: AbortSignal,
): Promise<{ branch: string; results: GitHubContent[] }[]> {
  if (signal?.aborted === true) {
    throw createAbortError("Request aborted");
  }

  const searchPromises = branches.map(async (branch) => ({
    branch,
    results: await searchBranchWithTreesApi(searchTerm, branch, pathPrefix, fileTypeFilter, signal),
  }));

  return Promise.all(searchPromises);
}

/**
 * 在单个分支中使用 Trees API 搜索
 */
async function searchBranchWithTreesApi(
  searchTerm: string,
  branch: string,
  pathPrefix = "",
  fileTypeFilter?: FileTypeFilter,
  signal?: AbortSignal,
): Promise<GitHubContent[]> {
  try {
    if (signal?.aborted === true) {
      throw createAbortError("Request aborted");
    }

    const { getBranchTree } = await import("./trees");
    const tree = await getBranchTree(branch, signal);

    if (tree === null) {
      return [];
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const normalizedPrefix = pathPrefix.trim().toLowerCase();
    const normalizedFileTypeFilters = normalizeFileTypeFilters(fileTypeFilter);

    const results: GitHubContent[] = [];

    for (const item of tree) {
      if (item.type !== "blob") {
        continue;
      }

      const itemPath = item.path ?? "";
      const fileName = itemPath.includes("/")
        ? itemPath.slice(itemPath.lastIndexOf("/") + 1)
        : itemPath;

      if (!fileName.toLowerCase().includes(normalizedSearchTerm)) {
        continue;
      }

      if (normalizedPrefix.length > 0 && !itemPath.toLowerCase().startsWith(normalizedPrefix)) {
        continue;
      }

      if (normalizedFileTypeFilters.size > 0) {
        const ext = fileName.includes(".")
          ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
          : "";
        if (!normalizedFileTypeFilters.has(ext)) {
          continue;
        }
      }

      const result: GitHubContent = {
        name: fileName,
        path: itemPath,
        type: "file",
        sha: item.sha ?? "",
        url: item.url ?? "",
        html_url: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/blob/${branch}/${itemPath}`,
        download_url: `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${branch}/${itemPath}`,
      };

      if (item.size !== undefined) {
        result.size = item.size;
      }

      results.push(result);
    }

    return results;
  } catch (error) {
    if (isAbortError(error)) {
      throw createAbortError("Request aborted");
    }

    const message = error instanceof Error ? error.message : "未知错误";
    logger.warn(`使用 Trees API 搜索分支 ${branch} 失败`, message);
    return [];
  }
}
