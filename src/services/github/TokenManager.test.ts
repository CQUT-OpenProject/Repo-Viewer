import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubTokenManager } from "./TokenManager";

vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return {
    ...actual,
    getGithubPATs: () => ["pat-a", "pat-b"],
    isTokenMode: () => true,
    EnvParser: { ...actual.EnvParser, validateToken: () => true },
  };
});

const makeErrorResponse = (status: number): Response =>
  new Response(null, {
    status,
    headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "9999999999" },
  });

describe("GitHubTokenManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attributes an API failure to the token that actually made the request", () => {
    const manager = new GitHubTokenManager();

    // 无 rate-limit 状态时 selectBestToken 始终选中 pat-a（第一个 token）
    let lastToken = "";
    for (let i = 0; i < 32; i += 1) {
      lastToken = manager.getGitHubPAT();
    }
    expect(lastToken).toBe("pat-a");

    // pat-a 是实际发起请求的 token，现在它返回 401
    manager.handleApiError(makeErrorResponse(401));

    // 修复后：pat-a 被退避，下一次应选用健康的 pat-b
    expect(manager.getGitHubPAT()).toBe("pat-b");
  });

  it("degrades the throttled token when a 429 arrives without rate-limit headers", () => {
    const manager = new GitHubTokenManager();

    expect(manager.getGitHubPAT()).toBe("pat-a");

    // 429 响应不带 x-ratelimit-* 头（如 raw 代理/CDN 场景），无法自动记录配额
    const throttledResponse = new Response(null, { status: 429 });
    manager.handleApiError(throttledResponse);

    // 轮换后的下一次选择不应再次选中已被限流的 pat-a
    expect(manager.getGitHubPAT()).toBe("pat-b");
  });
});
