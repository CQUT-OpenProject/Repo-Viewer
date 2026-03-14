import type { GitHubContent } from "@/types";
import { logger } from "@/utils";
import { SmartCache } from "@/utils/cache/SmartCache";

import { CacheManager } from "../../cache";
import { generateContentVersion, generateFileVersion } from "./cacheKeys";

/**
 * 缓存状态管理模块
 *
 * 负责主缓存（IndexedDB/LocalStorage）与内存降级缓存之间的初始化、读取与写入逻辑。
 * 对外提供统一的访问接口，使上层业务无需关心具体缓存实现细节。
 */

const FALLBACK_CACHE_TTL = 5 * 60 * 1000;
const FALLBACK_CACHE_MAX_SIZE = 50;

const fallbackCache = new SmartCache<string, unknown>({
  maxSize: FALLBACK_CACHE_MAX_SIZE,
  ttl: FALLBACK_CACHE_TTL,
  cleanupThreshold: 0.8,
  cleanupRatio: 0.2,
});

let cacheInitialized = false;
let cacheAvailable = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

/**
 * 判断当前是否可以使用主缓存。
 *
 * @returns 主缓存是否可用
 */
export function isCacheAvailable(): boolean {
  return cacheAvailable;
}

/**
 * 确保缓存系统已初始化。
 *
 * 失败时会自动降级到内存缓存，最多尝试三次以避免无限重试。
 *
 * @returns Promise<void>
 */
export async function ensureCacheInitialized(): Promise<void> {
  if (cacheInitialized) {
    return;
  }

  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    logger.warn("ContentCache: 已达到最大初始化尝试次数，使用内存降级缓存");
    cacheInitialized = true;
    cacheAvailable = false;
    return;
  }

  initializationAttempts += 1;

  try {
    await CacheManager.initialize();
    cacheInitialized = true;
    cacheAvailable = true;
    logger.info("ContentCache: 缓存系统初始化完成");
  } catch (unknownError) {
    const cause = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    logger.warn(
      `ContentCache: 缓存系统初始化失败（尝试 ${initializationAttempts.toString()}/${MAX_INIT_ATTEMPTS.toString()}），使用内存降级缓存`,
      cause,
    );

    cacheInitialized = true;
    cacheAvailable = false;

    if (import.meta.env.DEV) {
      logger.error("缓存初始化失败详情:", cause);
      logger.info("建议：检查浏览器的 IndexedDB 和 LocalStorage 权限设置");
    }
  }
}

/**
 * 读取目录内容缓存，自动根据当前缓存可用性选择主缓存或内存缓存。
 *
 * @param cacheKey - 目录缓存键
 * @returns 目录内容数组或空值
 */
export async function getCachedDirectoryContents(
  cacheKey: string,
): Promise<GitHubContent[] | null | undefined> {
  if (cacheAvailable) {
    const contentCache = CacheManager.getContentCache();
    return (await contentCache.get(cacheKey)) as GitHubContent[] | null | undefined;
  }
  return fallbackCache.get(cacheKey) as GitHubContent[] | null | undefined;
}

/**
 * 读取文件内容缓存，自动根据当前缓存可用性选择主缓存或内存缓存。
 *
 * @param cacheKey - 文件缓存键
 * @returns 文件内容或空值
 */
export async function getCachedFileContent(cacheKey: string): Promise<string | null | undefined> {
  if (cacheAvailable) {
    const fileCache = CacheManager.getFileCache();
    return (await fileCache.get(cacheKey)) as string | null | undefined;
  }
  return fallbackCache.get(cacheKey) as string | null | undefined;
}

/**
 * 写入目录内容缓存。
 *
 * 如果主缓存不可用，则回退到内存缓存以保证功能可用性。
 *
 * @param cacheKey - 目录缓存键
 * @param path - 目录路径
 * @param branch - Git 分支名
 * @param contents - 目录内容数组
 * @returns Promise<void>
 */
export async function storeDirectoryContents(
  cacheKey: string,
  path: string,
  branch: string,
  contents: GitHubContent[],
): Promise<void> {
  if (cacheAvailable) {
    const version = generateContentVersion(path, branch, contents);
    const contentCache = CacheManager.getContentCache();
    await contentCache.set(cacheKey, contents, version);
    return;
  }

  fallbackCache.set(cacheKey, contents);
}

/**
 * 写入文件内容缓存，逻辑同上。
 *
 * @param cacheKey - 文件缓存键
 * @param fileUrl - 文件 URL
 * @param content - 文件内容
 * @returns Promise<void>
 */
export async function storeFileContent(
  cacheKey: string,
  fileUrl: string,
  content: string,
): Promise<void> {
  if (cacheAvailable) {
    const version = generateFileVersion(fileUrl, content);
    const fileCache = CacheManager.getFileCache();
    await fileCache.set(cacheKey, content, version);
    return;
  }

  fallbackCache.set(cacheKey, content);
}
