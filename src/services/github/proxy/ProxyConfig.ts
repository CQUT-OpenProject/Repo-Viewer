import { getProxyConfig, isTokenMode } from "@/config";

const proxyConfig = getProxyConfig();

export const USE_TOKEN_MODE = isTokenMode();

/**
 * 代理服务URL列表
 */
export const PROXY_SERVICES = [
  proxyConfig.imageProxyUrl, // 默认代理
  proxyConfig.imageProxyUrlBackup1, // 备用代理1
  proxyConfig.imageProxyUrlBackup2, // 备用代理2
];
