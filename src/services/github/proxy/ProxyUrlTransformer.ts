import { logger } from "@/utils";
import { getGithubConfig, getRuntimeConfig } from "@/config";
import { getCurrentBranch } from "../core/Config";
import { getForceServerProxy } from "../config";

const githubConfig = getGithubConfig();
const runtimeConfig = getRuntimeConfig();

/**
 * 检查URL部分是否需要编码
 *
 * @param part - URL部分字符串
 * @returns 如果需要编码返回true
 */
function shouldEncodePart(part: string): boolean {
  return /[\u4e00-\u9fa5]|[^\w.-]/g.test(part);
}

/**
 * 检查是否为GitHub域名
 *
 * @param hostname - 主机名
 * @returns 如果是GitHub相关域名返回true
 */
function isGithubHost(hostname: string): boolean {
  return /(^|\.)githubusercontent\.com$|(^|\.)github\.com$|^raw\.githubusercontent\.com$|(^|\.)user-images\.githubusercontent\.com$/u.test(
    hostname,
  );
}

/**
 * 应用代理到URL
 *
 * 将原始URL转换为使用指定代理服务的URL。
 *
 * @param url - 原始URL
 * @param proxyUrl - 代理服务URL
 * @returns 代理后的URL
 */
function applyProxyToUrl(url: string, proxyUrl: string): string {
  const trimmedProxyUrl = proxyUrl.trim();
  if (trimmedProxyUrl === "") {
    return url;
  }

  try {
    let processedUrl = url;

    try {
      const decodedUrl = decodeURIComponent(url);
      if (decodedUrl === url) {
        const needsEncoding = /[\u4e00-\u9fa5]|[^\w./:-]/g.test(url);
        if (needsEncoding) {
          const urlParts = url.split("/");
          if (urlParts.length >= 3) {
            const protocol = urlParts[0] ?? "";
            const domain = urlParts[2] ?? "";
            if (protocol !== "" && domain !== "") {
              const pathParts = urlParts
                .slice(3)
                .map((part) => (shouldEncodePart(part) ? encodeURIComponent(part) : part));
              processedUrl = `${protocol}//${domain}/${pathParts.join("/")}`;
              logger.debug("编码后的URL:", processedUrl);
            }
          }
        }
      }
    } catch (error) {
      logger.debug("URL 解码失败，保持原始URL:", url, error);
    }

    if (trimmedProxyUrl.includes("?url=")) {
      return `${trimmedProxyUrl}${encodeURIComponent(processedUrl)}`;
    }

    if (trimmedProxyUrl.includes("staticdn")) {
      if (processedUrl.includes("raw.githubusercontent.com")) {
        const [, rawPath] = processedUrl.split("raw.githubusercontent.com/");
        if (rawPath !== undefined && rawPath !== "") {
          return `${trimmedProxyUrl}/${rawPath}`;
        }
      }
      return processedUrl;
    }

    return `${trimmedProxyUrl}/${processedUrl.replace(/^https?:\/\//u, "")}`;
  } catch (error) {
    logger.error("应用代理到URL失败:", error);
    return url;
  }
}

/**
 * 转换Markdown中的图片URL
 *
 * 处理相对路径和绝对路径，根据环境和模式选择合适的代理策略。
 *
 * @param src - 图片源URL
 * @param markdownFilePath - Markdown文件路径
 * @param useTokenMode - 是否使用Token模式
 * @param getProxiedUrlSync - 同步获取代理URL的函数
 * @param branch - 分支名称（可选），未提供时使用当前分支
 * @returns 转换后的图片URL
 */
