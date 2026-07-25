import { getAccessConfig, getRuntimeConfig, configManager } from "@/config";
import { logger } from "@/utils/logging/logger";

let _forceServerProxy: boolean | null = null;

/**
 * 获取是否强制使用服务端代理
 */
export function getForceServerProxy(): boolean {
  _forceServerProxy ??= calculateForceServerProxy();
  return _forceServerProxy;
}

/**
 * 重新计算并刷新强制代理配置
 */
export function refreshConfig(): void {
  _forceServerProxy = calculateForceServerProxy();
}

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

configManager.onConfigChange(() => {
  refreshConfig();
});
