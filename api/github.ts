import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios, { type AxiosResponse } from "axios";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  brightWhite: "\x1b[97m",
  gray: "\x1b[90m",
};

// 配置常量
const GITHUB_API_BASE = "https://api.github.com";

const parseBooleanFlag = (value?: string | null): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const resolveBooleanFlag = (keys: string[]): boolean =>
  keys.some((key) => parseBooleanFlag(process.env[key]));

const developerModeEnabled = resolveBooleanFlag(["DEVELOPER_MODE", "VITE_DEVELOPER_MODE"]);
const consoleLoggingEnabled = resolveBooleanFlag(["CONSOLE_LOGGING", "VITE_CONSOLE_LOGGING"]);

type LogLevel = "info" | "warn" | "error";

const shouldLog = (level: LogLevel): boolean => {
  switch (level) {
    case "info":
      return developerModeEnabled;
    case "warn":
    case "error":
      return developerModeEnabled || consoleLoggingEnabled;
    default:
      return developerModeEnabled;
  }
};

const getTimestamp = (): string => {
  const now = new Date();
  return now.toLocaleTimeString("zh-CN", { hour12: false });
};

const apiLogger = {
  info: (...args: unknown[]): void => {
    if (shouldLog("info")) {
      // 开发者模式下允许使用 console.log
      // oxlint-disable-next-line no-console
      console.log(
        `${colors.dim}${getTimestamp()}${colors.reset}`,
        `${colors.bright}${colors.cyan}[api]${colors.reset}`,
        ...args,
      );
    }
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog("warn")) {
      console.warn(
        `${colors.dim}${getTimestamp()}${colors.reset}`,
        `${colors.bright}${colors.yellow}[api]${colors.reset}`,
        ...args,
      );
    }
  },
  error: (...args: unknown[]): void => {
    if (shouldLog("error")) {
      console.error(
        `${colors.dim}${getTimestamp()}${colors.reset}`,
        `${colors.bright}${colors.red}[api]${colors.reset}`,
        ...args,
      );
    }
  },
};

// GitHub Token管理器
class GitHubTokenManager {
  private tokens: string[] = [];
  private currentIndex = 0;
  private failedTokens = new Set<string>();

  constructor() {
    this.loadTokensFromEnv();
  }

  private loadTokensFromEnv(): void {
    // 清空现有token
    this.tokens = [];

    try {
      // 尝试查找环境变量中的所有PAT
      const envKeys = Object.keys(process.env);
      const patKeys = envKeys.filter((key) => {
        if (!(key.startsWith("GITHUB_PAT") || key.startsWith("VITE_GITHUB_PAT"))) {
          return false;
        }
        const value = process.env[key];
        return value !== undefined && value.trim().length > 0;
      });

      // 收集所有有效的PAT
      this.tokens = patKeys
        .map((key) => process.env[key])
        .filter((token): token is string => token !== undefined && token.trim().length > 0);

      apiLogger.info(
        `${colors.green}Loaded${colors.reset} ${colors.brightWhite}${String(this.tokens.length)}${colors.reset} GitHub token(s)`,
      );
    } catch (error) {
      apiLogger.error(`${colors.red}Failed to load GitHub tokens:${colors.reset}`, error);
    }
  }

  public getCurrentToken(): string {
    if (this.tokens.length === 0) {
      return "";
    }
    const token = this.tokens[this.currentIndex];
    return token ?? "";
  }

  public getNextToken(): string {
    if (this.tokens.length === 0) {
      return "";
    }

    // 轮换到下一个有效的令牌
    let attempts = 0;
    while (attempts < this.tokens.length) {
      this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
      const token = this.tokens[this.currentIndex];

      // 跳过已知失败的令牌
      if (token !== undefined && token.length > 0 && this.failedTokens.has(token)) {
        attempts++;
        continue;
      }

      return token ?? "";
    }

    // 如果所有令牌都失败，重置并返回第一个令牌
    this.failedTokens.clear();
    this.currentIndex = 0;
    const firstToken = this.tokens[0];
    return firstToken ?? "";
  }