function transformImageUrl(
  src: string | undefined,
  markdownFilePath: string,
  useTokenMode: boolean,
  getProxiedUrlSync: (url: string) => string,
  branch?: string,
): string | undefined {
  if (src === undefined || src === "") {
    return undefined;
  }

  try {
    const normalizedSrc = src.replace(/\\/g, "/");

    if (getForceServerProxy() && normalizedSrc.startsWith("http")) {
      try {
        const host = new URL(normalizedSrc).hostname;
        if (!isGithubHost(host)) {
          logger.debug("强制模式下的非GitHub域名，直接返回原URL:", normalizedSrc);
          return normalizedSrc;
        }
      } catch {
        logger.warn("强制模式解析URL失败，按GitHub域名处理");
      }

      const proxyUrl = `/api/github?action=getFileContent&url=${encodeURIComponent(normalizedSrc)}`;
      logger.debug("使用服务端API代理:", proxyUrl);
      return proxyUrl;
    }

    if (normalizedSrc.startsWith("http")) {
      try {
        const host = new URL(normalizedSrc).hostname;
        if (!isGithubHost(host)) {
          return normalizedSrc;
        }
      } catch {
        logger.warn("解析图片URL主机失败，按原逻辑处理");
      }

      if (useTokenMode || !runtimeConfig.isDev) {
        const proxyUrl = getProxiedUrlSync(normalizedSrc);
        logger.debug("绝对URL使用代理:", proxyUrl);
        return proxyUrl;
      }
      logger.debug("直接使用绝对URL:", normalizedSrc);
      return normalizedSrc;
    }

    const dirPath = getDirectoryPath(markdownFilePath);
    logger.debug("Markdown目录路径:", dirPath);

    let fullPath: string;

    if (normalizedSrc.startsWith("./")) {
      fullPath = `${dirPath}/${normalizedSrc.substring(2)}`;
      logger.debug("当前目录相对路径 (./):", fullPath);
    } else if (normalizedSrc.startsWith("../")) {
      const pathSegments = dirPath === "" ? [] : dirPath.split("/");
      let parentDirCount = 0;
      let remainingSrc = normalizedSrc;

      while (remainingSrc.startsWith("../")) {
        parentDirCount += 1;
        remainingSrc = remainingSrc.substring(3);
      }

      const newPathLength = Math.max(0, pathSegments.length - parentDirCount);
      const newBasePath = pathSegments.slice(0, newPathLength).join("/");
      fullPath = newBasePath === "" ? remainingSrc : `${newBasePath}/${remainingSrc}`;
      logger.debug("上级目录相对路径 (../):", fullPath);
    } else if (normalizedSrc.startsWith("/")) {
      fullPath = normalizedSrc.substring(1);
      logger.debug("根目录绝对路径 (/):", fullPath);
    } else {
      fullPath = dirPath === "" ? normalizedSrc : `${dirPath}/${normalizedSrc}`;
      logger.debug("当前目录相对路径(无前缀):", fullPath);
    }

    fullPath = fullPath.replace(/\/+/gu, "/").replace(/^\/+/u, "");

    let repoOwner = githubConfig.repoOwner;
    let repoName = githubConfig.repoName;

    if (markdownFilePath.includes("github.com")) {
      const urlMatch = /github\.com\/([^/]+)\/([^/]+)/u.exec(markdownFilePath);
      if (urlMatch !== null) {
        const ownerMatch = urlMatch[1];
        const repoMatch = urlMatch[2];
        if (
          ownerMatch !== undefined &&
          ownerMatch !== "" &&
          repoMatch !== undefined &&
          repoMatch !== ""
        ) {
          repoOwner = ownerMatch;
          repoName = repoMatch;
          logger.debug("从URL提取的仓库信息:", `${repoOwner}/${repoName}`);
        } else {
          logger.warn("从URL提取仓库信息失败，缺少仓库信息，使用默认值");
        }
      } else {
        logger.warn("从URL提取仓库信息失败，使用默认值");
      }
    }

    // 使用传入的分支，如果没有则使用当前分支
    const activeBranch = branch ?? getCurrentBranch();
    const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${activeBranch}/${fullPath}`;
    logger.debug("使用的分支:", activeBranch);
    logger.debug("构建的原始URL:", rawUrl);

    if (useTokenMode || !runtimeConfig.isDev) {
      const proxyUrl = getProxiedUrlSync(rawUrl);
      logger.debug("返回代理URL:", proxyUrl);
      return proxyUrl;
    }

    logger.debug("返回原始URL:", rawUrl);
    return rawUrl;
  } catch (error) {
    logger.error("转换图片URL失败:", error);
    // 即使转换失败也返回规范化后的路径
    return src.replace(/\\/g, "/");
  }
}

/**
 * 获取文件的目录路径
 *
 * @param filePath - 文件路径
 * @returns 目录路径
 */
function getDirectoryPath(filePath: string): string {
  const lastSlashIndex = filePath.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return "";
  }
  return filePath.substring(0, lastSlashIndex);
}

/**
 * 代理URL转换器
 *
 * 提供URL代理转换和图片URL处理功能。
 */
export const ProxyUrlTransformer = {
  applyProxyToUrl,
  transformImageUrl,
};
