import { getGithubConfig, getAccessConfig } from "@/config";

// 基础配置
const githubConfig = getGithubConfig();
export const GITHUB_REPO_OWNER = githubConfig.repoOwner;
export const GITHUB_REPO_NAME = githubConfig.repoName;
export const DEFAULT_BRANCH = githubConfig.repoBranch;

let currentBranch =
  githubConfig.repoBranch.trim() !== "" ? githubConfig.repoBranch.trim() : DEFAULT_BRANCH;

// 运行时配置
const accessConfig = getAccessConfig();

// 模式设置
export const USE_TOKEN_MODE = accessConfig.useTokenMode;

// 工具函数
export const isDevEnvironment = import.meta.env.DEV;

// GitHub API 基础配置
export const GITHUB_API_BASE = "https://api.github.com";

/**
 * GitHub仓库配置信息接口
 */
export interface ConfigInfo {
  /** 仓库所有者 */
  repoOwner: string;
  /** 仓库名称 */
  repoName: string;
  /** 仓库分支 */
  repoBranch: string;
}

/**
 * 获取默认分支名称
 *
 * @returns 配置中的默认分支名称
 */
export function getDefaultBranch(): string {
  return DEFAULT_BRANCH;
}

/**
 * 获取当前活动分支名称
 *
 * @returns 当前正在使用的分支名称
 */
export function getCurrentBranch(): string {
  return currentBranch;
}

/**
 * 设置当前活动分支
 *
 * @param branch - 要切换到的分支名称
 * @returns void
 */
export function setCurrentBranch(branch: string): void {
  const normalized = branch.trim();
  currentBranch = normalized.length > 0 ? normalized : DEFAULT_BRANCH;
}

/**
 * 获取完整的仓库配置信息
 *
 * @returns 包含仓库所有者、名称和当前分支的配置对象
 */
export function getConfig(): ConfigInfo {
  const githubConfig = getGithubConfig();

  // 使用配置中的分支，保持与后端一致
  return {
    repoOwner: githubConfig.repoOwner,
    repoName: githubConfig.repoName,
    repoBranch: currentBranch,
  };
}

/**
 * 获取GitHub API的完整URL
 *
 * 根据环境和配置生成访问GitHub内容的API URL。
 * 开发环境会使用本地代理，生产环境直接访问GitHub API。
 *
 * @param path - 仓库内的文件或目录路径
 * @param branch - 可选的分支名称，未指定时使用当前分支
 * @returns 完整的API URL字符串
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
