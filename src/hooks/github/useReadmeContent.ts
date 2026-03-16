import { useState, useEffect, useCallback, useRef } from "react";
import type { GitHubContent } from "@/types";
import { GitHub } from "@/services/github";
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from "@/services/github/core/Config";
import { logger } from "@/utils";
import { handleError } from "@/utils/error/errorHandler";
import { isAbortError } from "@/utils/network/abort";
import type { ReadmeContentState } from "./types";

/**
 * README 内容管理 Hook
 *
 * 管理 README 文件的加载和状态
 *
 * @param contents - 当前目录的内容列表
 * @param currentPath - 当前路径
 * @param currentBranch - 当前分支
 * @returns README 内容状态
 */
export function useReadmeContent(
  contents: GitHubContent[],
  currentPath: string,
  currentBranch: string,
): ReadmeContentState {
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);
  const [readmeLoaded, setReadmeLoaded] = useState<boolean>(false);

  const currentPathRef = useRef<string>(currentPath);
  const lastReadmePathRef = useRef<string | null>(null);
  const lastReadmeKeyRef = useRef<string | null>(null);
  const loadingReadmeRef = useRef<boolean>(loadingReadme);
  const readmeLoadedRef = useRef<boolean>(readmeLoaded);
  const readmeContentRef = useRef<string | null>(readmeContent);
  const currentBranchRef = useRef<string>(currentBranch);
  const readmeRequestControllerRef = useRef<AbortController | null>(null);
  const readmeRequestIdRef = useRef<number>(0);

  const cancelActiveReadmeRequest = useCallback(() => {
    if (readmeRequestControllerRef.current !== null) {
      readmeRequestControllerRef.current.abort();
      readmeRequestControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (currentBranchRef.current !== currentBranch) {
      cancelActiveReadmeRequest();
      currentBranchRef.current = currentBranch;
      setLoadingReadme(true);
      setReadmeLoaded(false);
      setReadmeContent(null);
      lastReadmeKeyRef.current = null;
      lastReadmePathRef.current = null;
    }
  }, [cancelActiveReadmeRequest, currentBranch]);

  useEffect(() => {
    return () => {
      cancelActiveReadmeRequest();
    };
  }, [cancelActiveReadmeRequest]);

  const appendCacheBuster = useCallback((url: string, value: string): string => {
    if (value.trim().length === 0) {
      return url;
    }

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(value)}`;
  }, []);

  const loadReadmeContent = useCallback(
    async (readmeItem: GitHubContent, requestKey: string, preserveContent: boolean) => {
      if (readmeItem.path.trim() === "") {
        return;
      }

      const readmeDir = readmeItem.path.includes("/")
        ? readmeItem.path.split("/").slice(0, -1).join("/")
        : "";

      const hasExistingContent =
        typeof readmeContentRef.current === "string" && readmeContentRef.current.trim().length > 0;
      const shouldPreserve = preserveContent && hasExistingContent;

      setLoadingReadme(true);
      if (!shouldPreserve) {
        setReadmeContent(null);
        setReadmeLoaded(false);
      }
      cancelActiveReadmeRequest();
      const requestId = readmeRequestIdRef.current + 1;
      readmeRequestIdRef.current = requestId;
      const abortController = new AbortController();
      readmeRequestControllerRef.current = abortController;

      try {
        const encodedPath = readmeItem.path
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");
        const cacheTag = readmeItem.sha.length > 0 ? readmeItem.sha : requestKey;
        const baseUrl = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${encodeURIComponent(currentBranchRef.current)}/${encodedPath}`;
        const fileUrl = appendCacheBuster(baseUrl, cacheTag);
        const content = await GitHub.Content.getFileContent(fileUrl, abortController.signal);

        // 检查路径是否已经变更
        if (currentPathRef.current !== readmeDir) {
          logger.debug(`README 路径已变更，忽略: ${readmeItem.path}`);
          return;
        }

        // 检查请求期间标识是否已变更（例如分支切换），避免旧响应覆盖新内容
        if (lastReadmeKeyRef.current !== requestKey) {
          logger.debug(`README 标识已变更，忽略响应: ${readmeItem.path}`);
          return;
        }

        setReadmeContent(content);
        setReadmeLoaded(true); // 设置为已加载完成
      } catch (e: unknown) {
        if (isAbortError(e)) {
          return;
        }
        handleError(e, "useReadmeContent.loadReadmeContent", {
          silent: true,
          userMessage: `加载 README 失败: ${e instanceof Error ? e.message : "未知错误"}`,
        });
        logger.error(`加载 README 失败: ${e instanceof Error ? e.message : "未知错误"}`);
        if (!shouldPreserve) {
          setReadmeContent(null);
        }
        setReadmeLoaded(true); // 出错时也设置为已加载完成
      } finally {
        if (
          readmeRequestIdRef.current === requestId &&
          readmeRequestControllerRef.current === abortController
        ) {
          readmeRequestControllerRef.current = null;
          setLoadingReadme(false);
        }
      }
    },
    [appendCacheBuster, cancelActiveReadmeRequest],
  );

  // 监听内容变化，自动加载 README
  useEffect(() => {
    // 查找 README 文件
    const readmeItem = contents.find(
      (item) =>
        item.type === "file" &&
        item.name.toLowerCase().includes("readme") &&
        item.name.toLowerCase().endsWith(".md"),
    );

    if (readmeItem !== undefined) {
      const nextReadmePath = readmeItem.path;
      const nextReadmeKey = `${currentBranchRef.current}:${readmeItem.path}:${readmeItem.sha}:${readmeItem.download_url ?? ""}`;
      const isSameReadme = lastReadmeKeyRef.current === nextReadmeKey;

      if (isSameReadme && (loadingReadmeRef.current || readmeLoadedRef.current)) {
        return;
      }

      const shouldPreserve = lastReadmePathRef.current === nextReadmePath;
      lastReadmePathRef.current = nextReadmePath;
      lastReadmeKeyRef.current = nextReadmeKey;
      void loadReadmeContent(readmeItem, nextReadmeKey, shouldPreserve);
    } else {
      cancelActiveReadmeRequest();
      lastReadmePathRef.current = null;
      lastReadmeKeyRef.current = null;
      setReadmeContent(null);
      setLoadingReadme(false);
      // README 不存在时也设置为已加载完成
      setReadmeLoaded(true);
    }
  }, [cancelActiveReadmeRequest, contents, currentBranch, loadReadmeContent]);

  // 同步加载状态到 ref，避免将其加入主 effect 依赖
  useEffect(() => {
    loadingReadmeRef.current = loadingReadme;
  }, [loadingReadme]);

  useEffect(() => {
    readmeLoadedRef.current = readmeLoaded;
  }, [readmeLoaded]);

  useEffect(() => {
    readmeContentRef.current = readmeContent;
  }, [readmeContent]);

  return {
    readmeContent,
    loadingReadme,
    readmeLoaded,
  };
}
