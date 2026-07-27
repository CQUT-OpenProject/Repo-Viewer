/**
 * Shared multi-token rotator for GitHub PATs (client + api).
 */
export class TokenRotator {
  private tokens: string[] = [];
  private currentIndex = 0;
  private failedTokens = new Set<string>();

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
      if (token === undefined || token.length === 0 || this.failedTokens.has(token)) {
        attempts += 1;
        continue;
      }
      return token;
    }

    return "";
  }

  public markTokenFailed(token: string): void {
    if (token.length > 0) {
      this.failedTokens.add(token);
    }
  }

  public isFailed(token: string): boolean {
    return this.failedTokens.has(token);
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
