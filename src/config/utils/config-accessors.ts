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
 * 获取搜索索引配置
 *
 * @returns 搜索索引功能配置
 */
export const getSearchIndexConfig = (): Config["features"]["searchIndex"] =>
  getConfig().features.searchIndex;

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
 * 获取Token配置
 *
 * @returns Token相关配置
 */
export const getTokensConfig = (): Config["tokens"] => getConfig().tokens;

/**
 * 检查是否为开发者模式
 *
 * @returns 如果启用开发者模式返回true
 */
export const isDeveloperMode = (): boolean => getConfig().developer.mode;

/**
 * 检查是否为Token模式
 *
 * @returns 如果启用Token模式返回true
 */
export const isTokenMode = (): boolean => getConfig().access.useTokenMode;

/**
 * 检查是否启用搜索索引模式
 *
 * @returns 如果启用搜索索引返回true
 */
export const isSearchIndexEnabled = (): boolean => getSearchIndexConfig().enabled;

/**
 * 检查是否为开发环境
 *
 * @returns 如果是开发环境返回true
 */
export const isDevEnvironment = (): boolean => getConfig().runtime.isDev;

/**
 * 获取GitHub Personal Access Tokens
 *
 * @returns GitHub PAT数组
 */
export const getGithubPATs = (): string[] => getConfig().tokens.githubPATs;
