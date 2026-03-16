import { logger } from "@/utils";
import { getProxyConfig, getRuntimeConfig } from "@/config";
import { USE_TOKEN_MODE, PROXY_SERVICES } from "./ProxyConfig";
import { getForceServerProxy } from "../config";
import { proxyHealthManager } from "./ProxyHealthManager";
import { ProxyUrlTransformer } from "./ProxyUrlTransformer";
import { buildServerApiUrlForGitHubResource } from "../core/content/serverApiUrls";

const proxyConfig = getProxyConfig();
const runtimeConfig = getRuntimeConfig();

const failedProxyServices = new Set<string>();

/**
 * 获取代理URL（异步版本）
 *
 * 根据配置和健康状态选择最佳代理服务，将原始URL转换为代理URL。
 * 支持优先级控制和自动重试。
 *
 * @param url - 原始URL
 * @param options - 代理选项
 * @param options.priority - 请求优先级，默认为'medium'
 * @param options.timeout - 超时时间
 * @param options.retryCount - 重试次数
 * @returns Promise，解析为代理URL
 */
export async function getProxiedUrl(
  url: string,
  options: {
    priority?: "high" | "medium" | "low";
    timeout?: number;
    retryCount?: number;
  } = {},
): Promise<string> {
  if (url === "") {
    return "";
  }

  const { priority = "medium", timeout = proxyConfig.validationTimeout, retryCount = 0 } = options;

  // 如果是开发环境且未配置代理，则直接返回原始URL
  if (runtimeConfig.isDev && !USE_TOKEN_MODE && proxyConfig.imageProxyUrl === "") {
    return url;
  }

  // 优先使用服务端API代理
  if (getForceServerProxy()) {
    return buildServerApiUrlForGitHubResource(url);
  }

  // 使用智能代理选择
  const bestProxy = proxyHealthManager.getBestProxy();

  if (bestProxy === "") {
    logger.warn("没有可用代理，使用服务端API");
    return buildServerApiUrlForGitHubResource(url);
  }

  const proxiedUrl = ProxyUrlTransformer.applyProxyToUrl(url, bestProxy);

  // 对高优先级请求进行健康检查
  if (priority === "high" && retryCount === 0) {
    try {
      await validateProxy(bestProxy, timeout);
    } catch (error) {
      logger.warn(`代理验证失败: ${bestProxy}`, error);
      proxyHealthManager.recordFailure(bestProxy);
      return getProxiedUrl(url, { ...options, retryCount: retryCount + 1 });
    }
  }

  return proxiedUrl;
}

/**
 * 获取代理URL（同步版本）
 *
 * 同步版本的代理URL获取，不进行健康检查。
 *
 * @param url - 原始URL
 * @returns 代理URL
 */
export function getProxiedUrlSync(url: string): string {
  if (url === "") {
    return "";
  }

  if (runtimeConfig.isDev && !USE_TOKEN_MODE && proxyConfig.imageProxyUrl === "") {
    return url;
  }

  if (getForceServerProxy()) {
    return buildServerApiUrlForGitHubResource(url);
  }

  const bestProxy = proxyHealthManager.getBestProxy();
  if (bestProxy === "") {
    return buildServerApiUrlForGitHubResource(url);
  }

  return ProxyUrlTransformer.applyProxyToUrl(url, bestProxy);
}

/**
 * 验证代理服务可用性
 *
 * 发送HEAD请求测试代理服务是否正常工作。
 *
 * @param proxyUrl - 代理服务URL
 * @param timeout - 超时时间（毫秒）
 * @returns Promise，验证成功时解析
 * @throws 当代理服务不可用或超时时抛出错误
 */
async function validateProxy(proxyUrl: string, timeout: number): Promise<void> {
  const testUrl = `${proxyUrl}/ping`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const startTime = Date.now();
    const response = await fetch(testUrl, {
      method: "HEAD",
      signal: controller.signal,
    });
    if (response.ok) {
      const responseTime = Date.now() - startTime;
      proxyHealthManager.recordSuccess(proxyUrl, responseTime);
      return;
    }
    throw new Error(`Proxy validation failed: ${response.status.toString()}`);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * 标记代理服务失败
 *
 * 记录代理服务失败状态，触发健康管理器更新。
 *
 * @param proxyUrl - 失败的代理服务URL
 * @returns void
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
 *
 * @returns 当前最佳代理服务URL
 */
export function getCurrentProxyService(): string {
  const bestProxy = proxyHealthManager.getBestProxy();
  return bestProxy !== "" ? bestProxy : (PROXY_SERVICES[0] ?? "");
}

/**
 * 获取代理健康统计信息
 *
 * @returns 所有代理服务的健康状态数组
 */
export function getProxyHealthStats(): {
  url: string;
  isHealthy: boolean;
  failureCount: number;
  responseTime: number;
  consecutiveFailures: number;
}[] {
  return proxyHealthManager.getHealthStats();
}

/**
 * 重置失败的代理服务记录
 *
 * 清除所有失败标记和健康状态，重新开始。
 *
 * @returns void
 */
export function resetFailedProxyServices(): void {
  failedProxyServices.clear();

  proxyHealthManager.reset();

  logger.info("已重置所有失败的代理服务记录，代理健康状态已完全重置");
}

/**
 * 转换图片URL
 *
 * 将Markdown中的图片URL转换为可访问的代理URL。
 *
 * @param src - 图片源URL
 * @param markdownFilePath - Markdown文件路径
 * @param useTokenMode - 是否使用Token模式
 * @param branch - 分支名称（可选）
 * @returns 转换后的图片URL
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
