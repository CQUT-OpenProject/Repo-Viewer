import { useCallback } from "react";
import { GitHub } from "@/services/github";
import { logger } from "@/utils";
import type { RepoSearchItem } from "@/hooks/github/useRepoSearch";
import type { GitHubContent } from "@/types";

interface UseSearchActionsProps {
  search: {
    keyword: string;
    branchFilter: string[];
    setPreferredMode: (mode: "github-api") => void;
    search: (options?: { mode?: "github-api" }) => Promise<unknown>;
  };
  currentBranch: string;
  defaultBranch: string;
  setCurrentBranch: (branch: string) => void;
  navigateTo: (path: string, direction: "forward") => void;
  findFileItemByPath: (path: string) => GitHubContent | undefined;
  selectFile: (file: GitHubContent) => void | Promise<void>;
  onClose: () => void;
}

/**
 * 搜索操作 Hook
 * 封装所有搜索相关的业务逻辑
 */
export const useSearchActions = ({
  search,
  currentBranch,
  defaultBranch,
  setCurrentBranch,
  navigateTo,
  findFileItemByPath,
  selectFile,
  onClose,
}: UseSearchActionsProps): {
  handleSearch: () => Promise<void>;
  handleApiSearch: () => void;
  handleResultClick: (item: RepoSearchItem) => Promise<void>;
} => {
  // 执行搜索
  const handleSearch = useCallback(async () => {
    try {
      await search.search();
    } catch (error: unknown) {
      logger.warn("搜索失败", error);
    }
  }, [search]);

  // 使用 API 模式搜索
  const handleApiSearch = useCallback(() => {
    if (search.keyword.trim() === "") {
      return;
    }
    search.setPreferredMode("github-api");
    void search.search({ mode: "github-api" }).catch((error: unknown) => {
      logger.warn("使用 API 模式搜索失败", error);
    });
  }, [search]);

  // 点击搜索结果
  const handleResultClick = useCallback(
    async (item: RepoSearchItem) => {
      // 确定目标分支
      const fallbackBranch = currentBranch !== "" ? currentBranch : defaultBranch;
      const preferredBranch = search.branchFilter[0] ?? fallbackBranch;
      const targetBranch = item.branch.length > 0 ? item.branch : preferredBranch;

      // 切换分支（如需要）
      if (targetBranch.length > 0 && targetBranch !== currentBranch) {
        setCurrentBranch(targetBranch);
      }

      // 导航到文件所在目录
      const directoryPath = item.path.includes("/")
        ? item.path.slice(0, item.path.lastIndexOf("/"))
        : "";
      navigateTo(directoryPath, "forward");

      // 查找或加载文件项
      let fileItem = findFileItemByPath(item.path);
      if (fileItem === undefined) {
        try {
          const contents = await GitHub.Content.getContents(directoryPath);
          fileItem = contents.find((content) => content.path === item.path);
        } catch (error: unknown) {
          logger.warn("加载文件用于预览失败", error);
        }
      }

      // 选择文件进行预览
      if (fileItem !== undefined) {
        await selectFile(fileItem);
      }

      onClose();
    },
    [
      currentBranch,
      defaultBranch,
      search.branchFilter,
      setCurrentBranch,
      navigateTo,
      findFileItemByPath,
      selectFile,
      onClose,
    ],
  );

  return {
    handleSearch,
    handleApiSearch,
    handleResultClick,
  };
};
