/**
 * 搜索索引搜索模块
 *
 * 提供基于 docfind 搜索索引的全文搜索功能。
 * 支持多分支搜索、扩展名过滤、路径前缀过滤等功能。
 *
 * @module searchIndex/search
 */

import { getGithubConfig, getSearchIndexConfig } from "@/config";

import { createSearchIndexError, SearchIndexErrorCode } from "./errors";
import { fetchManifest, getDocfindSearchHandler } from "./fetchers";

/**
 * 搜索选项接口
 */
export interface SearchIndexSearchOptions {
  /** 搜索关键词 */
  keyword: string;
  /** 要搜索的分支数组，默认为配置中的默认分支 */
  branches?: string[];
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
 * 搜索结果项接口
 */
export interface SearchIndexResultItem {
  /** 匹配的分支 */
  branch: string;
  /** 文件路径 */
  path: string;
  /** 文件名称 */
  name: string;
  /** 文件扩展名 */
  extension?: string;
  /** 文件大小 */
  size?: number;
  /** 是否为二进制文件 */
  binary?: boolean;
  /** GitHub HTML 浏览链接 */
  htmlUrl?: string;
  /** 原始内容下载链接 */
  downloadUrl?: string;
  /** 匹配得分 */
  score: number;
  /** 内容片段预览 */
  snippet?: string;
}

const SNIPPET_MAX_LENGTH = 180;
const SNIPPET_CONTEXT = 60;
const MIN_DOCFIND_LIMIT = 100;
const DOCFIND_LIMIT_GROWTH = 2;
const MAX_DOCFIND_LIMIT = 1000;

function normalizeExtensions(extensions?: string[]): Set<string> | null {
  if (extensions === undefined) {
    return null;
  }
  const normalized = extensions
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.length > 0)
    .map((ext) => (ext.startsWith(".") ? ext.slice(1) : ext));
  return normalized.length > 0 ? new Set(normalized) : null;
}

function resolveEntryName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

function resolveEntryExtension(filePath: string): string {
  const name = resolveEntryName(filePath);
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return "";
  }
  return name.slice(dotIndex + 1).toLowerCase();
}

function resolveDocPath(result: Record<string, unknown>): string | null {
  const pathValue = result["path"];
  if (typeof pathValue === "string" && pathValue.trim().length > 0) {
    return pathValue;
  }
  const hrefValue = result["href"];
  if (typeof hrefValue === "string" && hrefValue.trim().length > 0) {
    return hrefValue;
  }
  return null;
}

function normalizeBody(body: string): string {
  return body.replace(/\s+/g, " ").trim();
}

function buildSnippet(body: string, keyword: string): string | undefined {
  const normalized = normalizeBody(body);
  if (normalized.length === 0) {
    return undefined;
  }

  const tokens = keyword
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);

  const lowerBody = normalized.toLowerCase();
  let hitIndex = -1;
  for (const token of tokens) {
    const index = lowerBody.indexOf(token);
    if (index >= 0 && (hitIndex === -1 || index < hitIndex)) {
      hitIndex = index;
    }
  }

  let start = 0;
  if (hitIndex >= 0) {
    start = Math.max(0, hitIndex - SNIPPET_CONTEXT);
  }
  const end = Math.min(normalized.length, start + SNIPPET_MAX_LENGTH);
  if (end - start < SNIPPET_MAX_LENGTH && start > 0) {
    start = Math.max(0, end - SNIPPET_MAX_LENGTH);
  }

  let snippet = normalized.slice(start, end).trim();
  if (snippet.length === 0) {
    return undefined;
  }
  if (start > 0) {
    snippet = `…${snippet}`;
  }
  if (end < normalized.length) {
    snippet = `${snippet}…`;
  }
  return snippet;
}

function buildGithubUrls(
  branch: string,
  filePath: string,
): { htmlUrl?: string; downloadUrl?: string } {
  const { repoOwner, repoName } = getGithubConfig();
  if (repoOwner.trim() === "" || repoName.trim() === "") {
    return {};
  }
  const safeOwner = encodeURIComponent(repoOwner);
  const safeRepo = encodeURIComponent(repoName);
  const safeBranch = branch.split("/").map(encodeURIComponent).join("/");
  const normalizedPath = filePath.replace(/^\/+/u, "");
  const encodedPath = normalizedPath.split("/").map(encodeURIComponent).join("/");
  return {
    htmlUrl: `https://github.com/${safeOwner}/${safeRepo}/blob/${safeBranch}/${encodedPath}`,
    downloadUrl: `https://raw.githubusercontent.com/${safeOwner}/${safeRepo}/${safeBranch}/${encodedPath}`,
  };
}

