import type { GitHubContent } from "@/types";
import type { GitHubContentItem, GitHubContentsResponse } from "./apiSchemas";

/**
 * 转换GitHub API内容项
 */
export function transformGitHubContentItem(apiItem: GitHubContentItem): GitHubContent {
  const result: GitHubContent = {
    name: apiItem.name,
    path: apiItem.path,
    type: apiItem.type,
    sha: apiItem.sha,
    download_url: apiItem.download_url,
  };

  if (apiItem.size !== undefined) {
    result.size = apiItem.size;
  }

  if (apiItem.url !== undefined) {
    result.url = apiItem.url;
  }

  if (apiItem.html_url !== undefined) {
    result.html_url = apiItem.html_url;
  }

  if (apiItem.git_url !== undefined) {
    result.git_url = apiItem.git_url;
  }

  return result;
}

/**
 * 转换GitHub API内容响应
 */
export function transformGitHubContentsResponse(
  apiResponse: GitHubContentsResponse,
): GitHubContent[] {
  if (!Array.isArray(apiResponse)) {
    return [transformGitHubContentItem(apiResponse)];
  }

  return apiResponse.map(transformGitHubContentItem);
}

/**
 * 过滤和标准化GitHub内容
 */
export function filterAndNormalizeGitHubContents(
  contents: GitHubContent[],
  options: {
    excludeHidden?: boolean;
    excludeFiles?: string[];
  } = {},
): GitHubContent[] {
  const { excludeHidden = true, excludeFiles = [] } = options;

  let filtered = contents;

  if (excludeHidden) {
    filtered = filtered.filter((item) => !item.name.startsWith("."));
  }

  if (excludeFiles.length > 0) {
    filtered = filtered.filter((item) => !excludeFiles.includes(item.name));
  }

  return filtered;
}
