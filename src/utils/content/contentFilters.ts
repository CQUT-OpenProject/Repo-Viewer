/**
 * 内容过滤和排序工具函数
 *
 * 提供 GitHub 内容的排序和过滤功能，支持首页过滤配置。
 */

import type { GitHubContent } from "@/types";
import { logger } from "@/utils";
import { sortContentsByPinyin } from "@/utils/sorting/contentSorting";

/**
 * 首页过滤配置接口
 */
export interface HomepageFilterConfig {
  /** 是否启用过滤 */
  enabled: boolean;
  /** 允许的文件夹名称列表 */
  allowedFolders: string[];
  /** 允许的文件扩展名列表 */
  allowedFileTypes: string[];
}

/**
 * 对内容进行排序
 *
 * 排序规则：
 * 1. 目录优先于文件
 * 2. 同类型按拼音字母顺序排序（中文转拼音）
 * 3. 支持数字的自然排序
 *
 * @param contents - 待排序的内容数组
 * @returns 排序后的新数组
 */
export function sortContents(contents: GitHubContent[]): GitHubContent[] {
  return sortContentsByPinyin(contents);
}

/**
 * 根据配置过滤首页内容
 *
 * 过滤规则：
 * 1. 如果 allowedFolders 为空，显示所有文件夹
 * 2. 如果 allowedFolders 非空，只显示列表中的文件夹
 * 3. 如果 allowedFileTypes 为空，显示所有文件
 * 4. 如果 allowedFileTypes 非空，只显示指定扩展名的文件
 *
 * @param contents - 待过滤的内容数组
 * @param config - 首页过滤配置
 * @returns 过滤后的新数组
 */
export function filterHomepageContents(
  contents: GitHubContent[],
  config: HomepageFilterConfig,
): GitHubContent[] {
  if (!config.enabled) {
    return contents;
  }

  const filteredData = contents.filter((item) => {
    // 过滤文件夹
    if (item.type === "dir") {
      // 如果没有指定允许的文件夹，则显示所有文件夹
      return config.allowedFolders.length === 0 || config.allowedFolders.includes(item.name);
    }

    // 过滤文件
    // 如果没有指定允许的文件类型，则显示所有文件
    if (config.allowedFileTypes.length === 0) {
      return true;
    }

    // 检查文件扩展名
    const extension = item.name.split(".").pop()?.toLowerCase();
    return (
      extension !== undefined && extension !== "" && config.allowedFileTypes.includes(extension)
    );
  });

  // 记录过滤结果（仅在有实际过滤时）
  if (filteredData.length !== contents.length) {
    logger.debug(
      `过滤后剩余 ${filteredData.length.toString()} 个文件/目录（过滤前 ${contents.length.toString()} 个）`,
    );
    if (config.allowedFolders.length > 0) {
      logger.debug(`允许的文件夹: ${config.allowedFolders.join(", ")}`);
    }
    if (config.allowedFileTypes.length > 0) {
      logger.debug(`允许的文件类型: ${config.allowedFileTypes.join(", ")}`);
    }
  }

  return filteredData;
}

/**
 * 对内容进行排序和过滤（组合函数）
 *
 * 适用于首页内容的完整处理流程。
 *
 * @param contents - 原始内容数组
 * @param isHomepage - 是否为首页
 * @param filterConfig - 首页过滤配置
 * @returns 处理后的内容数组
 */
export function processContents(
  contents: GitHubContent[],
  isHomepage: boolean,
  filterConfig: HomepageFilterConfig,
): GitHubContent[] {
  // 先排序
  let processedContents = sortContents(contents);

  // 如果是首页且启用了过滤，则应用过滤规则
  if (isHomepage && filterConfig.enabled) {
    processedContents = filterHomepageContents(processedContents, filterConfig);
  }

  return processedContents;
}
