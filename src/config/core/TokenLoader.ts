import type { Config } from "../types";
import { CONFIG_DEFAULTS } from "../constants";
import { EnvParser } from "../utils/env-parser";

type EnvSourceValue = string | boolean | null | undefined;
type EnvSource = Record<string, EnvSourceValue>;

/**
 * Token 加载器
 *
 * 负责从环境变量加载和管理 GitHub Personal Access Tokens
 */
export class TokenLoader {
  /**
   * 加载所有 Token
   */
  public loadTokens(env: EnvSource): Config["tokens"] {
    const tokens = new Set<string>();

    // 遍历所有前缀，检查不带数字和带数字的版本
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach((prefix) => {
      // 检查不带数字的版本
      this.addTokenIfValid(tokens, env, prefix);

      // 检查带数字的版本（1到MAX_PAT_NUMBER）
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        this.addTokenIfValid(tokens, env, prefix + String(i));
      }
    });

    const uniqueTokens = Array.from(tokens);
    return {
      githubPATs: uniqueTokens,
      totalCount: uniqueTokens.length,
    };
  }

  /**
   * 获取用于Vite define的PAT对象
   *
   * 构建用于Vite构建时注入的环境变量对象。
   *
   * @param env - 环境变量源
   * @returns PAT环境变量对象
   */
  public getPATsForViteDefine(env: EnvSource): Record<string, string> {
    const patEnvVars: Record<string, string> = {};

    // 遍历所有前缀，检查不带数字和带数字的版本
    CONFIG_DEFAULTS.PAT_PREFIXES.forEach((prefix) => {
      // 检查不带数字的版本
      this.addPATToDefineIfValid(patEnvVars, env, prefix);

      // 检查带数字的版本（1到MAX_PAT_NUMBER）
      for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
        this.addPATToDefineIfValid(patEnvVars, env, prefix + String(i));
      }
    });

    return patEnvVars;
  }

  /**
   * 获取字符串类型的环境变量
   */
  public getEnvString(env: EnvSource, key: string): string | undefined {
    const value = env[key];
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * 添加有效的 token 到集合
   */
  private addTokenIfValid(tokens: Set<string>, env: EnvSource, key: string): void {
    const token = this.getEnvString(env, key);
    if (token !== undefined && EnvParser.validateToken(token)) {
      tokens.add(token.trim());
    }
  }

  /**
   * 添加有效的 PAT 到 Vite define 对象
   */
  private addPATToDefineIfValid(
    patEnvVars: Record<string, string>,
    env: EnvSource,
    key: string,
  ): void {
    const token = this.getEnvString(env, key);
    if (token !== undefined && EnvParser.validateToken(token)) {
      patEnvVars[`process.env.${key}`] = JSON.stringify(token);
    }
  }
}
