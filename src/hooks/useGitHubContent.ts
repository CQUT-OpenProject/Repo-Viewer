import { useCallback, useEffect } from "react";
import type { GitHubContent } from "@/types";
import type { NavigationDirection } from "@/contexts/unified";
import { getGithubConfig } from "@/config";
import { usePathManagement } from "./github/usePathManagement";
import { useBranchManagement } from "./github/useBranchManagement";
import { useContentLoading } from "./github/useContentLoading";
import { useReadmeContent } from "./github/useReadmeContent";
import { GitHub } from "@/services/github";
import { useRepoSearch } from "./github/useRepoSearch";
import type { RepoSearchState } from "./github/useRepoSearch";

// 获取仓库信息
const githubConfig = getGithubConfig();
const GITHUB_REPO_OWNER = githubConfig.repoOwner;
const GITHUB_REPO_NAME = githubConfig.repoName;
const DEFAULT_BRANCH = GitHub.Branch.getDefaultBranchName();

/**
 * GitHub内容管理Hook
 *
 * 管理GitHub仓库内容的获取、缓存和状态，支持分支切换、路径导航和README预览。
 * 自动处理URL参数和浏览器历史导航。
 *
 * @returns GitHub内容状态和操作函数
 */
export const useGitHubContent = (): {
  currentPath: string;
  contents: GitHubContent[];
  readmeContent: string | null;
  loading: boolean;
  loadingReadme: boolean;
  readmeLoaded: boolean;
  error: string | null;
  setCurrentPath: (path: string, direction?: NavigationDirection) => void;
  refreshContents: () => void;
  navigationDirection: NavigationDirection;
  repoOwner: string;
  repoName: string;
  currentBranch: string;
  defaultBranch: string;
  branches: string[];
  branchLoading: boolean;
  branchError: string | null;
  setCurrentBranch: (branch: string) => void;
  refreshBranches: () => Promise<void>;
  search: RepoSearchState;
} => {
  // 使用分支管理 Hook
  const branchState = useBranchManagement();

  // 使用路径管理 Hook
  const pathState = usePathManagement(branchState.currentBranch);

  // 使用内容加载 Hook
  const contentState = useContentLoading(pathState.currentPath, branchState.currentBranch);

  // 使用 README 内容 Hook
  const readmeState = useReadmeContent(
    contentState.contents,
    pathState.currentPath,
    branchState.currentBranch,
  );

  const searchState = useRepoSearch({
    currentBranch: branchState.currentBranch,
    defaultBranch: DEFAULT_BRANCH,
    branches: branchState.branches,
  });

  // 处理分支切换时的副作用
  const handleBranchChange = useCallback(
    (branch: string) => {
      branchState.setCurrentBranch(branch);
      // 切换分支时导航到根目录
      pathState.setCurrentPath("", "none");
    },
    [branchState, pathState],
  );

  // 处理刷新内容
  const refreshContents = useCallback(() => {
    pathState.setRefreshState(true, pathState.currentPath);
    contentState.refresh();
    pathState.setNavigationDirection("none");
  }, [pathState, contentState]);

  // 同步刷新状态
  useEffect(() => {
    if (!contentState.loading) {
      pathState.setRefreshState(false);
    }
  }, [contentState.loading, pathState]);

  return {
    // 路径相关
    currentPath: pathState.currentPath,
    navigationDirection: pathState.navigationDirection,
    setCurrentPath: pathState.setCurrentPath,

    // 内容相关
    contents: contentState.contents,
    loading: contentState.loading,
    error: contentState.error,
    refreshContents,

    // README 相关
    readmeContent: readmeState.readmeContent,
    loadingReadme: readmeState.loadingReadme,
    readmeLoaded: readmeState.readmeLoaded,

    // 分支相关
    currentBranch: branchState.currentBranch,
    branches: branchState.branches,
    branchLoading: branchState.branchLoading,
    branchError: branchState.branchError,
    setCurrentBranch: handleBranchChange,
    refreshBranches: branchState.refreshBranches,
    search: searchState,

    // 仓库信息
    repoOwner: GITHUB_REPO_OWNER,
    repoName: GITHUB_REPO_NAME,
    defaultBranch: DEFAULT_BRANCH,
  };
};
