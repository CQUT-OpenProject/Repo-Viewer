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

class TokenRotator {
  private tokens: string[] = [];
  private currentIndex = 0;
  private failedTokens = new Set<string>();

  public setTokens(tokens: string[]): void {
    this.tokens = [...new Set(tokens.map((t) => t.trim()).filter((t) => t.length > 0))];
    this.currentIndex = 0;
    this.failedTokens.clear();
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

  public hasTokens(): boolean {
    return this.tokens.length > 0;
  }

  public getTokenCount(): number {
    return this.tokens.length;
  }
}

// 配置常量
const GITHUB_API_BASE = "https://api.github.com";
const PROXY_REQUEST_TIMEOUT_MS = 15000;
const GITHUB_ASSET_ALLOWED_HOSTS = new Set([
  "api.github.com",
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "objects.githubusercontent.com",
  "avatars.githubusercontent.com",
  "camo.githubusercontent.com",
  "media.githubusercontent.com",
  "github.githubassets.com",
]);

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

class ApiTokenManager {
  private readonly rotator = new TokenRotator();

  constructor() {
    this.loadTokensFromEnv();
  }

  private loadTokensFromEnv(): void {
    try {
      const envKeys = Object.keys(process.env);
      const tokens = envKeys
        .filter((key) => key.startsWith("GITHUB_PAT") || key.startsWith("VITE_GITHUB_PAT"))
        .map((key) => process.env[key])
        .filter((token): token is string => token !== undefined && token.trim().length > 0);
      this.rotator.setTokens(tokens);
      apiLogger.info(
        `${colors.green}Loaded${colors.reset} ${colors.brightWhite}${String(this.rotator.getTokenCount())}${colors.reset} GitHub token(s)`,
      );
    } catch (error) {
      apiLogger.error(`${colors.red}Failed to load GitHub tokens:${colors.reset}`, error);
    }
  }

  public getCurrentToken(): string {
    return this.rotator.getCurrentToken();
  }

  public getNextToken(): string {
    return this.rotator.getNextToken();
  }

  public markTokenFailed(token: string): void {
    this.rotator.markTokenFailed(token);
  }

  public hasTokens(): boolean {
    return this.rotator.hasTokens();
  }

