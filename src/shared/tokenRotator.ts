/**
 * Shared multi-token rotator for GitHub PATs (client + api).
 */
export class TokenRotator {
  /** 失败退避时长，与 TokenManager.BACKOFF_DURATION 保持一致 */
  private static readonly FAILURE_BACKOFF_MS = 300000;

  private tokens: string[] = [];
  private currentIndex = 0;
  private failedTokens = new Map<string, number>();

  public setTokens(tokens: string[]): void {
    this.tokens = [...new Set(tokens.map((t) => t.trim()).filter((t) => t.length > 0))];
    this.currentIndex = 0;
    this.failedTokens.clear();
  }

  public getTokens(): readonly string[] {
    return this.tokens;
  }

  public getCurrentToken(): string {
    if (this.tokens.length === 0) {
      return "";
    }
    return this.tokens[this.currentIndex] ?? "";
  }

  public getNextToken(): string {
    if (this.tokens.length === 0) {
      return "";
    }

    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];
      if (token === undefined || token.length === 0 || this.isFailed(token)) {
        attempts += 1;
        continue;
      }
      return token;
    }

    return "";
  }

  public markTokenFailed(token: string): void {
    if (token.length > 0) {
      this.failedTokens.set(token, Date.now());
    }
  }

  public isFailed(token: string): boolean {
    const failedAt = this.failedTokens.get(token);
    if (failedAt === undefined) {
      return false;
    }
    if (Date.now() - failedAt >= TokenRotator.FAILURE_BACKOFF_MS) {
      this.failedTokens.delete(token);
      return false;
    }
    return true;
  }

  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  public getTokenCount(): number {
    return this.tokens.length;
  }

  /** Set current index to a known token (used by smart selector). */
  public setCurrentToken(token: string): boolean {
    const index = this.tokens.indexOf(token);
    if (index === -1) {
      return false;
    }
    this.currentIndex = index;
    return true;
  }
}
