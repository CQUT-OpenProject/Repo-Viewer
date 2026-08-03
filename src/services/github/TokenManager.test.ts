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
});