export async function searchIndex(
  options: SearchIndexSearchOptions,
): Promise<SearchIndexResultItem[]> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, "Search index feature is disabled");
  }

  const keyword = options.keyword.trim();
  if (keyword.length === 0) {
    return [];
  }

  const manifest = await fetchManifest(options.signal);
  const manifestBranches = Object.keys(manifest.branches);
  if (manifestBranches.length === 0) {
    throw createSearchIndexError(
      SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED,
      "No indexed branches found",
    );
  }

  const requestedBranches =
    options.branches !== undefined && options.branches.length > 0
      ? options.branches
      : [config.defaultBranch];

  let candidateBranches = requestedBranches
    .map((branch) => branch.trim())
    .filter((branch) => branch.length > 0);

  if (candidateBranches.length === 0) {
    candidateBranches = manifestBranches;
  }

  const indexedBranches = candidateBranches.filter(
    (branch) => manifest.branches[branch] !== undefined,
  );
  if (indexedBranches.length === 0) {
    throw createSearchIndexError(
      SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED,
      "No indexed branches found for search request",
      { branch: candidateBranches.join(", ") },
    );
  }

  const extensionFilter = normalizeExtensions(options.extensions);
  const pathPrefix = options.pathPrefix?.trim().toLowerCase() ?? "";
  const limit = options.limit ?? 100;
  const hasFilters = pathPrefix.length > 0 || extensionFilter !== null;

  const results: SearchIndexResultItem[] = [];

  const collectBranchResults = (
    branch: string,
    branchResults: unknown[],
  ): SearchIndexResultItem[] => {
    const collected: SearchIndexResultItem[] = [];
    for (const rawResult of branchResults) {
      if (typeof rawResult !== "object" || rawResult === null) {
        continue;
      }
      const result = rawResult as Record<string, unknown>;
      const path = resolveDocPath(result);
      if (path === null) {
        continue;
      }

      if (pathPrefix.length > 0 && !path.toLowerCase().startsWith(pathPrefix)) {
        continue;
      }

      const extension = resolveEntryExtension(path);
      if (extensionFilter !== null && !extensionFilter.has(extension)) {
        continue;
      }

      const name = resolveEntryName(path);
      const scoreValue = result["score"];
      const score = typeof scoreValue === "number" ? scoreValue : 0;
      const bodyValue = result["body"];
      const body = typeof bodyValue === "string" ? bodyValue : "";
      const snippet = body.length > 0 ? buildSnippet(body, keyword) : undefined;
      const urls = buildGithubUrls(branch, path);

      const item: SearchIndexResultItem = {
        branch,
        path,
        name,
        score,
      };

      if (extension.length > 0) {
        item.extension = extension;
      }
      if (snippet !== undefined) {
        item.snippet = snippet;
      }
      if (urls.htmlUrl !== undefined) {
        item.htmlUrl = urls.htmlUrl;
      }
      if (urls.downloadUrl !== undefined) {
        item.downloadUrl = urls.downloadUrl;
      }

      collected.push(item);
    }
    return collected;
  };

  for (const branch of indexedBranches) {
    const searchHandler = await getDocfindSearchHandler(branch, options.signal);
    const baseLimit = hasFilters ? Math.max(limit, MIN_DOCFIND_LIMIT) : limit;
    const maxLimit = hasFilters ? Math.max(baseLimit * 10, MAX_DOCFIND_LIMIT) : limit;

    let fetchLimit = baseLimit;
    let branchResults = await searchHandler(keyword, fetchLimit);
    let branchItems = collectBranchResults(branch, branchResults);

    // 有过滤条件时扩大取回量，避免过滤后结果不足
    while (
      hasFilters &&
      branchItems.length < limit &&
      fetchLimit < maxLimit &&
      branchResults.length >= fetchLimit
    ) {
      const nextLimit = Math.min(fetchLimit * DOCFIND_LIMIT_GROWTH, maxLimit);
      if (nextLimit === fetchLimit) {
        break;
      }
      fetchLimit = nextLimit;
      branchResults = await searchHandler(keyword, fetchLimit);
      branchItems = collectBranchResults(branch, branchResults);
    }

    for (const item of branchItems) {
      results.push(item);
      if (results.length >= limit) {
        break;
      }
    }

    if (results.length >= limit) {
      break;
    }
  }

  results.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.path.localeCompare(b.path);
  });

  return results.slice(0, limit);
}
