import { getProxyConfig, isTokenMode } from "@/config";

const proxyConfig = getProxyConfig();

export const USE_TOKEN_MODE = isTokenMode();

/**
 * 代理服务URL列表
 */
export const PROXY_SERVICES = proxyConfig.urls;
