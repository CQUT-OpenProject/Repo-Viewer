import { logger } from "@/utils/logging/logger";
import { getProxyConfig, getRuntimeConfig } from "@/config";
import { USE_TOKEN_MODE } from "./ProxyConfig";
import { proxyHealthManager } from "./ProxyHealthManager";
import { ProxyUrlTransformer } from "./ProxyUrlTransformer";

const proxyConfig = getProxyConfig();
const runtimeConfig = getRuntimeConfig();

const failedProxyServices = new Set<string>();

/**
 * 获取代理URL（同步版本）
 */
export function getProxiedUrlSync(url: string): string {
  if (url === "") {
    return "";
  }

  if (runtimeConfig.isDev && !USE_TOKEN_MODE && proxyConfig.urls.length === 0) {
    return url;
  }

  const bestProxy = proxyHealthManager.getBestProxy();
  if (bestProxy === "") {
    return url;
  }

  return ProxyUrlTransformer.applyProxyToUrl(url, bestProxy);
}

/**
 * 标记代理服务失败
 */
export function markProxyServiceFailed(proxyUrl: string): void {
  if (proxyUrl !== "") {
    proxyHealthManager.recordFailure(proxyUrl);

    if (!failedProxyServices.has(proxyUrl)) {
      logger.warn(`标记代理服务失败: ${proxyUrl}`);
      failedProxyServices.add(proxyUrl);
    }
  }
}

/**
 * 获取当前代理服务
 */
export function getCurrentProxyService(): string {
  return proxyHealthManager.getBestProxy();
}

/**
 * 重置失败的代理服务记录
 */
export function resetFailedProxyServices(): void {
  failedProxyServices.clear();
  proxyHealthManager.reset();
  logger.info("已重置所有失败的代理服务记录，代理健康状态已完全重置");
}

/**
 * 转换图片URL
 */
export function transformImageUrl(
  src: string | undefined,
  markdownFilePath: string,
  useTokenMode: boolean,
  branch?: string,
): string | undefined {
  return ProxyUrlTransformer.transformImageUrl(
    src,
    markdownFilePath,
    useTokenMode,
    getProxiedUrlSync,
    branch,
  );
}
