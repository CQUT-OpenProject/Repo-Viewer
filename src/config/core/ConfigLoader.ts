import type { Config, DeveloperLoggingConfig } from "../types";
import { CONFIG_DEFAULTS } from "../constants";
import { EnvParser } from "../utils/env-parser";
import { resolveEnvWithMapping } from "../utils/env-mapping";

type EnvSourceValue = string | boolean | null | undefined;
type EnvSource = Record<string, EnvSourceValue>;
type EnvStringRecord = Record<string, string | undefined>;

const normalizeSearchIndexGenerationMode = (
  value: string,
  fallback: "build" | "action" | "off",
): "build" | "action" | "off" => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "build" || normalized === "action" || normalized === "off") {
    return normalized;
  }
  return fallback;
};

/**
 * 配置加载器
 *
 * 负责从环境变量加载应用配置
 */
export class ConfigLoader {
  /**
   * 加载完整配置
   */
  public loadConfig(): Omit<Config, "tokens"> {
    const env = this.getEnvSource();
    const stringEnv = this.getStringEnvRecord(env);
    const developerMode = EnvParser.parseBoolean(
      resolveEnvWithMapping(stringEnv, "DEVELOPER_MODE", "false"),
    );
    const consoleLogging = EnvParser.parseBoolean(
      resolveEnvWithMapping(stringEnv, "CONSOLE_LOGGING", "false"),
    );
    const loggingConfig = this.resolveDeveloperLoggingConfig(
      stringEnv,
      developerMode,
      consoleLogging,
    );

    const repoOwner = resolveEnvWithMapping(
      stringEnv,
      "GITHUB_REPO_OWNER",
      CONFIG_DEFAULTS.GITHUB_REPO_OWNER,
    );
    const repoName = resolveEnvWithMapping(
      stringEnv,
      "GITHUB_REPO_NAME",
      CONFIG_DEFAULTS.GITHUB_REPO_NAME,
    );
    const repoBranch = resolveEnvWithMapping(
      stringEnv,
      "GITHUB_REPO_BRANCH",
      CONFIG_DEFAULTS.GITHUB_REPO_BRANCH,
    );

    const searchIndexEnabled = EnvParser.parseBoolean(
      resolveEnvWithMapping(stringEnv, "ENABLED_SEARCH_INDEX", "false"),
    );
    const searchIndexGenerationMode = normalizeSearchIndexGenerationMode(
      resolveEnvWithMapping(
        stringEnv,
        "SEARCH_INDEX_GENERATION_MODE",
        CONFIG_DEFAULTS.SEARCH_INDEX_GENERATION_MODE,
      ),
      CONFIG_DEFAULTS.SEARCH_INDEX_GENERATION_MODE,
    );
    const searchIndexBranchesValue = resolveEnvWithMapping(stringEnv, "SEARCH_INDEX_BRANCHES", "");
    const searchIndexBranches = Array.from(
      new Set(
        searchIndexBranchesValue
          .split(/[\s,]+/)
          .map((branch) => branch.trim())
          .filter((branch) => branch.length > 0),
      ),
    );
    const searchIndexDefaultBranch = searchIndexBranches[0] ?? repoBranch;
    const searchIndexManifestPath = CONFIG_DEFAULTS.SEARCH_INDEX_MANIFEST_PATH;
    const searchIndexAssetBasePath = CONFIG_DEFAULTS.SEARCH_INDEX_ASSET_BASE_PATH;
    const searchIndexRefreshIntervalMs = CONFIG_DEFAULTS.SEARCH_INDEX_REFRESH_INTERVAL_MS;

    return {
      site: {
        title: resolveEnvWithMapping(stringEnv, "SITE_TITLE", CONFIG_DEFAULTS.SITE_TITLE),
        description: resolveEnvWithMapping(
          stringEnv,
          "SITE_DESCRIPTION",
          CONFIG_DEFAULTS.SITE_DESCRIPTION,
        ),
        keywords: resolveEnvWithMapping(stringEnv, "SITE_KEYWORDS", CONFIG_DEFAULTS.SITE_KEYWORDS),
        ogImage: resolveEnvWithMapping(stringEnv, "SITE_OG_IMAGE", CONFIG_DEFAULTS.SITE_OG_IMAGE),
      },
      github: {
        repoOwner,
        repoName,
        repoBranch,
      },
      features: {
        homepageFilter: {
          enabled: EnvParser.parseBoolean(
            resolveEnvWithMapping(stringEnv, "HOMEPAGE_FILTER_ENABLED", "false"),
          ),
          allowedFolders: EnvParser.parseStringArray(
            resolveEnvWithMapping(stringEnv, "HOMEPAGE_ALLOWED_FOLDERS", ""),
          ),
          allowedFileTypes: EnvParser.parseStringArray(
            resolveEnvWithMapping(stringEnv, "HOMEPAGE_ALLOWED_FILETYPES", ""),
          ),
        },
        hideDownload: {
          enabled: EnvParser.parseBoolean(
            resolveEnvWithMapping(stringEnv, "HIDE_MAIN_FOLDER_DOWNLOAD", "false"),
          ),
          hiddenFolders: EnvParser.parseStringArray(
            resolveEnvWithMapping(stringEnv, "HIDE_DOWNLOAD_FOLDERS", ""),
          ),
        },
        searchIndex: {
          enabled: searchIndexEnabled,
          generationMode: searchIndexGenerationMode,
          defaultBranch: searchIndexDefaultBranch,
          manifestPath: searchIndexManifestPath,
          assetBasePath: searchIndexAssetBasePath,
          refreshIntervalMs: searchIndexRefreshIntervalMs,
        },
        footer: {
          leftText: resolveEnvWithMapping(stringEnv, "FOOTER_LEFT_TEXT", ""),
        },
      },
      proxy: {
        imageProxyUrl: resolveEnvWithMapping(
          stringEnv,
          "DOWNLOAD_PROXY_URL",
          CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL,
        ),
        imageProxyUrlBackup1: resolveEnvWithMapping(
          stringEnv,
          "DOWNLOAD_PROXY_URL_BACKUP1",
          CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP1,
        ),
        imageProxyUrlBackup2: resolveEnvWithMapping(
          stringEnv,
          "DOWNLOAD_PROXY_URL_BACKUP2",
          CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL_BACKUP2,
        ),
        healthCheckTimeout: 5000,
        validationTimeout: 10000,
        healthCheckInterval: 30000,
        recoveryTime: 300000,
      },
      access: {
        useTokenMode: EnvParser.parseBoolean(
          resolveEnvWithMapping(stringEnv, "USE_TOKEN_MODE", "false"),
        ),
      },
      developer: {
        mode: developerMode,
        consoleLogging,
        logging: loggingConfig,
      },
      runtime: {
        isDev: this.getBooleanFlag(env, "DEV"),
        isProd: this.getBooleanFlag(env, "PROD"),
      },
    };
  }

