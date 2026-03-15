import axios from "axios";

import type { GitHubContent, InitialContentHydrationPayload } from "@/types";
import { logger } from "@/utils";

import { RequestBatcher } from "../../RequestBatcher";
import { getForceServerProxy, shouldUseServerAPI } from "../../config";
import {
  safeValidateGitHubContentsResponse,
  filterAndNormalizeGitHubContents,
  transformGitHubContentsResponse,
  validateGitHubContentsArray,
} from "../../schemas";
import { getAuthHeaders } from "../Auth";
import { USE_TOKEN_MODE, getApiUrl, getCurrentBranch } from "../Config";
import {
  ensureCacheInitialized,
  getCachedDirectoryContents,
  getCachedFileContent,
  isCacheAvailable,
  storeDirectoryContents,
  storeFileContent,
} from "./cacheState";
import { buildContentsCacheKey } from "./cacheKeys";
import {
  consumeHydratedDirectory,
  consumeHydratedFile,
  hydrateInitialContent as hydratePayload,
  INITIAL_CONTENT_EXCLUDE_FILES,
} from "./hydrationStore";
import { buildRepoFileContentApiUrl, buildServerApiUrlForGitHubResource } from "./serverApiUrls";

/**
 * 内容服务入口
 *
 * @remarks
 * 对外暴露获取目录/文件内容、批处理器控制以及首屏注水注册逻辑。
 * 内部通过分层模块（缓存、注水、工具函数）协作，实现可维护的 GitHub 内容加载流水线。
 */

const batcher = new RequestBatcher();

type ContentSource = "cache" | "hydration" | "network";

interface GetContentsOptions {
  forceRefresh?: boolean;
  onSource?: (source: ContentSource) => void;
}

/**
 * 获取目录内容。
 *
 * @param path - 仓库内目录路径，空字符串表示根目录
 * @param signal - 可选中断信号，用于取消正在执行的请求
 * @param options
 * @returns 解析后的 GitHub 内容数组
 *
 * @remarks
 * 流程：
 * 1. 确保缓存模块已初始化；
 * 2. 优先命中缓存或首屏注水数据；
 * 3. 根据配置选择服务端代理或直连 GitHub；
 * 4. 对响应进行 Schema 验证、标准化与缓存落盘。
 */
export async function getContents(
  path: string,
  signal?: AbortSignal,
  options?: GetContentsOptions,
): Promise<GitHubContent[]> {
  await ensureCacheInitialized();

  const branch = getCurrentBranch();
  const cacheKey = buildContentsCacheKey(path, branch);

  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh) {
    const cachedContents = await getCachedDirectoryContents(cacheKey);
    if (cachedContents !== null && cachedContents !== undefined) {
      logger.debug(`已从${isCacheAvailable() ? "主" : "降级"}缓存中获取内容: ${path}`);
      options?.onSource?.("cache");
      return cachedContents;
    }

    const hydratedContents = await consumeHydratedDirectory(path, branch, cacheKey);
    if (hydratedContents !== null) {
      options?.onSource?.("hydration");
      return hydratedContents;
    }
  }

  try {
    let rawData: unknown;

    if (shouldUseServerAPI()) {
      const query = new URLSearchParams();
      query.set("action", "getContents");
      query.set("path", path);
      query.set("branch", branch);
      const { data } = await axios.get<unknown>(`/api/github?${query.toString()}`);
      rawData = data;
      logger.debug(`通过服务端API获取内容: ${path}`);
    } else {
      const apiUrl = getApiUrl(path, branch);

      rawData = await batcher.enqueue<unknown>(
        apiUrl,
        async () => {
          logger.debug(`API请求: ${apiUrl}`);
          const requestInit: RequestInit = {
            method: "GET",
            headers: getAuthHeaders(),
          };

          if (signal !== undefined) {
            requestInit.signal = signal;
          }

          const result = await fetch(apiUrl, requestInit);

          if (!result.ok) {
            throw new Error(`HTTP ${result.status.toString()}: ${result.statusText}`);
          }

          const json: unknown = await result.json();
          return json;
        },
        {
          priority: "high",
          method: "GET",
          headers: getAuthHeaders() as Record<string, string>,
        },
      );

      logger.debug(`直接请求GitHub API获取内容: ${path}`);
    }

    const validation = safeValidateGitHubContentsResponse(rawData);
    if (!validation.success) {
      logger.error(`API响应验证失败: ${path}`, validation.error);
      throw new Error(`API响应格式错误: ${validation.error}`);
    }

    const rawContents = transformGitHubContentsResponse(validation.data);

    const contents = filterAndNormalizeGitHubContents(rawContents, {
      excludeHidden: true,
      excludeFiles: [...INITIAL_CONTENT_EXCLUDE_FILES],
    });

    const contentValidation = validateGitHubContentsArray(contents);
    if (!contentValidation.isValid) {
      logger.warn(`内容数据验证存在问题: ${path}`, contentValidation.invalidItems);
    }

    await storeDirectoryContents(cacheKey, path, branch, contents);
    options?.onSource?.("network");

    return contents;
  } catch (unknownError) {
    const cause = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    logger.error(`获取内容失败: ${path}`, cause);
    throw new Error(`获取内容失败: ${cause.message}`);
  }
}

