import { getProxyConfig } from "@/config";
import { PROXY_SERVICES } from "./ProxyConfig";
import { logger } from "@/utils/logging/logger";

const proxyConfig = getProxyConfig();

/**
 * 代理健康状态接口
 */
interface ProxyHealth {
  url: string;
  failureCount: number;
  lastFailure: number;
  isHealthy: boolean;
  consecutiveFailures: number;
}

/**
 * 代理健康管理器类
 *
 * 基于失败计数的故障转移；超时后允许重试。
 */
class ProxyHealthManager {
  private proxyHealth = new Map<string, ProxyHealth>();
  private readonly MAX_FAILURES = 3;

  constructor() {
    this.initializeProxies();
  }

  private initializeProxies(): void {
    PROXY_SERVICES.forEach((proxyUrl) => {
      if (proxyUrl !== "" && proxyUrl.trim() !== "") {
        this.proxyHealth.set(proxyUrl, {
          url: proxyUrl,
          failureCount: 0,
          lastFailure: 0,
          isHealthy: true,
          consecutiveFailures: 0,
        });
      }
    });
  }

  /**
   * 记录代理失败
   *
   * 记录代理服务的失败次数，连续失败超过阈值后标记为不健康。
   *
   * @param proxyUrl - 代理URL
   * @returns void
   */
  public recordFailure(proxyUrl: string): void {
    const health = this.proxyHealth.get(proxyUrl);
    if (health !== undefined) {
      health.failureCount++;
      health.consecutiveFailures++;
      health.lastFailure = Date.now();
      health.isHealthy = health.consecutiveFailures < this.MAX_FAILURES;
      logger.warn(`代理失败: ${proxyUrl}, 连续失败: ${health.consecutiveFailures.toString()}`);
    }
  }

  /**
   * 获取最佳代理服务
   *
   * 根据健康状态选择代理；健康优先，其次失败次数更少。
   *
   * @returns 最佳代理服务URL
   */
  public getBestProxy(): string {
    const healthyProxies = Array.from(this.proxyHealth.values())
      .filter((health) => health.isHealthy || this.shouldRetryProxy(health))
      .sort((a, b) => {
        if (a.isHealthy && !b.isHealthy) {
          return -1;
        }
        if (!a.isHealthy && b.isHealthy) {
          return 1;
        }
        return a.consecutiveFailures - b.consecutiveFailures;
      });

    return healthyProxies.length > 0 ? (healthyProxies[0]?.url ?? "") : (PROXY_SERVICES[0] ?? "");
  }

  /**
   * 检查代理是否应该重试
   *
   * 根据恢复时间判断失败的代理是否可以重试。
   *
   * @param health - 代理健康状态
   * @returns 如果可以重试返回true
   */
  private shouldRetryProxy(health: ProxyHealth): boolean {
    const now = Date.now();
    const recoveryTime = proxyConfig.recoveryTime;
    return now - health.lastFailure > recoveryTime;
  }

  /**
   * 重置健康管理器
   *
   * 清空所有代理健康记录并重新初始化。
   *
   * @returns void
   */
  public reset(): void {
    this.proxyHealth.clear();
    this.initializeProxies();
    logger.info("代理健康管理器已重置，所有状态已清空并重新初始化");
  }
}

// 创建单例实例
export const proxyHealthManager = new ProxyHealthManager();
