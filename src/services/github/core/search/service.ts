/**
 * 搜索服务模块
 *
 * 提供GitHub仓库文件搜索功能的统一出口，支持多种搜索策略：
 * - GitHub API搜索（searchWithGitHubApi）：使用GitHub原生搜索API
 * - 本地索引搜索（searchFiles）：基于本地构建的搜索索引
 * - 多分支树搜索（searchMultipleBranchesWithTreesApi）：通过Git Trees API遍历多个分支
 *
 * 根据配置和上下文自动选择最优搜索策略。
 *
 * @module services/github/core/search/service
 */

import type { GitHubContent } from "@/types";

import { searchWithGitHubApi } from "./githubApi";
import { searchFiles, searchMultipleBranchesWithTreesApi } from "./local";

export { searchWithGitHubApi, searchFiles, searchMultipleBranchesWithTreesApi };

/**
 * 多分支树搜索结果类型
 *
 * 表示跨多个分支的搜索结果，每个分支包含其匹配的文件列表。
 */
export type SearchTreesResult = { branch: string; results: GitHubContent[] }[];
