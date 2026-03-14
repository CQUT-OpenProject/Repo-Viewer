import { GitHub } from "@/services/github";
import type { GitHubContent } from "@/types";
import { logger } from "@/utils";

const GITHUB_USER_CONTENT_PATH_REGEX = /githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)/;

const PROXY_FAILURE_HOSTS = ["gh-proxy.com", "ghproxy.com", "staticdn.net", "ghfast.top"];

const extractGithubusercontentPath = (url: string): string | null => {
  const match = GITHUB_USER_CONTENT_PATH_REGEX.exec(url);
  return match?.[1] ?? null;
};

const getOriginFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    logger.debug("解析URL来源失败", { url, error });
    return null;
  }
};

/**
 * 图片加载状态接口
 */
export interface ImageLoadingState {
  loadedImages: Set<string>;
  failedImages: Set<string>;
  imageTimers: Map<string, number>;
}

/**
 * 创建图片加载状态对象
 *
 * @returns 初始化的图片加载状态
 */
export const createImageLoadingState = (): ImageLoadingState => ({
  loadedImages: new Set<string>(),
  failedImages: new Set<string>(),
  imageTimers: new Map<string, number>(),
});

/**
 * 尝试直接加载图片
 *
 * 从代理URL中提取原始路径，使用JSDelivr CDN加载。
 *
 * @param imgSrc - 图片源URL
 * @returns 直接加载的CDN URL，失败时返回null
 */
export const tryDirectImageLoad = (imgSrc: string): string | null => {
  if (imgSrc.trim().length === 0) {
    return null;
  }

  if (!imgSrc.includes("githubusercontent.com")) {
    return null;
  }

  try {
    let directPath: string | null = null;
    if (imgSrc.includes("/api/github?action=getFileContent&url=")) {
      const encodedUrl = imgSrc.split("url=")[1];
      if (encodedUrl !== undefined && encodedUrl.length > 0) {
        const decodedUrl = decodeURIComponent(encodedUrl);
        directPath = extractGithubusercontentPath(decodedUrl);
      }
    } else {
      directPath = extractGithubusercontentPath(imgSrc);
    }

    if (directPath === null || directPath.length === 0) {
      return null;
    }

    const proxy = "https://cdn.jsdelivr.net/gh";
    const currentProxy = GitHub.Proxy.getCurrentProxyService();
    const repoOwner = currentProxy.includes("Royfor12") ? "Royfor12" : "CQUT-OpenProject";
    const repoName = currentProxy.includes("CQUT-Course-Guide-Sharing-Scheme")
      ? "CQUT-Course-Guide-Sharing-Scheme"
      : "Repo-Viewer";
    const newSrc = `${proxy}/${repoOwner}/${repoName}@main/${directPath}`;
    logger.info("尝试使用JSDelivr加载图片:", newSrc);
    return newSrc;
  } catch (error) {
    logger.error("解析直接URL失败:", error);
    return null;
  }
};

/**
 * 转换图片源URL
 *
 * 将相对路径或原始URL转换为可访问的代理URL。
 *
 * @param src - 原始图片URL
 * @param previewingItem - 当前预览的Markdown文件项
 * @param currentBranch - 当前分支名称（可选）
 * @returns 包含转换后URL和原始URL的对象
 */
export const transformImageSrc = (
  src: string | undefined,
  previewingItem: GitHubContent | null,
  currentBranch?: string,
): { imgSrc: string; originalSrc: string } => {
  const originalSrc = src ?? "";
  let imgSrc = originalSrc;

  if (previewingItem !== null && typeof src === "string" && src.length > 0) {
    // 使用GitHubService处理图片URL
    const transformedSrc = GitHub.Proxy.transformImageUrl(
      src,
      previewingItem.path,
      true,
      currentBranch,
    );

    if (typeof transformedSrc === "string" && transformedSrc.length > 0) {
      logger.debug("转换后的图片URL:", transformedSrc);
      imgSrc = transformedSrc;
    } else {
      logger.warn("URL转换失败，使用原始URL:", src);
    }
  }

  return { imgSrc, originalSrc };
};

/**
 * 处理图片加载错误
 *
 * 当图片加载失败时，自动尝试切换代理服务或使用备用加载方式。
 *
 * @param imgSrc - 当前图片URL
 * @param originalSrc - 原始图片URL
 * @param imageState - 图片加载状态对象
 * @param setIsImageFailed - 设置失败状态的函数
 * @returns 备用的图片URL，如果无可用备用则返回null
 */
