import { getGithubConfig } from "@/config";

// 基础配置
const githubConfig = getGithubConfig();
export const GITHUB_REPO_OWNER = githubConfig.repoOwner;
export const GITHUB_REPO_NAME = githubConfig.repoName;
export const DEFAULT_BRANCH = githubConfig.repoBranch;

let currentBranch =
  githubConfig.repoBranch.trim() !== "" ? githubConfig.repoBranch.trim() : DEFAULT_BRANCH;

// 工具函数
export const isDevEnvironment = import.meta.env.DEV;

// GitHub API 基础配置
export const GITHUB_API_BASE = "https://api.github.com";

/**
 * 获取默认分支名称
 */
export function getDefaultBranch(): string {
  return DEFAULT_BRANCH;
}

/**
 * 获取当前活动分支名称
 */
export function getCurrentBranch(): string {
  return currentBranch;
}

/**
 * 设置当前活动分支
 */
export function setCurrentBranch(branch: string): void {
  const normalized = branch.trim();
  currentBranch = normalized.length > 0 ? normalized : DEFAULT_BRANCH;
}

/**
 * 获取GitHub API的完整URL
 */
export function getApiUrl(path: string, branch?: string): string {
  const safePath = path.replace(/^\/+/, "");
  const branchValue = branch ?? currentBranch;
  const activeBranch = branchValue.trim() !== "" ? branchValue.trim() : DEFAULT_BRANCH;
  const encodedBranch = encodeURIComponent(activeBranch);
  const encodedPath =
    safePath.length > 0
      ? safePath
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/")
      : "";
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${encodedPath}?ref=${encodedBranch}`;

  // 开发环境使用本地代理
  if (isDevEnvironment) {
    return `/github-api/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${encodedPath}?ref=${encodedBranch}`;
  }

  return apiUrl;
}
