import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockedAxiosGet } = vi.hoisted(() => ({
  mockedAxiosGet: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    get: mockedAxiosGet,
  },
}));

interface MockResponseState {
  headers: Record<string, string | number>;
  jsonBody: unknown;
  sentBody: unknown;
  statusCode: number;
}

const originalEnv = { ...process.env };
const baseEnv = Object.fromEntries(
  Object.entries(originalEnv).filter(
    ([key]) => !key.startsWith("GITHUB_PAT") && !key.startsWith("VITE_GITHUB_PAT"),
  ),
);

const createMockRes = (): {
  res: {
    status: (code: number) => unknown;
    json: (data: unknown) => unknown;
    send: (data: unknown) => unknown;
    setHeader: (name: string, value: string | number) => unknown;
  };
  state: MockResponseState;
} => {
  const state: MockResponseState = {
    headers: {},
    jsonBody: null,
    sentBody: null,
    statusCode: 200,
  };

  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(data: unknown) {
      state.jsonBody = data;
      return res;
    },
    send(data: unknown) {
      state.sentBody = data;
      return res;
    },
    setHeader(name: string, value: string | number) {
      state.headers[name] = value;
      return res;
    },
  };

  return { res, state };
};

const loadHandler = async (): Promise<(req: unknown, res: unknown) => Promise<void>> => {
  vi.resetModules();
  const mod = await import("./github");
  return mod.default as (req: unknown, res: unknown) => Promise<void>;
};

describe("api/github handler security hardening", () => {
  beforeEach(() => {
    mockedAxiosGet.mockReset();
    process.env = {
      ...baseEnv,
      GITHUB_REPO_OWNER: "test-owner",
      GITHUB_REPO_NAME: "test-repo",
      GITHUB_REPO_BRANCH: "main",
      GITHUB_PAT1: "",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects deprecated getFileContent url parameter", async () => {
    const handler = await loadHandler();
    const { res, state } = createMockRes();

    await handler(
      {
        query: {
          action: "getFileContent",
          url: "https://example.com/test.txt",
        },
      },
      res,
    );

    expect(state.statusCode).toBe(400);
    expect(state.jsonBody).toEqual({
      error: "The url parameter is deprecated. Use path and optional branch instead.",
    });
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it("rejects getFileContent without path", async () => {
    const handler = await loadHandler();
    const { res, state } = createMockRes();

    await handler(
      {
        query: {
          action: "getFileContent",
        },
      },
      res,
    );

    expect(state.statusCode).toBe(400);
    expect(state.jsonBody).toEqual({ error: "Missing path parameter" });
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it("fetches repo files with composed raw URL and auth header", async () => {
    process.env.GITHUB_PAT1 = "secret-token";
    const handler = await loadHandler();
    const { res, state } = createMockRes();

    mockedAxiosGet.mockResolvedValueOnce({
      data: new Uint8Array([65, 66, 67]).buffer,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    } as never);

    await handler(
      {
        query: {
          action: "getFileContent",
          path: "docs/readme.md",
          branch: "main",
        },
      },
      res,
    );

    expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
    const [calledUrl, calledConfig] = mockedAxiosGet.mock.calls[0] ?? [];
    expect(calledUrl).toBe(
      "https://raw.githubusercontent.com/test-owner/test-repo/main/docs/readme.md",
    );
    expect(calledConfig?.maxRedirects).toBe(0);
    expect(calledConfig?.headers?.Authorization).toBe("token secret-token");
    expect(state.statusCode).toBe(200);
    expect(Buffer.isBuffer(state.sentBody)).toBe(true);
  });

  it("rejects getGitHubAsset non-https url", async () => {
    const handler = await loadHandler();
    const { res, state } = createMockRes();

    await handler(
      {
        query: {
          action: "getGitHubAsset",
          url: "http://raw.githubusercontent.com/test-owner/test-repo/main/a.md",
        },
      },
      res,
    );

    expect(state.statusCode).toBe(400);
    expect(state.jsonBody).toEqual({ error: "Only https protocol is allowed" });
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it("rejects getGitHubAsset non-allowlisted host", async () => {
    const handler = await loadHandler();
    const { res, state } = createMockRes();

    await handler(
      {
        query: {
          action: "getGitHubAsset",
          url: "https://example.com/assets/a.png",
        },
      },
      res,
    );

    expect(state.statusCode).toBe(400);
    expect(state.jsonBody).toEqual({ error: "Host is not allowed" });
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it("fetches allowlisted GitHub assets without Authorization", async () => {
    process.env.GITHUB_PAT1 = "secret-token";
    const handler = await loadHandler();
    const { res, state } = createMockRes();

    mockedAxiosGet.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3]).buffer,
      headers: {
        "content-type": "image/png",
      },
    } as never);

    await handler(
      {
        query: {
          action: "getGitHubAsset",
          url: "https://user-images.githubusercontent.com/123/abc.png",
        },
      },
      res,
    );

    expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
    const [, calledConfig] = mockedAxiosGet.mock.calls[0] ?? [];
    expect(calledConfig?.maxRedirects).toBe(0);
    expect(calledConfig?.headers?.Authorization).toBeUndefined();
    expect(state.statusCode).toBe(200);
  });

  it("does not follow getGitHubAsset redirects", async () => {
    const handler = await loadHandler();
    const { res, state } = createMockRes();

    mockedAxiosGet.mockRejectedValueOnce({
      response: {
        status: 302,
      },
      message: "Found",
    });

    await handler(
      {
        query: {
          action: "getGitHubAsset",
          url: "https://raw.githubusercontent.com/test-owner/test-repo/main/file.png",
        },
      },
      res,
    );

    expect(state.statusCode).toBe(302);
    expect(state.jsonBody).toEqual({ error: "Failed to fetch GitHub asset" });
  });
});
