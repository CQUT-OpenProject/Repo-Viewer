import { logger, trackEvent } from "@/utils/logging/logger";
import { getGithubPATs, isTokenMode, isDeveloperMode, configManager, EnvParser } from "@/config";
import { TokenRotator } from "@/shared/tokenRotator";

const isDevEnvironment = import.meta.env.DEV;
const USE_TOKEN_MODE = isTokenMode();

interface TokenState {
  token: string;
  rateLimitRemaining: number;
  rateLimitReset: number;
  failureCount: number;
  lastFailure: number;
}

/**
 * GitHub Token管理器：加载 + 轮换（TokenRotator）+ rate-limit 智能选择。
 */
export class GitHubTokenManager {
  private readonly rotator = new TokenRotator();
  private tokenStates = new Map<string, TokenState>();
  private static readonly BACKOFF_DURATION = 300000;
  private static readonly MIN_RATE_LIMIT = 10;

  constructor() {
    if (isDevEnvironment || USE_TOKEN_MODE) {
      this.loadTokensFromEnv();
    }
    if (this.rotator.getTokenCount() > 0) {
      logger.info(
        `成功加载 ${this.rotator.getTokenCount().toString()} 个GitHub Personal Access Token`,
      );
    } else if (isDevEnvironment) {
      logger.warn("未加载任何GitHub Personal Access Token，API访问将受到严格限制");
    }
  }

  public loadTokensFromEnv(): void {
    try {
      const tokens: string[] = [...getGithubPATs()];

      if (tokens.length > 0) {
        logger.debug(`从环境变量加载了 ${tokens.length.toString()} 个 GitHub PAT`);
      }
      if (typeof localStorage !== "undefined") {
        const localToken = localStorage.getItem("GITHUB_PAT");
        if (localToken !== null && localToken !== "" && EnvParser.validateToken(localToken)) {
          tokens.push(localToken.trim());
          logger.debug("已从localStorage加载token (已脱敏)");
        }
      }

      this.rotator.setTokens(tokens);

      if (this.rotator.getTokenCount() > 0) {
        logger.info(
          `成功加载 ${this.rotator.getTokenCount().toString()} 个GitHub Personal Access Token`,
        );
      }

      if (isDeveloperMode()) {
        logger.debug("PAT 配置调试信息:", configManager.getDebugInfo());
      }
    } catch (error) {
      logger.error("加载GitHub token失败:", error);
    }
  }

  public getCurrentToken(): string {
    return this.rotator.getCurrentToken();
  }

  public getNextToken(): string {
    return this.rotator.getNextToken();
  }

  public markTokenFailed(token: string): string {
    const state = this.tokenStates.get(token) ?? {
      token,
      rateLimitRemaining: 0,
      rateLimitReset: 0,
      failureCount: 0,
      lastFailure: 0,
    };

    state.failureCount++;
    state.lastFailure = Date.now();
    this.tokenStates.set(token, state);

    logger.warn(
      `Token 失败 (第 ${state.failureCount.toString()} 次), 将退避 ${(GitHubTokenManager.BACKOFF_DURATION / 60000).toString()} 分钟`,
    );

    this.rotator.markTokenFailed(token);
    return this.getNextToken();
  }

  public hasTokens(): boolean {
    return this.rotator.hasTokens();
  }

  public getTokenCount(): number {
    return this.rotator.getTokenCount();
  }

  private selectBestToken(): string {
    const tokens = this.rotator.getTokens();
    if (tokens.length === 0) {
      return "";
    }

    const now = Date.now();
    let bestToken = "";
    let bestScore = -1;

    for (const token of tokens) {
      if (this.rotator.isFailed(token)) {
        continue;
      }

      const state = this.tokenStates.get(token);

      if (state === undefined) {
        if (50 > bestScore) {
          bestScore = 50;
          bestToken = token;
        }
        continue;
      }

      if (state.failureCount > 0 && now - state.lastFailure < GitHubTokenManager.BACKOFF_DURATION) {
        continue;
      }

      if (state.rateLimitReset > 0 && now > state.rateLimitReset * 1000) {
        state.rateLimitRemaining = 5000;
      }

      const score = state.rateLimitRemaining;
      if (score < GitHubTokenManager.MIN_RATE_LIMIT) {
        continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestToken = token;
      }
    }

    if (bestToken !== "" && bestToken !== this.getCurrentToken()) {
      this.rotator.setCurrentToken(bestToken);
      logger.debug(`智能切换到配额更高的 Token (剩余配额: ${bestScore.toString()})`);
    }

    return bestToken !== "" ? bestToken : this.getCurrentToken();
  }

  public updateTokenRateLimit(token: string, remaining: number, reset: number): void {
    const state = this.tokenStates.get(token) ?? {
      token,
      rateLimitRemaining: 5000,
      rateLimitReset: 0,
      failureCount: 0,
      lastFailure: 0,
    };

    state.rateLimitRemaining = remaining;
    state.rateLimitReset = reset;
    this.tokenStates.set(token, state);

    logger.debug(
      `更新 Token 状态: 剩余 ${remaining.toString()}, 重置于 ${new Date(reset * 1000).toISOString()}`,
    );
  }

  public getGitHubPAT(): string {
    return this.selectBestToken();
  }

  public handleApiError(error: Response): void {
    const currentToken = this.getCurrentToken();

    const remainingHeader = error.headers.get("x-ratelimit-remaining");
    const resetHeader = error.headers.get("x-ratelimit-reset");

    if (error.status === 401 || error.status === 403 || error.status === 429) {
      trackEvent("github_api_error", {
        statusCode: error.status,
        rateLimitRemaining: remainingHeader,
      });
    }

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

        // 无限速响应头时无法记录配额，将剩余配额置 0，避免 selectBestToken 再次选中该 token
        const remaining = remainingHeader !== null ? parseInt(remainingHeader, 10) : 0;
        const reset = resetHeader !== null ? parseInt(resetHeader, 10) : 0;
        this.updateTokenRateLimit(
          currentToken,
          isNaN(remaining) ? 0 : remaining,
          isNaN(reset) ? 0 : reset,
        );

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