/**
 * 获取文件内容。
 *
 * @param fileUrl - GitHub 原始文件或代理文件的 URL
 * @returns 文件文本内容
 *
 * @remarks
 * 同样优先尝试缓存与首屏注水数据，其次根据环境选择代理策略，统一处理失败日志与错误信息。
 */
export async function getFileContent(fileUrl: string): Promise<string> {
  await ensureCacheInitialized();

  const branch = getCurrentBranch();
  const cacheKey = `file:${fileUrl}`;

  const cachedContent = await getCachedFileContent(cacheKey);
  if (cachedContent !== undefined && cachedContent !== null) {
    logger.debug(`从${isCacheAvailable() ? "主" : "降级"}缓存获取文件内容: ${fileUrl}`);
    return cachedContent;
  }

  const hydratedContent = await consumeHydratedFile(fileUrl, branch, cacheKey);
  if (hydratedContent !== null) {
    return hydratedContent;
  }

  try {
    const response = await (async () => {
      if (getForceServerProxy()) {
        const serverApiUrl = buildServerApiUrlForGitHubResource(fileUrl, branch);
        return fetch(serverApiUrl);
      }

      let proxyUrl: string;
      if (fileUrl.includes("raw.githubusercontent.com")) {
        proxyUrl = fileUrl.replace("https://raw.githubusercontent.com", "/github-raw");
      } else {
        proxyUrl = fileUrl;
      }

      return fetch(proxyUrl, {
        headers: USE_TOKEN_MODE ? getAuthHeaders() : {},
      });
    })();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
    }

    const content = await response.text();

    await storeFileContent(cacheKey, fileUrl, content);

    return content;
  } catch (unknownError) {
    const cause = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    logger.error(`获取文件内容失败: ${fileUrl}`, cause);
    throw new Error(`获取文件内容失败: ${cause.message}`);
  }
}

/**
 * 构建仓库文件的服务端代理地址。
 *
 * @param filePath - 仓库内文件路径
 * @param branch - 可选分支，未传时使用当前分支
 * @returns 服务端代理 URL
 */
export function getServerRepoFileProxyUrl(filePath: string, branch?: string): string {
  return buildRepoFileContentApiUrl(filePath, branch);
}

/**
 * 根据资源 URL 构建服务端代理地址。
 *
 * @param fileUrl - 原始资源地址
 * @param branch - 可选分支，用于解析当前仓库 raw 链接
 * @returns 服务端代理 URL
 */
export function getServerResourceProxyUrl(fileUrl: string, branch?: string): string {
  return buildServerApiUrlForGitHubResource(fileUrl, branch);
}

/**
 * 获取批处理器实例。
 *
 * @returns 共享的请求批处理器
 */
export function getBatcher(): RequestBatcher {
  return batcher;
}

/**
 * 清空批处理器缓存，便于调试或强制刷新请求。
 *
 * @returns void
 */
export function clearBatcherCache(): void {
  batcher.clearCache();
}

/**
 * 注册首屏注水数据。
 *
 * @param payload - 首屏注水载荷，可为空
 * @returns void
 */
export const hydrateInitialContent: (
  payload: InitialContentHydrationPayload | null | undefined,
) => void = hydratePayload;