export const handleImageError = (
  imgSrc: string,
  originalSrc: string,
  imageState: ImageLoadingState,
  setIsImageFailed: (failed: boolean) => void,
): string | null => {
  logger.error("图片加载失败:", imgSrc);

  // 清除超时计时器
  const timerId = imageState.imageTimers.get(imgSrc);
  if (typeof timerId === "number") {
    window.clearTimeout(timerId);
    imageState.imageTimers.delete(imgSrc);
  }

  // 如果是代理URL，尝试标记该代理服务失败
  if (imgSrc.length > 0 && PROXY_FAILURE_HOSTS.some((host) => imgSrc.includes(host))) {
    try {
      // 提取代理服务URL
      const proxyUrl = getOriginFromUrl(imgSrc);
      // 标记该代理服务失败
      if (typeof proxyUrl === "string" && proxyUrl.length > 0) {
        GitHub.Proxy.markProxyServiceFailed(proxyUrl);
        logger.warn("标记代理服务失败:", proxyUrl);
      }

      // 获取新的代理服务
      const currentProxy = GitHub.Proxy.getCurrentProxyService();
      logger.info("切换到新的代理服务:", currentProxy);

      // 如果还有可用的备选代理，重新加载图片
      if (
        currentProxy.length > 0 &&
        typeof proxyUrl === "string" &&
        proxyUrl.length > 0 &&
        currentProxy !== proxyUrl
      ) {
        // 清除失败记录以允许重试
        imageState.failedImages.delete(imgSrc);
        // 重置失败状态
        setIsImageFailed(false);
        return null;
      }
    } catch (error) {
      logger.error("处理代理服务失败出错:", error);
    }
  }

  // 尝试使用备选的直接加载方式
  const directSrc = tryDirectImageLoad(imgSrc);
  if (typeof directSrc === "string" && directSrc.length > 0) {
    logger.info("尝试使用直接URL加载:", directSrc);
    // 设置新的超时定时器
    const newTimerId = window.setTimeout(() => {
      if (!imageState.loadedImages.has(directSrc)) {
        imageState.failedImages.add(imgSrc);
        setIsImageFailed(true);
      }
    }, 15000); // 15秒超时

    imageState.imageTimers.set(directSrc, newTimerId);
    return directSrc;
  }

  // 如果转换后的URL加载失败，可以尝试使用原始URL
  if (
    imgSrc !== originalSrc &&
    originalSrc.length > 0 &&
    !imageState.failedImages.has(originalSrc)
  ) {
    logger.debug("尝试使用原始URL:", originalSrc);
    // 为原始URL设置超时计时器
    const newTimerId = window.setTimeout(() => {
      if (!imageState.loadedImages.has(originalSrc)) {
        imageState.failedImages.add(originalSrc);
        setIsImageFailed(true);
      }
    }, 15000); // 15秒超时

    imageState.imageTimers.set(originalSrc, newTimerId);
    return originalSrc;
  } else {
    // 记录失败的图片
    if (imgSrc.length > 0) {
      imageState.failedImages.add(imgSrc);
      setIsImageFailed(true);
    }
  }

  return null;
};

/**
 * 处理图片加载成功
 *
 * 记录成功加载的图片，清除超时计时器。
 *
 * @param imgSrc - 图片URL
 * @param imageState - 图片加载状态对象
 * @param setIsImageLoaded - 设置加载成功状态的函数
 * @returns void
 */
export const handleImageLoad = (
  imgSrc: string,
  imageState: ImageLoadingState,
  setIsImageLoaded: (loaded: boolean) => void,
): void => {
  // 设置本地状态
  setIsImageLoaded(true);

  logger.debug("图片加载成功:", imgSrc);

  // 记录已加载的图片，以便主题切换时不再重复加载效果
  if (imgSrc.length > 0) {
    imageState.loadedImages.add(imgSrc);
    imageState.failedImages.delete(imgSrc);

    // 清除超时计时器
    const timerId = imageState.imageTimers.get(imgSrc);
    if (typeof timerId === "number") {
      window.clearTimeout(timerId);
      imageState.imageTimers.delete(imgSrc);
    }
  }
};
