/**
 * GitHub 相关 Hooks 类型定义
 *
 * 定义路径管理、分支管理、内容加载等 Hook 的返回类型接口。
 *
 * @module hooks/github/types
 */

import type { NavigationDirection } from "@/contexts/unified";
import type { GitHubContent } from "@/types";

/**
 * 路径管理 Hook 的返回类型
 *
 * 提供当前路径和状态管理功能。
 */
export interface PathManagementState {
  /** 当前路径 */
  currentPath: string;
  /** 设置当前路径 */
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  /** 设置刷新状态 */
  setRefreshState: (isRefreshing: boolean, targetPath?: string) => void;
}

/**
 * 分支管理 Hook 的返回类型
 *
 * 提供分支列表、当前分支和分支切换功能。
 */
export interface BranchManagementState {
  /** 当前分支 */
  currentBranch: string;
  /** 可用分支列表 */
  branches: string[];
  /** 分支加载状态 */
  branchLoading: boolean;
  /** 设置当前分支 */
  setCurrentBranch: (branch: string) => void;
  /** 刷新分支列表 */
  refreshBranches: () => Promise<void>;
}

/**
 * 内容加载 Hook 的返回类型
 *
 * 提供目录内容加载和管理功能。
 */
export interface ContentLoadingState {
  /** 目录内容列表 */
  contents: GitHubContent[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新内容 */
  refresh: () => void;
}

/**
 * README 内容 Hook 的返回类型
 *
 * 提供 README 文件内容加载和管理功能。
 */
export interface ReadmeContentState {
  /** README 内容 */
  readmeContent: string | null;
  /** README 加载状态 */
  loadingReadme: boolean;
  /** README 是否已加载 */
  readmeLoaded: boolean;
}
