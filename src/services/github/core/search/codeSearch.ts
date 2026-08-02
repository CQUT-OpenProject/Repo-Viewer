/**
 * GitHub Code Search API 搜索模块
 *
 * 通过服务端代理调用 GitHub /search/code 接口，支持仓库内容与路径的全文搜索。
 * GitHub Code Search 仅索引默认分支，非默认分支的搜索由 Trees API 路径搜索兜底。
 * 服务端已内置多 PAT 轮换与限速处理，因此本模块始终走服务端代理。
 *
 * @module search/codeSearch
 */

import axios from "axios";
import { getGithubConfig } from "@/config";
import { logger } from "@/utils/logging/logger";
import { createAbortError, isAbortError } from "@/utils/network/abort";

/**
 * Code Search 搜索选项接口
 */
export interface CodeSearchOptions {
  /** 搜索关键词 */
  keyword: string;
  /** 搜索结果所属分支（默认分支） */
  branch: string;
  /** 路径前缀过滤 */
  pathPrefix?: string;
  /** 文件扩展名过滤数组 */
  extensions?: string[];
  /** 返回结果数量限制，默认为 100 */
  limit?: number;
  /** 请求中断信号 */
  signal?: AbortSignal;
}

/**
 * Code Search 搜索结果项接口
 */
export interface CodeSearchResultItem {
  /** 匹配的分支（默认分支） */
  branch: string;
  /** 文件路径 */
  path: string;
  /** 文件名称 */
  name: string;
  /** 文件扩展名 */
  extension?: string;
  /** 内容片段预览 */
  snippet?: string;
  /** GitHub HTML 浏览链接 */
  htmlUrl?: string;
  /** 原始内容下载链接 */
  downloadUrl?: string;
  /** 文件 SHA */
  sha?: string;
}

/**
 * 服务端 Code Search 响应中的单个结果项
 */
interface ServerCodeSearchItem {
  name?: string;
  path?: string;
  sha?: string;
  htmlUrl?: string;
  textMatches?: { fragment: string }[];
}

interface ServerCodeSearchResponse {
  status: string;
  data?: {
    totalCount?: number;
    items?: ServerCodeSearchItem[];
  };
}

const SNIPPET_MAX_LENGTH = 180;

const resolveEntryName = (filePath: string): string => filePath.split("/").pop() ?? filePath;

const resolveEntryExtension = (filePath: string): string => {
  const name = resolveEntryName(filePath);
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return "";
  }
  return name.slice(dotIndex + 1).toLowerCase();
};

const normalizeSnippet = (fragment: string): string =>
  fragment.replace(/\s+/g, " ").trim().slice(0, SNIPPET_MAX_LENGTH);

/**
 * 搜索仓库内容
 *
 * @param options - 搜索选项
 * @returns 解析后的搜索结果数组，失败时抛出错误
 */
export async function searchCodeWithApi(
  options: CodeSearchOptions,
): Promise<CodeSearchResultItem[]> {
  const { repoOwner, repoName } = getGithubConfig();
  if (repoOwner.trim() === "" || repoName.trim() === "") {
    throw new Error("仓库配置缺失");
  }

  const keyword = options.keyword.trim();
  if (keyword.length === 0) {
    return [];
  }

  const params = new URLSearchParams();
  params.set("action", "searchCode");
  params.set("keyword", keyword);

  const pathPrefix = options.pathPrefix?.trim() ?? "";
  if (pathPrefix.length > 0) {
    params.set("pathPrefix", pathPrefix);
  }

  const extensions = (options.extensions ?? [])
    .map((extension) => extension.trim().toLowerCase().replace(/^\./, ""))
    .filter((extension) => extension.length > 0);
  if (extensions.length > 0) {
    params.set("extensions", extensions.join(","));
  }

  const limit = options.limit ?? 100;
  params.set("limit", limit.toString());

  try {
    const response = await axios.get<ServerCodeSearchResponse>(`/api/github?${params.toString()}`, {
      signal: options.signal,
    });
    const payload = response.data;

    if (payload.status !== "success" || !Array.isArray(payload.data?.items)) {
      throw new Error("Code Search 响应格式错误");
    }

    const safeBranch = options.branch.trim();
    const normalizedPath = (path: string): string => path.replace(/^\/+/u, "");
    const safeBranchSegments = safeBranch.split("/").map(encodeURIComponent).join("/");

    return payload.data.items
      .map((item) => {
        const path = typeof item.path === "string" ? item.path.trim() : "";
        if (path.length === 0) {
          return null;
        }

        const name =
          typeof item.name === "string" && item.name.length > 0
            ? item.name
            : resolveEntryName(path);
        const extension = resolveEntryExtension(path);
        const encodedPath = normalizedPath(path).split("/").map(encodeURIComponent).join("/");

        const result: CodeSearchResultItem = {
          branch: safeBranch,
          path,
          name,
        };

        if (extension.length > 0) {
          result.extension = extension;
        }
        if (typeof item.sha === "string" && item.sha.length > 0) {
          result.sha = item.sha;
        }

        const firstMatch = item.textMatches?.[0];
        if (firstMatch !== undefined && firstMatch.fragment.length > 0) {
          const snippet = normalizeSnippet(firstMatch.fragment);
          if (snippet.length > 0) {
            result.snippet = snippet;
          }
        }

        result.htmlUrl = `https://github.com/${repoOwner}/${repoName}/blob/${safeBranchSegments}/${encodedPath}`;
        result.downloadUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${safeBranchSegments}/${encodedPath}`;

        return result;
      })
      .filter((item): item is CodeSearchResultItem => item !== null);
  } catch (unknownError) {
    const cause = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    if (isAbortError(cause)) {
      throw createAbortError("Request aborted");
    }

    logger.error("Code Search 搜索失败:", cause);
    throw new Error(`Code Search 搜索失败: ${cause.message}`);
  }
}
