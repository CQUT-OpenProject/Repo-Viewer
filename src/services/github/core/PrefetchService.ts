/**
 * GitHub 预取服务模块
 *
 * 提供智能内容预加载功能，包括目录预取、批量预加载和相关内容智能预加载。
 * 使用延迟加载和优先级管理策略，确保预加载不影响用户主操作。
 *
 * @module PrefetchService
 */

import type { GitHubContent } from "@/types";
import { logger } from "@/utils";
import { CacheManager } from "../cache";
import { getContents } from "./content";
import {
  prefetchFilesWithPriority,
  selectPriorityDirectories,
  selectPriorityFiles,
} from "./prefetch";

/**
 * 智能预取目录内容
 *
 * 根据优先级延迟预加载指定路径的内容，不阻塞用户操作。
 *
 * @param path - 要预取的目录路径
 * @param priority - 预取优先级，默认为'low'
 * @returns void
 */
export function prefetchContents(path: string, priority: "high" | "medium" | "low" = "low"): void {
  // 使用低优先级预加载，不影响用户操作
  const delay = priority === "high" ? 0 : priority === "medium" ? 100 : 200;
  setTimeout(() => {
    void getContents(path).catch(() => {
      // 忽略错误
    });
  }, delay);
}

/**
 * 批量预加载多个路径
 *
 * 并发预加载多个路径的内容，自动控制并发数量。
 *
 * @param paths - 路径数组
 * @param maxConcurrency - 最大并发数，默认为3
 * @returns Promise，所有预加载完成后解析
 */
export async function batchPrefetchContents(paths: string[], maxConcurrency = 3): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  // 限制并发数量防止网络资源过耗
  for (let i = 0; i < paths.length; i += maxConcurrency) {
    const batch = paths.slice(i, i + maxConcurrency);
    const promises = batch.map((path) => getContents(path).catch(() => null));

    await Promise.allSettled(promises);

    // 批次间稍微延迟
    if (i + maxConcurrency < paths.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

/**
 * 智能预加载相关内容
 *
 * 根据内容类型和优先级智能预加载相关的目录和文件。
 *
 * @param contents - GitHub内容数组
 * @returns Promise，预加载完成后解析
 */
export async function prefetchRelatedContent(contents: GitHubContent[]): Promise<void> {
  try {
    const directories = contents.filter((item) => item.type === "dir");
    const files = contents.filter((item) => item.type === "file");

    const priorityDirs = selectPriorityDirectories(directories);
    const priorityFiles = selectPriorityFiles(files);

    const prefetchPromises: Promise<void>[] = [];

    if (priorityDirs.length > 0) {
      const prefetchPromise = Promise.resolve()
        .then(() => {
          CacheManager.prefetchContent(priorityDirs.map((dir) => dir.path));
        })
        .catch((error: unknown) => {
          logger.debug("预加载目录失败", error);
        });
      prefetchPromises.push(prefetchPromise);
    }

    if (priorityFiles.length > 0) {
      const filesPrefetchPromise = prefetchFilesWithPriority(priorityFiles, "low").catch(
        (error: unknown) => {
          logger.debug("预加载文件失败", error);
          return Promise.resolve();
        },
      );
      prefetchPromises.push(filesPrefetchPromise);
    }

    await Promise.allSettled(prefetchPromises);
  } catch (error) {
    logger.debug("预加载相关内容失败", error);
  }
}
