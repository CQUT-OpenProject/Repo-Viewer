/**
 * 应用配置接口
 */
export interface Config {
  site: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
  github: {
    repoOwner: string;
    repoName: string;
    repoBranch: string;
  };
  features: {
    homepageFilter: {
      enabled: boolean;
      allowedFolders: string[];
      allowedFileTypes: string[];
    };
    hideDownload: {
      enabled: boolean;
      hiddenFolders: string[];
    };
    searchIndex: {
      enabled: boolean;
      generationMode: "build" | "action" | "off";
      defaultBranch: string;
      manifestPath: string;
      assetBasePath: string;
      refreshIntervalMs: number;
    };
    footer: {
      leftText: string;
    };
  };
  proxy: {
    imageProxyUrl: string;
    imageProxyUrlBackup1: string;
    imageProxyUrlBackup2: string;
    healthCheckTimeout: number;
    validationTimeout: number;
    healthCheckInterval: number;
    recoveryTime: number;
  };
  access: {
    useTokenMode: boolean;
  };
  developer: {
    mode: boolean;
    consoleLogging: boolean;
    logging?: DeveloperLoggingConfig;
  };
  runtime: {
    isDev: boolean;
    isProd: boolean;
  };
  tokens: {
    githubPATs: string[];
    totalCount: number;
  };
}

export interface DeveloperLoggingConfig {
  enableConsole?: boolean;
  enableErrorReporting?: boolean;
  includeWarnInReporting?: boolean;
  enableRecorder?: boolean;
  reportUrl?: string;
  baseLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * 配置变更监听器类型
 */
export type ConfigChangeListener = (newConfig: Config, oldConfig: Config) => void;

/**
 * 配置调试信息接口
 */
export interface ConfigDebugInfo {
  loadedAt: string;
  environment: "development" | "production";
  configSummary: {
    siteTitle: string;
    repoOwner: string;
    repoName: string;
    developerMode: boolean;
    tokenMode: boolean;
    tokenCount: number;
  };
  envVarStatus: Record<string, boolean>;
  tokenSources: { key: string; hasValue: boolean; isValid: boolean }[];
}
export interface EnvMappingOptions {
  isProdLike?: boolean;
}