  public markTokenFailed(token: string): void {
    this.failedTokens.add(token);
  }

  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  public getTokenCount(): number {
    return this.tokens.length;
  }

  public getTokenStatus(): { hasTokens: boolean; count: number } {
    return {
      hasTokens: this.hasTokens(),
      count: this.getTokenCount(),
    };
  }
}

// 创建token管理器实例
const tokenManager = new GitHubTokenManager();

const normalizeEnvValue = (value?: string | null): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveEnvValue = (keys: string[], fallback = ""): string => {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key]);
    if (value !== undefined && value.length > 0) {
      return value;
    }
  }
  return fallback;
};

interface RepoEnvConfig {
  repoOwner: string;
  repoName: string;
  repoBranch: string;
}

const getRepoEnvConfig = (): RepoEnvConfig => {
  const branch = resolveEnvValue(["GITHUB_REPO_BRANCH", "VITE_GITHUB_REPO_BRANCH"], "main");
  return {
    repoOwner: resolveEnvValue(["GITHUB_REPO_OWNER", "VITE_GITHUB_REPO_OWNER"]),
    repoName: resolveEnvValue(["GITHUB_REPO_NAME", "VITE_GITHUB_REPO_NAME"]),
    repoBranch: branch.length > 0 ? branch : "main",
  };
};

const getSearchIndexRepoEnvConfig = (): RepoEnvConfig => getRepoEnvConfig();

const encodePathSegments = (input: string): string =>
  input
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const getSingleQueryParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
};