  /**
   * 获取环境变量源
   */
  public getEnvSource(): EnvSource {
    if (typeof window !== "undefined") {
      return import.meta.env as unknown as EnvSource;
    }
    const processEnv = this.getProcessEnv();
    if (processEnv !== undefined) {
      return processEnv;
    }
    return {};
  }

  /**
   * 获取 process.env（Node.js环境）
   */
  public getProcessEnv(): EnvSource | undefined {
    const globalProcess = (globalThis as { process?: { env?: unknown } }).process;
    if (
      globalProcess !== undefined &&
      typeof globalProcess.env === "object" &&
      globalProcess.env !== null
    ) {
      return globalProcess.env as EnvSource;
    }
    return undefined;
  }

  /**
   * 将环境变量源转换为字符串记录
   */
  public getStringEnvRecord(env: EnvSource): EnvStringRecord {
    const result: EnvStringRecord = {};
    Object.keys(env).forEach((key) => {
      const value = env[key];
      if (typeof value === "string") {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * 获取布尔标志
   */
  public getBooleanFlag(env: EnvSource, key: string): boolean {
    const value = env[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
    return false;
  }

  private resolveDeveloperLoggingConfig(
    env: EnvStringRecord,
    developerMode: boolean,
    consoleLogging: boolean,
  ): DeveloperLoggingConfig {
    const enableConsole = EnvParser.parseBoolean(
      resolveEnvWithMapping(
        env,
        "LOGGER_ENABLE_CONSOLE",
        developerMode || consoleLogging ? "true" : "false",
      ),
    );

    const enableErrorReporting = EnvParser.parseBoolean(
      resolveEnvWithMapping(env, "LOGGER_ENABLE_ERROR_REPORTING", "false"),
    );

    const includeWarnInReporting = EnvParser.parseBoolean(
      resolveEnvWithMapping(env, "LOGGER_REPORT_WARNINGS", "false"),
    );

    const enableRecorder = EnvParser.parseBoolean(
      resolveEnvWithMapping(env, "LOGGER_ENABLE_RECORDER", developerMode ? "true" : "false"),
    );

    const reportUrl = resolveEnvWithMapping(env, "LOGGER_REPORT_URL", "");
    const baseLevelValue = resolveEnvWithMapping(env, "LOGGER_BASE_LEVEL", "").toLowerCase();
    const baseLevel: DeveloperLoggingConfig["baseLevel"] = [
      "debug",
      "info",
      "warn",
      "error",
    ].includes(baseLevelValue)
      ? (baseLevelValue as DeveloperLoggingConfig["baseLevel"])
      : undefined;

    const result: DeveloperLoggingConfig = {
      enableConsole,
      enableErrorReporting,
      includeWarnInReporting,
      enableRecorder,
    };

    if (reportUrl.length > 0) {
      result.reportUrl = reportUrl;
    }

    if (baseLevel !== undefined) {
      result.baseLevel = baseLevel;
    }

    return result;
  }
}
