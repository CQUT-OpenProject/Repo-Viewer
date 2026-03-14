import { getAccessConfig, getProxyConfig } from "@/config";

// 获取配置
export const accessConfig = getAccessConfig();
const proxyConfig = getProxyConfig();

// 模式设置
export const USE_TOKEN_MODE = accessConfig.useTokenMode;

/**
 * 代理服务URL列表
 */
export const PROXY_SERVICES = [
  proxyConfig.imageProxyUrl, // 默认代理
  proxyConfig.imageProxyUrlBackup1, // 备用代理1
  proxyConfig.imageProxyUrlBackup2, // 备用代理2
];
