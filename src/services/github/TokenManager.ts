import { logger } from "@/utils";
import { getGithubPATs, isTokenMode, isDeveloperMode, configManager, EnvParser } from "@/config";

// 工具函数
const isDevEnvironment = import.meta.env.DEV;

// 模式设置
const USE_TOKEN_MODE = isTokenMode();

/**
 * Token 状态信息
 */
interface TokenState {
  token: string;
  rateLimitRemaining: number;
  rateLimitReset: number;
  lastUsed: number;
  failureCount: number;
  lastFailure: number;
}

/**
 * GitHub Token管理器类
 *
 * 管理多个GitHub Personal Access Token的加载、轮换和失败处理。
 * 支持从环境变量和localStorage加载token，并提供自动轮换机制以避免rate limit。
 *
 */
export class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex = 0;
  private usageCount = new Map<string, number>();
  private failedTokens = new Set<string>();

  // 智能 Token 管理
  private tokenStates = new Map<string, TokenState>();
  private static readonly BACKOFF_DURATION = 300000; // 5分钟退避时间
  private static readonly MIN_RATE_LIMIT = 10; // 最小剩余配额

  constructor() {
    if (isDevEnvironment || USE_TOKEN_MODE) {
      this.loadTokensFromEnv();
    }
    if (this.tokens.length > 0) {
      logger.info(`成功加载 ${this.tokens.length.toString()} 个GitHub Personal Access Token`);
    } else if (isDevEnvironment) {
      logger.warn("未加载任何GitHub Personal Access Token，API访问将受到严格限制");
    }
  }

  /**
   * 从环境变量和localStorage加载GitHub Token
   *
   * @returns void
   */
  public loadTokensFromEnv(): void {
    this.tokens = [];

    try {
      const envTokens = getGithubPATs();
      this.tokens.push(...envTokens);

      if (envTokens.length > 0) {
        logger.debug(`从环境变量加载了 ${envTokens.length.toString()} 个 GitHub PAT`);
      }
      if (typeof localStorage !== "undefined") {
        const localToken = localStorage.getItem("GITHUB_PAT");
        if (localToken !== null && localToken !== "" && EnvParser.validateToken(localToken)) {
          this.tokens.push(localToken.trim());
          logger.debug("已从localStorage加载token (已脱敏)");
        }
      }

      this.tokens = [...new Set(this.tokens)];

      if (this.tokens.length > 0) {
        logger.info(`成功加载 ${this.tokens.length.toString()} 个GitHub Personal Access Token`);
      }

      if (isDeveloperMode()) {
        const debugInfo = configManager.getDebugInfo();
        logger.debug("PAT 配置调试信息:", debugInfo);
      }
    } catch (error) {
      logger.error("加载GitHub token失败:", error);
    }
  }

  /**
   * 获取当前使用的Token
   *
   * @returns 当前Token字符串，如果没有可用token则返回空字符串
   */
  public getCurrentToken(): string {
    if (this.tokens.length === 0) {
      return "";
    }
    return this.tokens[this.currentIndex] ?? "";
  }

  /**
   * 切换到下一个可用Token
   *
   * 自动跳过已标记为失败的token，如果所有token都失败则清除失败记录并重新开始。
   *
   * @returns 下一个可用的Token字符串
   */
  public getNextToken(): string {
    if (this.tokens.length === 0) {
      return "";
    }

    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];
      if (token === undefined || token === "") {
        attempts++;
        continue;
      }
      if (this.failedTokens.has(token)) {
        attempts++;
        continue;
      }

      return token;
    }

    this.failedTokens.clear();
    this.currentIndex = 0;
    return this.tokens[0] ?? "";
  }

  /**
   * 标记Token已被使用
   *
   * 记录token使用次数，当使用次数超过30次时自动轮换到下一个token。
   *
   * @param token - 已使用的Token字符串
   * @returns void
   */
  public markTokenUsed(token: string): void {
    const count = this.usageCount.get(token) ?? 0;
    this.usageCount.set(token, count + 1);

    if (count > 30) {
      this.usageCount.set(token, 0);
      this.getNextToken();
    }
  }

  /**
   * 标记Token失败
   *
   * 将token添加到失败列表并切换到下一个可用token。
   * 实现退避策略：记录失败次数和时间，失败的 token 会被暂时跳过。
   *
   * @param token - 失败的Token字符串
   * @returns 下一个可用的Token字符串
   */
  public markTokenFailed(token: string): string {
    // 更新 token 状态
    const state = this.tokenStates.get(token) ?? {
      token,
      rateLimitRemaining: 0,
      rateLimitReset: 0,
      lastUsed: 0,
      failureCount: 0,
      lastFailure: 0,
    };

    state.failureCount++;
    state.lastFailure = Date.now();
    this.tokenStates.set(token, state);

    logger.warn(
      `Token 失败 (第 ${state.failureCount.toString()} 次), 将退避 ${(GitHubTokenManager.BACKOFF_DURATION / 60000).toString()} 分钟`,
    );

    this.failedTokens.add(token);
    return this.getNextToken();
  }

  /**
   * 检查是否有可用Token
   *
   * @returns 如果至少有一个token则返回true
   */
  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  /**
   * 获取Token总数
   *
   * @returns 已加载的token数量
   */
  public getTokenCount(): number {
    return this.tokens.length;
  }

  /**
   * 设置本地Token
   *
   * 在localStorage中存储或删除GitHub PAT，并重新加载所有token。
   *
   * @param token - Token字符串，空字符串表示删除
   * @returns void
   */
  public setLocalToken(token: string): void {
    if (typeof localStorage !== "undefined") {
      if (token === "" || token.trim().length === 0) {
        localStorage.removeItem("GITHUB_PAT");
        logger.info("已移除本地GitHub token");
      } else {
        localStorage.setItem("GITHUB_PAT", token.trim());
        logger.info("已设置本地GitHub token");
      }
      this.loadTokensFromEnv();
    }
  }

  /**
   * 智能选择最佳 Token
   *
   * 基于以下因素选择最佳 token：
   * 1. 剩余配额（优先选择配额多的）
   * 2. 退避时间（跳过在退避期的 token）
   * 3. 速率限制重置时间
   *
   * @returns 最佳 Token 或当前 Token
   */
  private selectBestToken(): string {
    if (this.tokens.length === 0) {
      return "";
    }

    const now = Date.now();
    let bestToken = "";
    let bestScore = -1;

    for (const token of this.tokens) {
      // 跳过失败的 token
      if (this.failedTokens.has(token)) {
        continue;
      }

      const state = this.tokenStates.get(token);

      // 如果没有状态信息，给一个中等分数
      if (state === undefined) {
        const score = 50;
        if (score > bestScore) {
          bestScore = score;
          bestToken = token;
        }
        continue;
      }

      // 检查是否在退避期
      if (state.failureCount > 0 && now - state.lastFailure < GitHubTokenManager.BACKOFF_DURATION) {
        logger.debug(`Token 在退避期，跳过`);
        continue;
      }

      // 检查速率限制是否已重置
      if (state.rateLimitReset > 0 && now > state.rateLimitReset * 1000) {
        // 速率限制已重置，重置状态
        state.rateLimitRemaining = 5000; // GitHub默认限制
      }

      // 计算分数：剩余配额越多分数越高
      const score = state.rateLimitRemaining;

      // 如果配额太低，跳过
      if (score < GitHubTokenManager.MIN_RATE_LIMIT) {
        logger.debug(`Token 配额不足 (${score.toString()}), 跳过`);
        continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestToken = token;
      }
    }

    // 如果找到了更好的 token，切换到它
    if (bestToken !== "" && bestToken !== this.getCurrentToken()) {
      const newIndex = this.tokens.indexOf(bestToken);
      if (newIndex !== -1) {
        this.currentIndex = newIndex;
        logger.debug(`智能切换到配额更高的 Token (剩余配额: ${bestScore.toString()})`);
      }
    }

    return bestToken !== "" ? bestToken : this.getCurrentToken();
  }

  /**
   * 更新 Token 的 Rate Limit 状态
   *
   * @param token - Token 字符串
   * @param remaining - 剩余请求数
   * @param reset - 重置时间戳（秒）
   */
  public updateTokenRateLimit(token: string, remaining: number, reset: number): void {
    const state = this.tokenStates.get(token) ?? {
      token,
      rateLimitRemaining: 5000,
      rateLimitReset: 0,
      lastUsed: 0,
      failureCount: 0,
      lastFailure: 0,
    };

    state.rateLimitRemaining = remaining;
    state.rateLimitReset = reset;
    state.lastUsed = Date.now();

    this.tokenStates.set(token, state);

    logger.debug(
      `更新 Token 状态: 剩余 ${remaining.toString()}, 重置于 ${new Date(reset * 1000).toISOString()}`,
    );
  }

  /**
   * 获取GitHub PAT用于API请求
   *
   * 使用智能选择算法返回最佳token并自动记录使用次数。
   *
   * @returns GitHub Personal Access Token字符串
   */
  public getGitHubPAT(): string {
    const token = this.selectBestToken();
    if (token !== "") {
      this.markTokenUsed(token);
    }
    return token;
  }

  /**
   * 处理API错误响应
   *
   * 根据HTTP状态码自动处理token轮换，支持401/403/429/400等错误。
   * 同时提取并缓存 rate limit 信息。
   *
   * @param error - API响应的Response对象
   * @returns void
   */
  public handleApiError(error: Response): void {
    const currentToken = this.getCurrentToken();

    // 提取 rate limit 信息
    const remainingHeader = error.headers.get("x-ratelimit-remaining");
    const resetHeader = error.headers.get("x-ratelimit-reset");

    if (currentToken !== "" && remainingHeader !== null && resetHeader !== null) {
      const remaining = parseInt(remainingHeader, 10);
      const reset = parseInt(resetHeader, 10);

      if (!isNaN(remaining) && !isNaN(reset)) {
        this.updateTokenRateLimit(currentToken, remaining, reset);
      }
    }

    if (error.status === 401 || error.status === 403) {
      if (currentToken !== "") {
        logger.warn(`令牌认证失败，尝试使用下一个令牌`);
        this.markTokenFailed(currentToken);
      }
    }

    if (error.status === 429) {
      if (currentToken !== "") {
        logger.warn(`令牌请求频率限制，尝试使用下一个令牌`);
        this.getNextToken();
      }
    }

    if (error.status === 400) {
      if (currentToken !== "") {
        logger.warn(
          `发生400错误(Bad Request)，可能是请求格式问题或Token权限不足，尝试使用下一个令牌`,
        );
        this.getNextToken();
      }

      error
        .clone()
        .text()
        .then((errorText) => {
          try {
            const errorJson = JSON.parse(errorText) as { message?: string; errors?: unknown[] };
            logger.error(`GitHub API 400错误详情: ${JSON.stringify(errorJson)}`);

            if (errorJson.message !== undefined && errorJson.message !== "") {
              logger.error(`错误消息: ${errorJson.message}`);
            }
            if (errorJson.errors !== undefined && Array.isArray(errorJson.errors)) {
              errorJson.errors.forEach((err: unknown, index: number) => {
                logger.error(`详细错误 #${(index + 1).toString()}: ${JSON.stringify(err)}`);
              });
            }
          } catch {
            logger.error(`GitHub API 400错误详情 (非JSON格式): ${errorText}`);
          }
        })
        .catch((_e: unknown) => {
          logger.error("无法解析400错误响应内容:", _e);
        });
    }
  }
}
