import React, { useState, useEffect, useRef } from "react";
import type { GitHubContent } from "@/types";
import { GitHub } from "@/services/github";
import { logger } from "@/utils";
import { requestManager } from "@/utils/request/requestManager";
import { handleError } from "@/utils/error/errorHandler";
import { processContents } from "@/utils/content";
import { getFeaturesConfig } from "@/config";
import { useThemeTransitionFlag } from "@/hooks/useThemeTransition";
import type { ContentLoadingState } from "./types";

type ContentSource = "cache" | "hydration" | "network";

interface LoadContentsOptions {
  forceRefresh?: boolean;
  silent?: boolean;
}

/**
 * 内容加载 Hook
 *
 * 管理 GitHub 仓库内容的加载和过滤
 *
 * @param path - 当前路径
 * @param branch - 当前分支
 * @returns 内容加载状态和操作函数
 */
export function useContentLoading(path: string, branch: string): ContentLoadingState {
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const currentPathRef = useRef<string>(path);
  const currentBranchRef = useRef<string>(branch);
  const isThemeChangingRef = useThemeTransitionFlag();
  const contentsRef = useRef<GitHubContent[]>([]);
  const lastSignatureRef = useRef<string>("");
  const forceRefreshRef = useRef<boolean>(false);
  const revalidateKeyRef = useRef<string | null>(null);

  const buildContentsSignature = React.useCallback((data: GitHubContent[]): string => {
    if (data.length === 0) {
      return "";
    }

    return data.map((item) => `${item.path}:${item.sha}:${item.type}`).join("|");
  }, []);

  currentPathRef.current = path;
  currentBranchRef.current = branch;
  contentsRef.current = contents;
  lastSignatureRef.current = buildContentsSignature(contents);

  const displayError = React.useCallback((message: string) => {
    setError(message);
    logger.error(message);
  }, []);

  const filterContents = React.useCallback(
    (data: GitHubContent[]): GitHubContent[] => {
      const featuresConfig = getFeaturesConfig();
      const isHomepage = path === "";

      return processContents(data, isHomepage, {
        enabled: featuresConfig.homepageFilter.enabled,
        allowedFolders: featuresConfig.homepageFilter.allowedFolders,
        allowedFileTypes: featuresConfig.homepageFilter.allowedFileTypes,
      });
    },
    [path],
  );

  const loadContents = React.useCallback(
    async (options?: LoadContentsOptions) => {
      const hasExistingContent = contentsRef.current.length > 0;
      const silent = options?.silent === true;
      const forceRefresh = options?.forceRefresh === true;
      const shouldShowLoading = !silent || !hasExistingContent;

      if (shouldShowLoading) {
        setLoading(true);
        setError(null);
      }

      try {
        const sourceTracker: { value: ContentSource } = { value: "network" };

        // 使用 requestManager 自动处理请求取消和防抖
        const data = await requestManager.request(
          "github-contents",
          (signal) =>
            GitHub.Content.getContents(currentPathRef.current, signal, {
              forceRefresh,
              onSource: (source) => {
                sourceTracker.value = source;
              },
            }),
          { debounce: forceRefresh ? 0 : 100 },
        );

        const filteredData = filterContents(data);
        const nextSignature = buildContentsSignature(filteredData);
        const currentSignature = lastSignatureRef.current;

        if (nextSignature !== currentSignature) {
          setContents(filteredData);
          lastSignatureRef.current = nextSignature;
          contentsRef.current = filteredData;
        }
        logger.debug(`获取到 ${filteredData.length.toString()} 个文件/目录`);

        const shouldRevalidate =
          !forceRefresh && sourceTracker.value !== "network" && currentPathRef.current === "";

        if (shouldRevalidate) {
          const revalidateKey = `${currentBranchRef.current}:${currentPathRef.current}`;
          if (revalidateKeyRef.current !== revalidateKey) {
            revalidateKeyRef.current = revalidateKey;
            window.setTimeout(() => {
              const currentKey = `${currentBranchRef.current}:${currentPathRef.current}`;
              if (currentKey !== revalidateKey) {
                return;
              }
              void loadContents({ forceRefresh: true, silent: true });
            }, 300);
          }
        }
      } catch (e: unknown) {
        // 检查是否是取消错误
        if (e instanceof Error && e.name === "AbortError") {
          // requestManager 已经处理了取消日志
          return;
        }

        // 使用统一的错误处理
        handleError(e, "useContentLoading.loadContents", {
          silent: options?.silent === true,
          userMessage: `获取目录内容失败: ${e instanceof Error ? e.message : "未知错误"}`,
        });

        const shouldSurfaceError = !silent || contentsRef.current.length === 0;
        if (shouldSurfaceError) {
          displayError(`获取目录内容失败: ${e instanceof Error ? e.message : "未知错误"}`);
          setContents([]);
        }
      } finally {
        if (shouldShowLoading) {
          setLoading(false);
        }
      }
    },
    [buildContentsSignature, displayError, filterContents],
  );

  // 监听路径、分支或刷新触发器的变化
  useEffect(() => {
    // 主题切换期间跳过内容重新加载
    if (isThemeChangingRef.current) {
      logger.debug("主题切换中，跳过内容重新加载");
      return;
    }

    const shouldForceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    void loadContents({ forceRefresh: shouldForceRefresh });
  }, [path, branch, refreshTrigger, loadContents, isThemeChangingRef]);

  const refresh = () => {
    forceRefreshRef.current = true;
    setRefreshTrigger((prev) => prev + 1);
    logger.debug("触发内容刷新");
  };

  return {
    contents,
    loading,
    error,
    refresh,
  };
}
