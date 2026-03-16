/**
 * 本地文件搜索模块
 *
 * 提供基于本地目录遍历的文件搜索功能，支持递归搜索和多分支搜索。
 * 同时支持使用 Git Trees API 进行大规模仓库搜索。
 *
 * @module search/local
 */

import type { GitHubContent } from "@/types";
import { logger } from "@/utils";
import { createAbortError, isAbortError } from "@/utils/network/abort";

import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from "../Config";
import { getContents } from "../content";
import type { GitTreeItem } from "./trees";

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
 * 加载目录内容
 *
 * @param path - 目录路径
 * @returns Promise，解析为目录内容数组
 */
async function loadDirectoryContents(path: string): Promise<GitHubContent[]> {
  return getContents(path);
}

/**
 * 检查文件是否匹配指定类型
 *
 * @param file - GitHub 内容项
 * @param fileTypeFilter - 文件类型过滤器（扩展名）
 * @returns 如果匹配或无需过滤返回 true
 */
function matchesFileType(file: GitHubContent, fileTypeFilter?: FileTypeFilter): boolean {
  const filters = normalizeFileTypeFilters(fileTypeFilter);

  if (filters.size === 0 || file.type !== "file") {
    return true;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension !== undefined && filters.has(extension);
}

/**
 * 根据文件名过滤内容
 *
 * @param contents - 目录内容数组
 * @param searchTerm - 搜索关键词
 * @param fileTypeFilter - 可选的文件类型过滤
 * @returns 过滤后的文件数组
 */
function filterFilesByName(
  contents: GitHubContent[],
  searchTerm: string,
  fileTypeFilter?: FileTypeFilter,
): GitHubContent[] {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return contents.filter((item) => {
    if (!matchesFileType(item, fileTypeFilter)) {
      return false;
    }

    const fileName = item.name.toLowerCase();
    return fileName.includes(normalizedSearchTerm);
  });
}

/**
 * 递归搜索子目录
 *
 * @param directories - 目录数组
 * @param searchTerm - 搜索关键词
 * @param fileTypeFilter - 可选的文件类型过滤
 * @returns Promise，解析为搜索结果数组
 */
async function searchSubdirectories(
  directories: GitHubContent[],
  searchTerm: string,
  fileTypeFilter?: FileTypeFilter,
): Promise<GitHubContent[]> {
  if (directories.length === 0) {
    return [];
  }

  logger.debug(`并行搜索 ${directories.length.toString()} 个子目录（无深度限制）`);

  const searchPromises = directories.map((dir) =>
    searchFiles(searchTerm, dir.path, true, fileTypeFilter).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "未知错误";
      logger.warn(`搜索目录 ${dir.path} 失败: ${message}`);
      return [] as GitHubContent[];
    }),
  );

  const subResults = await Promise.all(searchPromises);
  return subResults.flat();
}

/**
 * 搜索文件
 *
 * 在指定路径下搜索文件名包含关键词的文件，支持递归搜索。
 *
 * @param searchTerm - 搜索关键词
 * @param currentPath - 当前目录路径，默认为空（根目录）
 * @param recursive - 是否递归搜索子目录，默认为 false
 * @param fileTypeFilter - 可选的文件类型过滤（扩展名）
 * @returns Promise，解析为搜索结果数组
 * @throws 当搜索失败时抛出错误
 */
export async function searchFiles(
  searchTerm: string,
  currentPath = "",
  recursive = false,
  fileTypeFilter?: FileTypeFilter,
): Promise<GitHubContent[]> {
  if (searchTerm.trim() === "") {
    return [];
  }

  try {
    const contents = await loadDirectoryContents(currentPath);
    let results = filterFilesByName(contents, searchTerm, fileTypeFilter);

    if (recursive) {
      const directories = contents.filter((item) => item.type === "dir");
      const subdirectoryResults = await searchSubdirectories(
        directories,
        searchTerm,
        fileTypeFilter,
      );
      results = results.concat(subdirectoryResults);
    }

    logger.debug(`搜索结果: 找到 ${results.length.toString()} 个匹配项（仅匹配文件名）`);
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    logger.error(`搜索文件失败: ${message}`);
    throw new Error(`搜索文件失败: ${message}`);
  }
}

/**
 * 使用 Trees API 在多个分支中搜索
 *
 * @param searchTerm - 搜索关键词
 * @param branches - 要搜索的分支数组
 * @param pathPrefix - 路径前缀过滤
 * @param fileTypeFilter - 可选的文件类型过滤
 * @returns Promise，解析为各分支搜索结果数组
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
 *
 * 利用 Git Trees API 获取整个分支的文件树，然后本地过滤。
 * 适用于大型仓库的批量文件搜索。
 *
 * @param searchTerm - 搜索关键词
 * @param branch - 分支名称
 * @param pathPrefix - 路径前缀过滤
 * @param fileTypeFilter - 可选的文件类型过滤
 * @returns Promise，解析为搜索结果数组
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

    return tree
      .filter((item: GitTreeItem) => item.type === "blob")
      .filter((item) => {
        const itemPath = item.path ?? "";
        const fileName = itemPath.includes("/")
          ? itemPath.slice(itemPath.lastIndexOf("/") + 1)
          : itemPath;

        if (!fileName.toLowerCase().includes(normalizedSearchTerm)) {
          return false;
        }

        if (normalizedPrefix.length > 0 && !itemPath.toLowerCase().startsWith(normalizedPrefix)) {
          return false;
        }

        if (normalizedFileTypeFilters.size > 0) {
          const ext = fileName.includes(".")
            ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
            : "";
          if (!normalizedFileTypeFilters.has(ext)) {
            return false;
          }
        }

        return true;
      })
      .map((item) => {
        const itemPath = item.path ?? "";
        const fileName = itemPath.includes("/")
          ? itemPath.slice(itemPath.lastIndexOf("/") + 1)
          : itemPath;

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

        return result;
      });
  } catch (error) {
    if (isAbortError(error)) {
      throw createAbortError("Request aborted");
    }

    const message = error instanceof Error ? error.message : "未知错误";
    logger.warn(`使用 Trees API 搜索分支 ${branch} 失败`, message);
    return [];
  }
}
