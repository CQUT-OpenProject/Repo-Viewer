/**
 * GitHub代理服务模块
 *
 * 提供代理配置、健康管理和URL转换功能，用于优化GitHub API访问。
 */

export * from "./ProxyService";
export * from "./ProxyConfig";
export { ProxyHealthManager } from "./ProxyHealthManager";
export { ProxyUrlTransformer } from "./ProxyUrlTransformer";
