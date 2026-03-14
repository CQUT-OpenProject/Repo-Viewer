/**
 * GitHub API Schema验证模块
 *
 * 提供GitHub API响应的Schema定义、验证函数和数据转换器。
 */

// API Schema验证
export * from "./apiSchemas";

// 数据转换器
export * from "./dataTransformers";
export * from "./searchIndexSchemas";

export {
  // 验证函数
  validateGitHubContentsResponse,
  validateGitHubSearchResponse,
  safeValidateGitHubContentsResponse,
  safeValidateGitHubSearchResponse,

  // Schema类型
  type GitHubContentItem,
  type GitHubContentsResponse,
  type GitHubSearchResponse,
  type GitHubSearchCodeItem,
} from "./apiSchemas";

export {
  // 转换函数
  transformGitHubContentsResponse,
  transformGitHubSearchResponse,
  transformGitHubContentItem,
  transformGitHubSearchCodeItem,

  // 工具函数
  filterAndNormalizeGitHubContents,
  sortGitHubContents,
  validateGitHubContentsArray,
  validateGitHubContentItem,
} from "./dataTransformers";

export {
  SearchIndexManifestSchema,
  SearchIndexBranchEntrySchema,
  safeValidateSearchIndexManifest,
  type SearchIndexManifest,
  type SearchIndexBranchEntry,
} from "./searchIndexSchemas";
