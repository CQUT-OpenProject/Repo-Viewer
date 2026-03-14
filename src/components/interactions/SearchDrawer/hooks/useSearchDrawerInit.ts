import { useEffect, useRef } from "react";

interface UseSearchDrawerInitProps {
  open: boolean;
  currentPath: string;
  search: {
    setKeyword: (value: string) => void;
    setBranchFilter: (branches: string[]) => void;
    setExtensionFilter: (extensions: string[]) => void;
    clearResults: () => void;
    initializeIndex: () => void;
  };
  setPathPrefix: (prefix: string) => void;
  setExtensionInput: (value: string) => void;
  setFiltersExpanded: (value: boolean) => void;
}

const SEARCH_INPUT_ID = "repo-search-keyword";

/**
 * 搜索抽屉初始化 Hook
 * 处理打开/关闭时的状态重置和自动填充逻辑
 */
export const useSearchDrawerInit = ({
  open,
  currentPath,
  search,
  setPathPrefix,
  setExtensionInput,
  setFiltersExpanded,
}: UseSearchDrawerInitProps): void => {
  const previousOpenRef = useRef(false);

  useEffect(() => {
    const wasOpen = previousOpenRef.current;

    if (open && !wasOpen) {
      // 初始化搜索索引（懒加载）
      search.initializeIndex();

      // 重置所有筛选条件
      search.setKeyword("");
      search.setBranchFilter([]);
      search.setExtensionFilter([]);
      setExtensionInput("");
      search.clearResults();
      setFiltersExpanded(false);

      // 自动填充当前路径
      const trimmedCurrentPath = currentPath.trim();
      setPathPrefix(trimmedCurrentPath.length > 0 ? trimmedCurrentPath : "");

      // 聚焦搜索框
      setTimeout(() => {
        const input = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
        input?.focus();
      }, 100);
    }

    previousOpenRef.current = open;
  }, [open, currentPath, setPathPrefix, search, setExtensionInput, setFiltersExpanded]);
};
