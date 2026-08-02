import type { Config } from "../types";
import { configManager } from "../core/ConfigManager";

/**
 * 获取完整配置对象
 *
 * @returns 完整的应用配置
 */
export const getConfig = (): Config => configManager.getConfig();

/**
 * 获取站点配置
 *
 * @returns 站点相关配置
 */
export const getSiteConfig = (): Config["site"] => getConfig().site;

/**
 * 获取GitHub配置
 *
 * @returns GitHub仓库相关配置
 */
export const getGithubConfig = (): Config["github"] => getConfig().github;

/**
 * 获取功能配置
 *
 * @returns 应用功能相关配置
 */
export const getFeaturesConfig = (): Config["features"] => getConfig().features;

/**
 * 获取代理配置
 *
 * @returns 代理相关配置
 */
export const getProxyConfig = (): Config["proxy"] => getConfig().proxy;

/**
 * 获取访问控制配置
 *
 * @returns 访问控制相关配置
 */
export const getAccessConfig = (): Config["access"] => getConfig().access;

/**
 * 获取开发者配置
 *
 * @returns 开发者模式相关配置
 */
export const getDeveloperConfig = (): Config["developer"] => getConfig().developer;

/**
 * 获取运行时配置
 *
 * @returns 运行时环境相关配置
 */
export const getRuntimeConfig = (): Config["runtime"] => getConfig().runtime;

/**
 * 检查是否为开发者模式
 */
export const isDeveloperMode = (): boolean => getConfig().developer.mode;

/**
 * 检查是否为Token模式
 */
export const isTokenMode = (): boolean => getConfig().access.useTokenMode;

/**
 * 获取GitHub Personal Access Tokens
 */
export const getGithubPATs = (): string[] => getConfig().tokens.githubPATs;
