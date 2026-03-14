import { logger } from "../logging/logger";
// 导入transformImageUrl以使用其多代理机制
import { GitHub } from "@/services/github";

/**
 * 获取代理URL
 *
 * 根据环境自动选择合适的代理方式，解决CORS问题。
 * 生产环境使用多代理机制，开发环境使用本地代理。
 *
 * @param url - 原始URL
 * @returns 代理后的URL
 */
export const getProxiedUrl = (url: string): string => {
  const isDevEnvironment = import.meta.env.DEV;

  if (!isDevEnvironment) {
    // 生产环境使用GitHubService的多代理机制
    if (
      url.length > 0 &&
      (url.includes("raw.githubusercontent.com") || url.includes("api.github.com"))
    ) {
      try {
        // 尝试使用GitHubService的代理机制
        const proxiedUrl = GitHub.Proxy.transformImageUrl(url, "", true);
        return proxiedUrl ?? url;
      } catch (error) {
        logger.error("代理URL转换失败:", error);
        return url;
      }
    }
    return url;
  }

  // 开发环境下转换URL
  if (url.includes("raw.githubusercontent.com")) {
    // 替换为本地代理URL
    return url.replace("https://raw.githubusercontent.com", "/github-raw");
  } else if (url.includes("api.github.com")) {
    // 替换为本地API代理
    return url.replace("https://api.github.com", "/github-api");
  }

  return url;
};