  public getTokenCount(): number {
    return this.rotator.getTokenCount();
  }
}

const tokenManager = new ApiTokenManager();

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

const parseListParam = (value: string | string[] | undefined): string[] => {
  const raw = getSingleQueryParam(value);
  if (raw === undefined) {
    return [];
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

// 构造 GitHub Code Search 查询语句
const buildCodeSearchQuery = (
  repoOwner: string,
  repoName: string,
  keyword: string,
  pathPrefix = "",
  extensions: string[] = [],
): string => {
  const parts = [`repo:${repoOwner}/${repoName}`, keyword];
  const normalizedPrefix = pathPrefix.trim().replace(/^\/+/, "");
  if (normalizedPrefix.length > 0) {
    const prefixWithSlash = normalizedPrefix.endsWith("/")
      ? normalizedPrefix
      : `${normalizedPrefix}/`;
    parts.push(`path:${prefixWithSlash}`);
  }
  for (const extension of extensions) {
    parts.push(`extension:${extension}`);
  }
  return parts.join(" ");
};

// 归一化 Code Search 响应项，仅保留前端需要的字段
const normalizeCodeSearchItems = (items: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  const normalized: Record<string, unknown>[] = [];
  for (const item of items) {
    if (item === null || typeof item !== "object") {
      continue;
    }
    const raw = item as Record<string, unknown>;
    const textMatches: { fragment: string }[] = [];
    if (Array.isArray(raw["text_matches"])) {
      for (const match of raw["text_matches"]) {
        if (match === null || typeof match !== "object") {
          continue;
        }
        const fragment = (match as Record<string, unknown>)["fragment"];
        if (typeof fragment === "string" && fragment.length > 0) {
          textMatches.push({ fragment });
        }
      }
    }
    normalized.push({
      name: typeof raw["name"] === "string" ? raw["name"] : "",
      path: typeof raw["path"] === "string" ? raw["path"] : "",
      sha: typeof raw["sha"] === "string" ? raw["sha"] : "",
      htmlUrl: typeof raw["html_url"] === "string" ? raw["html_url"] : "",
      textMatches,
    });
  }
  return normalized;
};

const isAllowedGitHubAssetHost = (hostname: string): boolean =>
  GITHUB_ASSET_ALLOWED_HOSTS.has(hostname.toLowerCase());

const getPublicGitHubHeaders = (accept: string): Record<string, string> => ({
  Accept: accept,
  "User-Agent": "Repo-Viewer",
});

const getResponseHeader = (
  responseHeaders: AxiosResponse<ArrayBuffer>["headers"],
  name: string,
): string | undefined => {
  const normalizedName = name.toLowerCase();
  if (typeof responseHeaders.get === "function") {
    const value = responseHeaders.get(normalizedName);
    return typeof value === "string" ? value : undefined;
  }

  const rawHeaders = responseHeaders as Record<string, unknown>;
  const direct = rawHeaders[normalizedName];
  if (typeof direct === "string") {
    return direct;
  }

  const fallback = rawHeaders[name];
  return typeof fallback === "string" ? fallback : undefined;
};

const copyFileResponseHeaders = (
  res: VercelResponse,
  response: AxiosResponse<ArrayBuffer>,
): void => {
  const upstreamContentType = getResponseHeader(response.headers, "content-type");
  const upstreamContentLength = getResponseHeader(response.headers, "content-length");
  const upstreamDisposition = getResponseHeader(response.headers, "content-disposition");
  const upstreamCacheControl = getResponseHeader(response.headers, "cache-control");

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

      const { repoOwner, repoName } = getRepoEnvConfig();
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

    if (actionParam === "searchCode") {
      const keywordParam = getSingleQueryParam(req.query["keyword"]);
      if (keywordParam === undefined || keywordParam.trim().length === 0) {
        res.status(400).json({ error: "Missing keyword parameter" });
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

      const pathPrefix = getSingleQueryParam(req.query["pathPrefix"]) ?? "";
      const extensions = parseListParam(req.query["extensions"]);
      const limit = parsePositiveInt(req.query["limit"], 100, 100);
      const perPage = Math.max(1, Math.min(limit, 100));

      const query = buildCodeSearchQuery(
        repoOwner,
        repoName,
        keywordParam.trim(),
        pathPrefix,
        extensions,
      );

      try {
        const response = await handleRequestWithRetry(() =>
          axios.get<unknown>(`${GITHUB_API_BASE}/search/code`, {
            headers: {
              ...getAuthHeaders(),
              Accept: "application/vnd.github.text-match+json",
            },
            params: {
              q: query,
              per_page: perPage,
            },
          }),
        );

        const payload = response.data as { total_count?: number; items?: unknown };
        res.status(200).json({
          status: "success",
          data: {
            totalCount: typeof payload.total_count === "number" ? payload.total_count : 0,
            items: normalizeCodeSearchItems(payload.items),
          },
        });
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        const status = axiosError.response?.status ?? 500;

        if (status === 403 || status === 429) {
          apiLogger.warn("Code search rate limited or permission denied");
          res.status(429).json({
            error: "Code search rate limit reached",
            message: "GitHub 搜索限速或权限不足，请稍后重试",
          });
          return;
        }

        apiLogger.error("Failed to search code:", axiosError.message ?? "Unknown error");
        res.status(status).json({
          error: "Failed to search code",
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
      if (typeof getSingleQueryParam(url) === "string") {
        res.status(400).json({
          error: "The url parameter is deprecated. Use path and optional branch instead.",
        });
        return;
      }

      const pathParam = getSingleQueryParam(path);
      if (pathParam === undefined || pathParam.trim().length === 0) {
        res.status(400).json({ error: "Missing path parameter" });
        return;
      }

      const { repoOwner, repoName, repoBranch } = getRepoEnvConfig();
      if (repoOwner.length === 0 || repoName.length === 0) {
        res.status(500).json({
          error: "Repository configuration missing",
          message: "Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variable",
        });
        return;
      }

      const branchToUse =
        parseBranchOverride(branch) ?? (repoBranch.length > 0 ? repoBranch : "main");
      const normalizedPath = pathParam.trim().replace(/^\/+/u, "");
      if (normalizedPath.length === 0) {
        res.status(400).json({ error: "Missing path parameter" });
        return;
      }

      const encodedBranch = encodePathSegments(branchToUse);
      const encodedPath = encodePathSegments(normalizedPath);
      const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${encodedBranch}/${encodedPath}`;

      try {
        const headers = {
          ...getAuthHeaders(),
          Accept: "application/vnd.github.v3.raw",
        };

        const response = await handleRequestWithRetry<AxiosResponse<ArrayBuffer>>(() =>
          axios.get<ArrayBuffer>(rawUrl, {
            headers,
            responseType: "arraybuffer",
            timeout: PROXY_REQUEST_TIMEOUT_MS,
            maxRedirects: 0,
          }),
        );

        copyFileResponseHeaders(res, response);
        const buffer = Buffer.from(response.data);
        res.status(200).send(buffer);
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        apiLogger.error(
          "Failed to fetch file content:",
          `${branchToUse}/${normalizedPath}`,
          axiosError.message ?? "Unknown error",
        );
        res.status(axiosError.response?.status ?? 500).json({
          error: "Failed to fetch file content",
        });
        return;
      }
    }

    // 获取 GitHub 静态资源（禁止带认证头）
    if (actionParam === "getGitHubAsset") {
      const urlParam = getSingleQueryParam(url);
      if (urlParam === undefined || urlParam.trim().length === 0) {
        res.status(400).json({ error: "Missing url parameter" });
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(urlParam);
      } catch {
        res.status(400).json({ error: "Invalid url parameter" });
        return;
      }

      if (parsedUrl.protocol !== "https:") {
        res.status(400).json({ error: "Only https protocol is allowed" });
        return;
      }

      if (!isAllowedGitHubAssetHost(parsedUrl.hostname)) {
        res.status(400).json({ error: "Host is not allowed" });
        return;
      }

      try {
        const response = await axios.get<ArrayBuffer>(parsedUrl.toString(), {
          headers: getPublicGitHubHeaders("application/vnd.github.v3.raw"),
          responseType: "arraybuffer",
          timeout: PROXY_REQUEST_TIMEOUT_MS,
          maxRedirects: 0,
        });

        copyFileResponseHeaders(res, response);
        res.status(200).send(Buffer.from(response.data));
        return;
      } catch (error) {
        const axiosError = error as AxiosErrorResponse;
        const status = axiosError.response?.status ?? 500;
        apiLogger.error(
          "Failed to fetch GitHub asset:",
          parsedUrl.toString(),
          axiosError.message ?? "Unknown error",
        );
        res.status(status).json({
          error: "Failed to fetch GitHub asset",
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