const parseBranchOverride = (value: string | string[] | undefined): string | undefined => {
  const param = getSingleQueryParam(value);
  if (param === undefined) {
    return undefined;
  }

  const trimmed = param.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parsePositiveInt = (
  value: string | string[] | undefined,
  fallback: number,
  maxValue?: number,
): number => {
  const param = getSingleQueryParam(value);
  if (param === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(param, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  if (maxValue !== undefined) {
    return Math.min(parsed, maxValue);
  }

  return parsed;
};

// 构建认证头
function getAuthHeaders(): Record<string, string> {
  const token = tokenManager.getCurrentToken();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Repo-Viewer",
  };

  if (token.length > 0) {
    headers["Authorization"] = `token ${token}`;
  }

  return headers;
}

// Axios 错误响应接口
interface AxiosErrorResponse {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// 处理API请求失败
async function handleRequestWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    const axiosError = error as AxiosErrorResponse;
    // 检查是否是认证错误或速率限制错误
    const responseStatus = axiosError.response?.status;
    if (responseStatus !== undefined && (responseStatus === 401 || responseStatus === 403)) {
      apiLogger.warn("Token authentication failed or rate limit reached, rotating token...");
      const currentToken = tokenManager.getCurrentToken();
      if (currentToken.length > 0) {
        tokenManager.markTokenFailed(currentToken);
      }

      // 获取新令牌并重试
      const newToken = tokenManager.getNextToken();
      if (newToken.length > 0 && newToken !== currentToken) {
        apiLogger.info("Rotated to new token");
        return requestFn(); // 使用新令牌重试
      }
    }

    // 其他错误或没有可用令牌，抛出异常
    throw error;
  }
}

/**
 * GitHub API请求处理函数
 *
 * 统一处理所有GitHub相关的API请求，包括获取内容、搜索、分支列表等。
 * 支持token管理和自动轮换。
 *
 * @param req - Vercel请求对象
 * @param res - Vercel响应对象
 * @returns Promise，处理完成后解析
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { action, path, url, branch, page, per_page } = req.query;

    const actionParam = Array.isArray(action) ? action[0] : action;

    if (actionParam === undefined || actionParam.length === 0) {
      res.status(400).json({ error: "Missing action parameter" });
      return;
    }

    // 获取配置信息 - 新增API
    if (actionParam === "getConfig") {
      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();
      res.status(200).json({
        status: "success",
        data: {
          repoOwner,
          repoName,
          repoBranch,
        },
      });
      return;
    }

    // 获取令牌状态 - 新增API
    if (actionParam === "getTokenStatus") {
      res.status(200).json({
        status: "success",
        data: tokenManager.getTokenStatus(),
      });
      return;
    }

    if (actionParam === "getBranches") {
      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();

      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: "Repository configuration missing",
          message: "Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variable",
        });
        return;
      }

      const perPageValue = parsePositiveInt(per_page, 100, 100);
      const pageValue = parsePositiveInt(page, 1);

      const query = new URLSearchParams();
      query.set("per_page", perPageValue.toString());
      query.set("page", pageValue.toString());

      const apiPath = `/repos/${repoOwner}/${repoName}/branches?${query.toString()}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(`${GITHUB_API_BASE}${apiPath}`, {
            headers: getAuthHeaders(),
          }),
        );

        res.status(200).json({
          status: "success",
          data: {
            defaultBranch: repoBranch.length > 0 ? repoBranch : "main",
            branches: response.data,
          },
        });
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error("Failed to fetch branch list:", axiosError.message ?? "Unknown error");

        res.status(axiosError.response?.status ?? 500).json({
          error: "Failed to fetch branch list",
          message: axiosError.message ?? "Unknown error",
        });
        return;
      }
    }

    if (actionParam === "getGitRef") {
      const refParam = getSingleQueryParam(req.query["ref"]);
      if (refParam === undefined || refParam.trim().length === 0) {
        res.status(400).json({ error: "Missing ref parameter" });
        return;
      }

      const repoScopeParam = getSingleQueryParam(req.query["repoScope"]);
      const useSearchIndexRepo = repoScopeParam?.toLowerCase() === "search-index";
      const { repoOwner, repoName } = useSearchIndexRepo
        ? getSearchIndexRepoEnvConfig()
        : getRepoEnvConfig();
      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: "Repository configuration missing",
          message: "Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variable",
        });
        return;
      }

      const encodedRef = encodePathSegments(refParam);

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get(`${GITHUB_API_BASE}/repos/${repoOwner}/${repoName}/git/ref/${encodedRef}`, {
            headers: getAuthHeaders(),
          }),
        );

        res.status(200).json(response.data);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        const status = axiosError.response?.status ?? 500;

        if (status === 404) {
          res.status(404).json({ error: "ref_not_found" });
          return;
        }

        apiLogger.error("Failed to fetch Git ref:", axiosError.message ?? "Unknown error");
        res.status(status).json({
          error: "Failed to fetch Git ref",
          message: axiosError.message ?? "Unknown error",
        });
        return;
      }
    }

    if (actionParam === "getTree") {
      const branchParam = getSingleQueryParam(req.query["branch"]);
      if (branchParam === undefined || branchParam.trim().length === 0) {
        res.status(400).json({ error: "Missing branch parameter" });
        return;
      }

      const recursiveParam = getSingleQueryParam(req.query["recursive"]);
      const recursive = recursiveParam !== undefined ? parseBooleanFlag(recursiveParam) : false;

      const { repoOwner, repoName } = getRepoEnvConfig();
      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: "Repository configuration missing",
          message: "Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variable",
        });
        return;
      }

      const encodedBranch = encodePathSegments(branchParam.trim());
      const queryString = recursive ? "?recursive=1" : "";

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get(
            `${GITHUB_API_BASE}/repos/${repoOwner}/${repoName}/git/trees/${encodedBranch}${queryString}`,
            {
              headers: getAuthHeaders(),
            },
          ),
        );

        res.status(200).json(response.data);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        const status = axiosError.response?.status ?? 500;

        apiLogger.error("Failed to fetch Git tree:", axiosError.message ?? "Unknown error");
        res.status(status).json({
          error: "Failed to fetch Git tree",
          message: axiosError.message ?? "Unknown error",
        });
        return;
      }
    }

    if (actionParam === "getSearchIndexAsset") {
      const indexBranchParam = parseBranchOverride(req.query["indexBranch"]) ?? "RV-Index";
      const pathParam = getSingleQueryParam(req.query["path"]);
      const responseTypeParam = (
        getSingleQueryParam(req.query["responseType"]) ?? "json"
      ).toLowerCase();

      if (pathParam === undefined || pathParam.trim().length === 0) {
        res.status(400).json({ error: "Missing path parameter" });
        return;
      }

      const { repoOwner, repoName } = getSearchIndexRepoEnvConfig();
      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: "Repository configuration missing",
          message: "Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variable",
        });
        return;
      }

      const encodedBranch = encodePathSegments(indexBranchParam);
      const normalizedPath = pathParam.replace(/^\/+/, "");
      const encodedPath = encodePathSegments(normalizedPath);
      const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${encodedBranch}/${encodedPath}`;

      try {
        const normalizedPath = pathParam.replace(/^\/+/, "");
        const isWasm = normalizedPath.toLowerCase().endsWith(".wasm");
        const isJavascript = normalizedPath.toLowerCase().endsWith(".js");

        if (responseTypeParam === "binary") {
          const response = await handleRequestWithRetry(() =>
            axios.get<ArrayBuffer>(rawUrl, {
              headers: getAuthHeaders(),
              responseType: "arraybuffer",
            }),
          );

          res.setHeader("Content-Type", isWasm ? "application/wasm" : "application/octet-stream");
          res.status(200).send(Buffer.from(response.data));
          return;
        }

        if (responseTypeParam === "text") {
          const response = await handleRequestWithRetry(() =>
            axios.get<string>(rawUrl, {
              headers: getAuthHeaders(),
              responseType: "text",
            }),
          );

          if (isJavascript) {
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          } else {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
          }
          res.status(200).send(response.data);
          return;
        }

        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(rawUrl, {
            headers: getAuthHeaders(),
            responseType: "json",
          }),
        );

        res.status(200).json(response.data);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        const status = axiosError.response?.status ?? 500;

        if (status === 404) {
          res.status(404).json({ error: "Index file not found" });
          return;
        }

        apiLogger.error("Failed to fetch index asset:", axiosError.message ?? "Unknown error");
        res.status(status).json({
          error: "Failed to fetch index asset",
          message: axiosError.message ?? "Unknown error",
        });
        return;
      }
    }

    // 获取仓库内容
    if (actionParam === "getContents") {
      if (typeof path !== "string") {
        res.status(400).json({ error: "Missing path parameter" });
        return;
      }

      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();
      const branchOverride = parseBranchOverride(branch);

      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: "Repository configuration missing",
          message: "Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variable",
        });
        return;
      }

      const branchToUse = branchOverride ?? (repoBranch.length > 0 ? repoBranch : "main");
      const encodedBranch = encodeURIComponent(branchToUse);

      // 处理空路径
      const pathSegment = path === "" ? "" : `/${path}`;
      const apiPath = `/repos/${repoOwner}/${repoName}/contents${pathSegment}?ref=${encodedBranch}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(`${GITHUB_API_BASE}${apiPath}`, {
            headers: getAuthHeaders(),
          }),
        );

        res.status(200).json(response.data);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error("GitHub API request failed:", axiosError.message ?? "Unknown error");

        res.status(axiosError.response?.status ?? 500).json({
          error: "Failed to fetch content",
          message: axiosError.message ?? "Unknown error",
        });
        return;
      }
    }

    // 获取文件内容
    if (actionParam === "getFileContent") {
      const urlParam = Array.isArray(url) ? (url.length > 0 ? url[0] : undefined) : url;
      if (typeof urlParam !== "string" || urlParam.trim().length === 0) {
        res.status(400).json({ error: "Missing url parameter" });
        return;
      }

      const urlString = urlParam;
      try {
        const headers = {
          ...getAuthHeaders(),
          Accept: "application/vnd.github.v3.raw",
        };

        const response = await handleRequestWithRetry<AxiosResponse<ArrayBuffer>>(() =>
          axios.get<ArrayBuffer>(urlString, {
            headers,
            responseType: "arraybuffer",
          }),
        );

        const getHeader = (name: string): string | undefined => {
          if (typeof response.headers.get === "function") {
            const value = response.headers.get(name);
            return typeof value === "string" ? value : undefined;
          }
          const rawValue = (response.headers as Record<string, unknown>)[name];
          return typeof rawValue === "string" ? rawValue : undefined;
        };

        const upstreamContentType = getHeader("content-type");
        const upstreamContentLength = getHeader("content-length");
        const upstreamDisposition = getHeader("content-disposition");
        const upstreamCacheControl = getHeader("cache-control");

        res.setHeader("Content-Type", upstreamContentType ?? "application/octet-stream");
        if (upstreamContentLength !== undefined) {
          res.setHeader("Content-Length", upstreamContentLength);
        }
        if (upstreamDisposition !== undefined) {
          res.setHeader("Content-Disposition", upstreamDisposition);
        }
        if (upstreamCacheControl !== undefined) {
          res.setHeader("Cache-Control", upstreamCacheControl);
        }

        const buffer = Buffer.from(response.data);
        res.status(200).send(buffer);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        const decodedUrl = (() => {
          try {
            return decodeURIComponent(urlString);
          } catch {
            return urlString;
          }
        })();
        apiLogger.error(
          "Failed to fetch file content:",
          decodedUrl,
          axiosError.message ?? "Unknown error",
        );
        res.status(axiosError.response?.status ?? 500).json({
          error: "Failed to fetch file content",
          message: axiosError.message ?? "Unknown error",
        });
        return;
      }
    }

    // 搜索仓库
    if (actionParam === "search") {
      const { q, sort, order } = req.query;

      // 规范化查询参数
      const qParam = Array.isArray(q) ? (q.length > 0 ? q[0] : "") : (q ?? "");
      if (qParam === undefined || qParam.trim() === "") {
        res.status(400).json({ error: "Missing search parameter" });
        return;
      }

      const { repoOwner, repoName } = getRepoEnvConfig();

      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: "Repository configuration missing",
          message: "Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variable",
        });
        return;
      }

      const repoQualifier = `repo:${repoOwner}/${repoName}`;
      const searchQuery = qParam.includes(repoQualifier) ? qParam : `${repoQualifier} ${qParam}`;

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(`${GITHUB_API_BASE}/search/code`, {
            headers: getAuthHeaders(),
            params: {
              q: searchQuery,
              sort: (Array.isArray(sort) ? sort[0] : sort) ?? "best-match",
              order: (Array.isArray(order) ? order[0] : order) ?? "desc",
            },
          }),
        );

        res.status(200).json(response.data);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error("GitHub search API request failed:", axiosError.message ?? "Unknown error");
        res.status(axiosError.response?.status ?? 500).json({
          error: "Search failed",
          message: axiosError.message ?? "Unknown error",
        });
        return;
      }
    }

    // 未知操作
    res.status(400).json({ error: "Unsupported operation" });
  } catch (error) {
    const axiosError = error as AxiosErrorResponse;
    apiLogger.error("API request processing error:", error);
    let message = "An error occurred while processing the request";

    const response = axiosError.response;
    if (response !== undefined) {
      const status = response.status;
      const statusStr = String(status);
      message = `GitHub API error (${statusStr}): ${response.data?.message ?? "Unknown error"}`;
    } else {
      const errorMsg = axiosError.message;
      if (errorMsg !== undefined && errorMsg.length > 0) {
        message = errorMsg;
      }
    }

    res.status(500).json({ error: message });
  }
}
