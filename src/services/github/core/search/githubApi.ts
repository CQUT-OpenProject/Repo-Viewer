/**
 * GitHub API 搜索模块
 *
 * 通过 GitHub Search API 在代码库中搜索文件。
 * 支持服务端代理和直连 GitHub API 两种模式，使用请求批处理器优化性能。
 *
 * @module search/githubApi
 */

import axios from "axios";

import type { GitHubContent } from "@/types";
import { logger } from "@/utils";

import { RequestBatcher } from "../../RequestBatcher";
import { shouldUseServerAPI } from "../../config";
import {
  safeValidateGitHubSearchResponse,
  filterAndNormalizeGitHubContents,
  transformGitHubSearchResponse,
} from "../../schemas";
import { getAuthHeaders } from "../Auth";
import { GITHUB_API_BASE, GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from "../Config";

/** 请求批处理器实例 */
const batcher = new RequestBatcher();

/**
 * 构建搜索查询字符串
 *
 * 根据搜索词、路径和文件类型构建 GitHub Search API 查询。
 *
 * @param searchTerm - 搜索关键词
 * @param currentPath - 可选的当前路径过滤
 * @param fileTypeFilter - 可选的文件类型过滤（扩展名）
 * @returns 构建好的查询字符串
 */
function buildSearchQuery(
  searchTerm: string,
  currentPath?: string,
  fileTypeFilter?: string,
): string {
  const trimmedTerm = searchTerm.trim();
  const safeTerm = trimmedTerm.replace(/"/g, "");
  const keyword = /\s/.test(safeTerm) ? `"${safeTerm}"` : safeTerm;

  let query = `repo:${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} ${keyword} in:path`;

  if (currentPath !== undefined && currentPath !== "" && currentPath !== "/") {
    query += ` path:${currentPath}`;
  }

  if (fileTypeFilter !== undefined && fileTypeFilter !== "") {
    query += ` extension:${fileTypeFilter}`;
  }

  return query;
}

/**
 * 通过服务端 API 搜索
 *
 * @param query - 搜索查询字符串
 * @returns Promise，解析为 API 原始响应数据
 */
async function searchViaServerApi(query: string): Promise<unknown> {
  const response = await axios.get(`/api/github?action=search&q=${encodeURIComponent(query)}`);
  logger.debug(`通过服务端API搜索: ${query}`);
  return response.data;
}

/**
 * 直接请求 GitHub API 搜索
 *
 * 使用请求批处理器进行请求合并和重试。
 *
 * @param query - 搜索查询字符串
 * @returns Promise，解析为 API 原始响应数据
 */
async function searchViaDirectApi(query: string): Promise<unknown> {
  const apiUrl = `${GITHUB_API_BASE}/search/code`;
  const urlWithParams = new URL(apiUrl);
  urlWithParams.searchParams.append("q", query);
  urlWithParams.searchParams.append("per_page", "100");

  const fetchUrl = urlWithParams.toString();
  const result = await batcher.enqueue(
    fetchUrl,
    async () => {
      logger.debug(`搜索API请求: ${fetchUrl}`);
      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
      }

      return (await response.json()) as unknown;
    },
    {
      priority: "medium",
      method: "GET",
      headers: getAuthHeaders() as Record<string, string>,
    },
  );

  logger.debug(`直接请求GitHub API搜索: ${query}`);
  return result;
}

/**
 * 使用 GitHub API 搜索文件
 *
 * 根据环境自动选择服务端代理或直接请求 GitHub API。
 * 对响应进行验证、转换和过滤处理。
 *
 * @param searchTerm - 搜索关键词
 * @param currentPath - 可选的当前路径过滤，默认为空
 * @param fileTypeFilter - 可选的文件类型过滤
 * @returns Promise，解析为标准化后的搜索结果数组
 * @throws 当搜索失败或响应格式错误时抛出错误
 */
export async function searchWithGitHubApi(
  searchTerm: string,
  currentPath = "",
  fileTypeFilter?: string,
): Promise<GitHubContent[]> {
  try {
    const query = buildSearchQuery(searchTerm, currentPath, fileTypeFilter);

    const rawResults = await (shouldUseServerAPI()
      ? searchViaServerApi(query)
      : searchViaDirectApi(query));

    const validation = safeValidateGitHubSearchResponse(rawResults);
    if (!validation.success) {
      logger.error(`搜索API响应验证失败: ${query}`, validation.error);
      throw new Error(`搜索响应格式错误: ${validation.error}`);
    }

    const searchContents = transformGitHubSearchResponse(validation.data);

    return filterAndNormalizeGitHubContents(searchContents, {
      excludeHidden: false,
      includeOnlyTypes: ["file"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    logger.error(`搜索失败: ${searchTerm}`, error);
    throw new Error(`搜索失败: ${message}`);
  }
}
