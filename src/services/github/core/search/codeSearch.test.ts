import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createAbortError } from "@/utils/network/abort";

vi.mock("@/utils/logging/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { axiosGet } = vi.hoisted(() => ({
  axiosGet: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    get: axiosGet,
  },
}));

vi.mock("@/config", () => ({
  getGithubConfig: () => ({
    repoOwner: "owner",
    repoName: "repo",
    repoBranch: "master",
  }),
}));

import { searchCodeWithApi } from "./codeSearch";

describe("searchCodeWithApi", () => {
  beforeEach(() => {
    axiosGet.mockReset();
  });

  it("空关键词直接返回空数组，不发起请求", async () => {
    const results = await searchCodeWithApi({ keyword: "   ", branch: "main" });

    expect(results).toEqual([]);
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it("构造正确的查询参数并映射结果", async () => {
    axiosGet.mockResolvedValue({
      data: {
        status: "success",
        data: {
          totalCount: 1,
          items: [
            {
              name: "guide.md",
              path: "docs/guide.md",
              sha: "abc123",
              htmlUrl: "https://example.com/1",
              textMatches: [{ fragment: "前端\n  hello   world  后端" }],
            },
            {
              path: "/notes/notes.md",
              name: "",
              textMatches: [{ fragment: "" }],
            },
          ],
        },
      },
    });

    const results = await searchCodeWithApi({
      keyword: "hello",
      branch: "main",
      pathPrefix: "docs",
      extensions: ["md", ".TS"],
      limit: 50,
    });

    expect(axiosGet).toHaveBeenCalledTimes(1);
    const [url, config] = axiosGet.mock.calls[0] ?? [];
    expect(url).toContain("action=searchCode");
    expect(url).toContain("keyword=hello");
    expect(url).toContain("pathPrefix=docs");
    expect(url).toContain("extensions=md%2Cts");
    expect(url).toContain("limit=50");
    expect(config).toEqual({ signal: undefined });

    expect(results).toHaveLength(2);
    const first = results[0];
    expect(first).toEqual({
      branch: "main",
      path: "docs/guide.md",
      name: "guide.md",
      extension: "md",
      sha: "abc123",
      snippet: "前端 hello world 后端",
      htmlUrl: "https://github.com/owner/repo/blob/main/docs/guide.md",
      downloadUrl: "https://raw.githubusercontent.com/owner/repo/main/docs/guide.md",
    });

    const second = results[1];
    expect(second?.name).toBe("notes.md");
    expect(second?.extension).toBe("md");
    expect(second?.snippet).toBeUndefined();
    expect(second?.htmlUrl).toBe("https://github.com/owner/repo/blob/main/notes/notes.md");
  });

  it("分支名与路径含特殊字符时进行 URL 编码", async () => {
    axiosGet.mockResolvedValue({
      data: {
        status: "success",
        data: { items: [{ name: "a b.md", path: "dir/a b.md" }] },
      },
    });

    const results = await searchCodeWithApi({ keyword: "x", branch: "feat/1.0" });

    expect(results[0]?.htmlUrl).toBe("https://github.com/owner/repo/blob/feat/1.0/dir/a%20b.md");
  });

  it("服务端返回非 success 时抛出格式错误", async () => {
    axiosGet.mockResolvedValue({
      data: { status: "error", message: "限速" },
    });

    await expect(searchCodeWithApi({ keyword: "hello", branch: "main" })).rejects.toThrow(
      "Code Search 响应格式错误",
    );
  });

  it("包装 axios 错误并保留原因信息", async () => {
    axiosGet.mockRejectedValue(new Error("network down"));

    await expect(searchCodeWithApi({ keyword: "hello", branch: "main" })).rejects.toThrow(
      "Code Search 搜索失败: network down",
    );
  });

  it("非 Error 的异常也能被安全包装", async () => {
    axiosGet.mockRejectedValue("boom");

    await expect(searchCodeWithApi({ keyword: "hello", branch: "main" })).rejects.toThrow(
      "Code Search 搜索失败: boom",
    );
  });

  it("透传 AbortError", async () => {
    axiosGet.mockRejectedValue(createAbortError("Request aborted"));

    await expect(searchCodeWithApi({ keyword: "hello", branch: "main" })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("透传 limit 参数（服务端负责钳制）", async () => {
    axiosGet.mockResolvedValue({
      data: { status: "success", data: { items: [] } },
    });

    await searchCodeWithApi({ keyword: "hello", branch: "main", limit: 500 });

    const [url] = axiosGet.mock.calls[0] ?? [];
    expect(url).toContain("limit=500");
  });
});
