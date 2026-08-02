import type { Config } from "../types";
import { CONFIG_DEFAULTS } from "../constants";
import { EnvParser } from "../utils/env-parser";
import { resolveEnvWithMapping } from "../utils/env-mapping";

type EnvSourceValue = string | boolean | null | undefined;
type EnvSource = Record<string, EnvSourceValue>;
type EnvStringRecord = Record<string, string | undefined>;

export const parseProxyUrls = (raw: string): string[] =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

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
        footer: {
          leftText: resolveEnvWithMapping(stringEnv, "FOOTER_LEFT_TEXT", ""),
        },
      },
      proxy: {
        urls: parseProxyUrls(
          resolveEnvWithMapping(
            stringEnv,
            "DOWNLOAD_PROXY_URL",
            CONFIG_DEFAULTS.DOWNLOAD_PROXY_URL,
          ),
        ),
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
}
