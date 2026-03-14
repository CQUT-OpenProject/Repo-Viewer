import { getConfig, getAccessConfig, getRuntimeConfig, configManager } from "@/config";
import { logger } from "@/utils";

// 代理强制模式配置管理器，统一管理所有代理相关的配置逻辑
// 内部状态变量
let _forceServerProxy: boolean | null = null;

/**
 * 获取是否强制使用服务端代理
 *
 * @returns 如果需要强制使用服务端代理返回true
 */
export function getForceServerProxy(): boolean {
  _forceServerProxy ??= calculateForceServerProxy();
  return _forceServerProxy;
}

/**
 * 重新计算并刷新强制代理配置
 *
 * @returns void
 */
export function refreshConfig(): void {
  _forceServerProxy = calculateForceServerProxy();
}

// 计算是否强制使用服务端代理
function calculateForceServerProxy(): boolean {
  try {
    const runtimeConfig = getRuntimeConfig();
    const accessConfig = getAccessConfig();

    if (!runtimeConfig.isDev) {
      return true;
    }

    if (accessConfig.useTokenMode) {
      logger.info("Token 模式已启用，优先使用服务端代理以保护令牌");
      return true;
    }

    return false;
  } catch (error) {
    logger.warn("计算强制代理配置时出错，使用默认值 false:", error);
    return false;
  }
}

/**
 * 获取代理配置详情
 *
 * 返回当前代理配置的详细信息，主要用于调试。
 *
 * @returns 代理配置详情对象
 */
export function getProxyConfigDetails(): {
  forceServerProxy: boolean;
  isDev: boolean;
  useTokenMode: boolean;
  reason: string;
} {
  const runtimeConfig = getRuntimeConfig();
  const accessConfig = getAccessConfig();
  const forceServerProxy = getForceServerProxy();

  let reason: string;
  if (!runtimeConfig.isDev) {
    reason = "生产环境，强制使用服务端代理";
  } else if (accessConfig.useTokenMode) {
    reason = "开发环境启用 Token 模式，尝试使用服务端代理";
  } else {
    reason = "开发环境且未启用 Token 模式，采用直连模式";
  }

  return {
    forceServerProxy,
    isDev: runtimeConfig.isDev,
    useTokenMode: accessConfig.useTokenMode,
    reason,
  };
}

/**
 * 检查是否应该使用服务端API
 *
 * @returns 如果应该使用服务端API返回true
 */
export function shouldUseServerAPI(): boolean {
  // 基础的强制代理检查
  if (getForceServerProxy()) {
    return true;
  }

  // 可以在这里添加其他条件，比如：
  // - 网络环境检测
  // - 用户偏好设置
  // - 特定功能需求等

  return false;
}

/**
 * 获取推荐的请求策略
 *
 * @returns 请求策略类型
 */
export function getRequestStrategy(): "server-api" | "direct-api" | "hybrid" {
  const config = getConfig();

  if (getForceServerProxy()) {
    return "server-api";
  }

  if (config.runtime.isDev) {
    return "direct-api";
  }

  return "hybrid";
}

// 导出便捷别名函数
export const refreshProxyConfig = (): void => {
  refreshConfig();
};

// 配置变更监听
configManager.onConfigChange(() => {
  refreshConfig();
});
