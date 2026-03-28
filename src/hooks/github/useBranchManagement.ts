import { useState, useEffect, useCallback, useRef } from "react";
import { GitHub } from "@/services/github";
import { logger } from "@/utils";
import { getBranchFromUrl } from "@/utils/routing/urlManager";
import type { BranchManagementState } from "./types";

const DEFAULT_BRANCH = GitHub.Branch.getDefaultBranchName();

/**
 * 分支管理 Hook
 *
 * 管理 GitHub 仓库的分支列表、当前分支和分支切换
 *
 * @returns 分支管理状态和操作函数
 */
export function useBranchManagement(): BranchManagementState {
  const [currentBranch, setCurrentBranchState] = useState<string>(() => {
    const branchFromUrl = getBranchFromUrl().trim();
    if (branchFromUrl.length > 0) {
      GitHub.Branch.setCurrentBranch(branchFromUrl);
      return branchFromUrl;
    }
    return GitHub.Branch.getCurrentBranch();
  });

  const [branches, setBranches] = useState<string[]>(() => {
    const initial = GitHub.Branch.getCurrentBranch();
    return Array.from(new Set([DEFAULT_BRANCH, initial]));
  });

  const [branchLoading, setBranchLoading] = useState<boolean>(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const currentBranchRef = useRef<string>(currentBranch);
  currentBranchRef.current = currentBranch;

  const mergeBranchList = useCallback((branchesToMerge: string[]) => {
    setBranches((prev) => {
      const branchSet = new Set(prev);
      branchesToMerge.forEach((name) => {
        const trimmed = name.trim();
        if (trimmed.length > 0) {
          branchSet.add(trimmed);
        }
      });
      branchSet.add(DEFAULT_BRANCH);
      branchSet.add(currentBranchRef.current);

      const branchArray = Array.from(branchSet);
      // 按字母顺序排序
      branchArray.sort((a, b) => a.localeCompare(b, "zh-CN"));
      // 默认分支排在最前面
      branchArray.sort((a, b) => {
        if (a === DEFAULT_BRANCH) {
          return -1;
        }
        if (b === DEFAULT_BRANCH) {
          return 1;
        }
        return 0;
      });
      return branchArray;
    });
  }, []);

  const loadBranches = useCallback(async () => {
    setBranchLoading(true);
    setBranchError(null);
    try {
      const fetchedBranches = await GitHub.Branch.getBranches();
      mergeBranchList(fetchedBranches);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setBranchError(`获取分支列表失败: ${message}`);
      logger.error("获取分支列表失败:", error);
    } finally {
      setBranchLoading(false);
    }
  }, [mergeBranchList]);

  // 初始加载分支列表
  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const applyBranchState = useCallback(
    (branchName: string): string => {
      const trimmed = branchName.trim();
      const target = trimmed.length > 0 ? trimmed : DEFAULT_BRANCH;

      if (currentBranchRef.current === target) {
        return target;
      }

      GitHub.Branch.setCurrentBranch(target);
      currentBranchRef.current = target;
      setCurrentBranchState(target);
      mergeBranchList([target]);
      setBranchError(null);

      return target;
    },
    [mergeBranchList],
  );

  const setCurrentBranch = useCallback(
    (branchName: string): void => {
      const trimmed = branchName.trim();
      const targetBranch = trimmed.length > 0 ? trimmed : DEFAULT_BRANCH;

      if (targetBranch === currentBranchRef.current) {
        logger.debug(`分支未变更，忽略：${targetBranch}`);
        return;
      }

      logger.info(`切换分支: ${currentBranchRef.current} -> ${targetBranch}`);
      applyBranchState(targetBranch);
    },
    [applyBranchState],
  );

  // 监听 popstate 事件中的分支变化
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      const state = event.state as { path?: string; preview?: string; branch?: string } | null;

      const stateBranch = typeof state?.branch === "string" ? state.branch : "";
      const urlBranch = getBranchFromUrl().trim();
      const branchCandidate = stateBranch.trim().length > 0 ? stateBranch.trim() : urlBranch;

      if (branchCandidate.length > 0) {
        if (branchCandidate !== currentBranchRef.current) {
          logger.debug(`历史导航事件，应用分支: ${branchCandidate}`);
          applyBranchState(branchCandidate);
        }
      } else if (currentBranchRef.current !== DEFAULT_BRANCH) {
        logger.debug("历史导航事件，无分支信息，回退到默认分支");
        applyBranchState(DEFAULT_BRANCH);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [applyBranchState]);

  return {
    currentBranch,
    branches,
    branchLoading,
    branchError,
    setCurrentBranch,
    refreshBranches: loadBranches,
  };
}
