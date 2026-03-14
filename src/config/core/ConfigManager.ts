/**
 * 配置管理器核心类
 * 单例模式的配置管理
 */

import type { Config, ConfigChangeListener, ConfigDebugInfo } from "../types";
import { CONFIG_DEFAULTS } from "../constants";
import { EnvParser } from "../utils/env-parser";
import { hasEnvValue } from "../utils/env-mapping";
import { ConfigLoader } from "./ConfigLoader";
import { ConfigValidator } from "./ConfigValidator";
import { TokenLoader } from "./TokenLoader";

/**
 * 配置管理器 - 单例模式
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: Config | null = null;
  private listeners: Set<ConfigChangeListener>;
  private hotReloadEnabled = false;
  private hotReloadHandler: (() => void) | null = null;

  private loader: ConfigLoader;
  private validator: ConfigValidator;
  private tokenLoader: TokenLoader;

  private constructor() {
    this.listeners = new Set<ConfigChangeListener>();
    this.loader = new ConfigLoader();
    this.validator = new ConfigValidator();
    this.tokenLoader = new TokenLoader();
  }

  /**
   * 获取ConfigManager单例实例
   *
   * @returns ConfigManager实例
   */
  static getInstance(): ConfigManager {
    this.instance ??= new ConfigManager();
    return this.instance;
  }

  /**
   * 获取配置
   *
   * 获取当前加载的配置对象，如果未加载则自动加载。
   *
   * @returns 完整的配置对象
   */
  getConfig(): Config {
    this.config ??= this.loadConfig();
    return this.config;
  }

  /**
   * 重新加载配置
   *
   * 从环境变量重新加载配置，并通知所有监听器。
   *
   * @returns 重新加载后的配置对象
   */
  reloadConfig(): Config {
    const oldConfig = this.config;
    this.config = this.loadConfig();

    if (oldConfig !== null) {
      this.notifyConfigChange(this.config, oldConfig);
    }

    return this.config;
  }

  /**
   * 监听配置变更
   *
   * 注册配置变更监听器，当配置更新时会被调用。
   *
   * @param listener - 配置变更监听器函数
   * @returns 取消监听的函数
   */
  onConfigChange(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 启用配置热更新
   *
   * 在开发环境中启用配置热更新功能。
   * 监听自定义 'config:reload' 事件来触发配置重载。
   *
   * @returns void
   *
   * @example
   * // 手动触发配置重载：
   * window.dispatchEvent(new CustomEvent('config:reload'));
   */
  enableHotReload(): void {
    if (this.hotReloadEnabled) {
      return;
    }

    // 只在浏览器环境中启用
    if (typeof window === "undefined") {
      return;
    }

    this.hotReloadHandler = () => {
      const config = this.getConfig();
      if (config.developer.mode || config.developer.consoleLogging) {
        // oxlint-disable-next-line no-console
        console.log("[ConfigManager] 检测到配置重载事件，重新加载配置...");
      }
      this.reloadConfig();
    };

    window.addEventListener("config:reload", this.hotReloadHandler);
    this.hotReloadEnabled = true;

    const config = this.getConfig();
    if (config.developer.mode || config.developer.consoleLogging) {
      // oxlint-disable-next-line no-console
      console.log(
        '[ConfigManager] 配置热更新已启用。使用 window.dispatchEvent(new CustomEvent("config:reload")) 触发重载。',
      );
    }
  }

  // 通知配置变更
  private notifyConfigChange(newConfig: Config, oldConfig: Config): void {
    this.listeners.forEach((listener) => {
      try {
        listener(newConfig, oldConfig);
      } catch (error) {
        const developerConfig = this.getConfig().developer;
        if (developerConfig.mode || developerConfig.consoleLogging) {
          console.error("配置变更监听器执行失败:", error);
        }
      }
    });
  }

  // 从环境变量加载配置
  private loadConfig(): Config {
    const env = this.loader.getEnvSource();
    const baseConfig = this.loader.loadConfig();
    const tokens = this.tokenLoader.loadTokens(env);

    const config: Config = {
      ...baseConfig,
      tokens,
    };

    // 验证配置
    this.validator.validateConfig(config);

    return config;
  }

  /**
   * 获取用于Vite define的PAT对象
   *
   * 构建用于Vite构建时注入的环境变量对象。
   *
   * @param env - 可选的环境变量源
   * @returns PAT环境变量对象
   */
  getPATsForViteDefine(
    env?: Record<string, string | boolean | null | undefined>,
  ): Record<string, string> {
    const processEnv = this.loader.getProcessEnv();
    const envSource = env ?? processEnv ?? {};
    return this.tokenLoader.getPATsForViteDefine(envSource);
  }

  /**
   * 获取配置调试信息
   *
   * 返回详细的配置加载信息，用于调试和排查配置问题。
   *
   * @returns 配置调试信息对象
   */
  getDebugInfo(): ConfigDebugInfo {
    const config = this.getConfig();
    const env = this.loader.getEnvSource();
    const stringEnv = this.loader.getStringEnvRecord(env);

    // 生成token源信息
    const tokenSources: { key: string; hasValue: boolean; isValid: boolean }[] = [];
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach((prefix) => {
      const baseToken = this.tokenLoader.getEnvString(env, prefix);
      tokenSources.push({
        key: prefix,
        hasValue: baseToken !== undefined,
        isValid: baseToken !== undefined && EnvParser.validateToken(baseToken),
      });

      // 检查带数字的版本
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        const tokenKey = prefix + String(i);
        const token = this.tokenLoader.getEnvString(env, tokenKey);
        tokenSources.push({
          key: tokenKey,
          hasValue: token !== undefined,
          isValid: token !== undefined && EnvParser.validateToken(token),
        });
      }
    });

    return {
      loadedAt: new Date().toISOString(),
      environment: config.runtime.isDev ? "development" : "production",
      configSummary: {
        siteTitle: config.site.title,
        repoOwner: config.github.repoOwner,
        repoName: config.github.repoName,
        developerMode: config.developer.mode,
        tokenMode: config.access.useTokenMode,
        tokenCount: config.tokens.totalCount,
      },
      envVarStatus: {
        VITE_SITE_TITLE: hasEnvValue(stringEnv, ["VITE_SITE_TITLE"]),
        VITE_GITHUB_REPO_OWNER: hasEnvValue(stringEnv, ["VITE_GITHUB_REPO_OWNER"]),
        GITHUB_REPO_OWNER: hasEnvValue(stringEnv, ["GITHUB_REPO_OWNER"]),
        VITE_GITHUB_REPO_NAME: hasEnvValue(stringEnv, ["VITE_GITHUB_REPO_NAME"]),
        GITHUB_REPO_NAME: hasEnvValue(stringEnv, ["GITHUB_REPO_NAME"]),
        VITE_GITHUB_REPO_BRANCH: hasEnvValue(stringEnv, ["VITE_GITHUB_REPO_BRANCH"]),
        GITHUB_REPO_BRANCH: hasEnvValue(stringEnv, ["GITHUB_REPO_BRANCH"]),
        VITE_DEVELOPER_MODE: hasEnvValue(stringEnv, ["VITE_DEVELOPER_MODE"]),
        VITE_USE_TOKEN_MODE: hasEnvValue(stringEnv, ["VITE_USE_TOKEN_MODE"]),
      },
      tokenSources: tokenSources.filter((source) => source.hasValue),
    };
  }
}

/**
 * 配置管理器单例实例
 *
 * 全局配置管理器，用于访问和管理应用配置。
 * 在开发环境中自动启用配置热更新功能。
 */
export const configManager = ConfigManager.getInstance();

// 在开发环境中自动启用热更新
if (typeof window !== "undefined") {
  // 延迟启用，确保配置已加载
  window.setTimeout(() => {
    const config = configManager.getConfig();
    if (config.runtime.isDev && config.developer.mode) {
      configManager.enableHotReload();
    }
  }, 0);
}
