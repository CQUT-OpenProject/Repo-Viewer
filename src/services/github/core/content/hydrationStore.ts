// noinspection HttpUrlsUsage

import type {
  GitHubContent,
  InitialContentDirectoryEntry,
  InitialContentFileEntry,
  InitialContentHydrationPayload,
} from "@/types";
import { logger } from "@/utils";

import { filterAndNormalizeGitHubContents } from "../../schemas";
import { storeDirectoryContents, storeFileContent } from "./cacheState";
import { normalizeDirectoryPath, normalizeFilePath, escapeRegExp } from "./pathUtils";

/**
 * 首屏注水状态管理
 *
 * 负责在构建阶段注入的目录/文件数据的落盘、消费与生命周期维护。
 * 当真实接口请求到来时，优先返回这些预置数据，同时与缓存层协作，确保体验流畅。
 */

type DirectoryStoreKey = string;
type FileStoreKey = string;

interface HydratedFileEntry {
  path: string;
  content: string;
  downloadUrl?: string | null;
  sha?: string;
}

export const INITIAL_CONTENT_EXCLUDE_FILES = [".gitkeep", "Thumbs.db", ".DS_Store"] as const;

const initialDirectoryStore = new Map<DirectoryStoreKey, GitHubContent[]>();
const initialFileStore = new Map<FileStoreKey, HydratedFileEntry>();

let initialHydrationMeta: {
  branch: string;
  repoOwner: string;
  repoName: string;
  version: number;
  generatedAt?: string;
} | null = null;

let allowReadmeHydration = false;

const makeDirectoryStoreKey = (branch: string, path: string): DirectoryStoreKey =>
  `${branch}::dir::${normalizeDirectoryPath(path)}`;

const makeFileStoreKey = (branch: string, path: string): FileStoreKey =>
  `${branch}::file::${normalizeFilePath(path)}`;

const isHydrationActiveForBranch = (branch: string): boolean =>
  initialHydrationMeta !== null && initialHydrationMeta.branch === branch;

const isReadmePath = (filePath: string): boolean => {
  const filename = filePath.split("/").pop()?.toLowerCase() ?? "";
  return filename.includes("readme");
};

const stripSearchAndHash = (value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return value.split(/[?#]/u)[0] ?? value;
    }
  }
  return value.split(/[?#]/u)[0] ?? value;
};

/**
 * 从文件下载 URL 中提取仓库内路径。
 *
 * 支持 raw.githubusercontent.com、代理路径等多种格式，方便首屏注水与缓存联动。
 */
/**
 * 从文件下载 URL 中提取仓库内路径。
 *
 * @param fileUrl - 文件下载地址
 * @returns 仓库内文件路径，无法解析时返回 null
 */
const extractPathFromFileUrl = (fileUrl: string): string | null => {
  if (initialHydrationMeta === null) {
    return null;
  }

  const sanitized = stripSearchAndHash(fileUrl);
  const { repoOwner, repoName, branch } = initialHydrationMeta;

  if (repoOwner === "" || repoName === "" || branch === "") {
    return null;
  }

  const ownerPattern = escapeRegExp(repoOwner);
  const repoPattern = escapeRegExp(repoName);
  const branchPattern = escapeRegExp(branch);

  const rawPattern = new RegExp(
    `https?://raw\\.githubusercontent\\.com/${ownerPattern}/${repoPattern}/${branchPattern}/(.+)`,
    "iu",
  );
  const rawMatch = sanitized.match(rawPattern);
  if (rawMatch?.[1] !== undefined && rawMatch[1] !== "") {
    return normalizeFilePath(decodeURIComponent(rawMatch[1]));
  }

  const relativePattern = new RegExp(
    `^/github-raw/${ownerPattern}/${repoPattern}/${branchPattern}/(.+)`,
    "iu",
  );
  const relativeMatch = sanitized.match(relativePattern);
  if (relativeMatch?.[1] !== undefined && relativeMatch[1] !== "") {
    return normalizeFilePath(decodeURIComponent(relativeMatch[1]));
  }

  const proxyIndex = sanitized.indexOf("https://raw.githubusercontent.com/");
  if (proxyIndex > 0) {
    const nested = sanitized.slice(proxyIndex);
    return extractPathFromFileUrl(nested);
  }

  return null;
};

/**
 * 解码首屏注水的文件内容，主要处理 Base64 编码场景。
 */
/**
 * 解码首屏注水的文件内容，主要处理 Base64 编码场景。
 *
 * @param entry - 首屏注水文件条目
 * @returns 解码后的文件文本内容
 */
const decodeInitialFileContent = (entry: InitialContentFileEntry): string => {
  if (entry.encoding === "base64") {
    try {
      if (typeof window !== "undefined" && typeof window.atob === "function") {
        const binaryString = window.atob(entry.content);
        const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
      }
    } catch (unknownError) {
      const cause = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
      logger.warn("ContentHydration: Base64 解码失败，已回退为原始字符串", cause);
    }
  }

  return entry.content;
};

/**
 * 克隆内容项，避免副作用污染原数据（例如 schema 共享引用）。
 *
 * @param contents - GitHub 内容数组
 * @returns 深拷贝后的内容数组
 */
const cloneGitHubContents = (contents: GitHubContent[]): GitHubContent[] =>
  contents.map((item) => ({
    ...item,
    ...(item._links !== undefined ? { _links: { ...item._links } } : {}),
  }));

/**
 * 在所有注水数据被消费后，清理元数据状态。
 *
 * @returns void
 */
const cleanupInitialHydrationStateIfEmpty = (): void => {
  if (
    initialHydrationMeta !== null &&
    initialDirectoryStore.size === 0 &&
    initialFileStore.size === 0
  ) {
    logger.debug("ContentHydration: 首屏注水数据已全部消费");
    initialHydrationMeta = null;
    allowReadmeHydration = false;
  }
};

/**
 * 将目录类注水数据注册到内存存储中。
 *
 * @param branch - Git 分支名
 * @param entry - 首屏注水目录条目
 * @returns void
 */
const registerHydrationDirectory = (branch: string, entry: InitialContentDirectoryEntry): void => {
  const normalizedPath = entry.path;
  const key = makeDirectoryStoreKey(branch, normalizedPath);
  const cloned = cloneGitHubContents(entry.contents);
  const sanitized = filterAndNormalizeGitHubContents(cloned, {
    excludeHidden: true,
    excludeFiles: [...INITIAL_CONTENT_EXCLUDE_FILES],
  });
  initialDirectoryStore.set(key, sanitized);
};

/**
 * 将文件类注水数据注册到内存存储中。
 *
 * @param branch - Git 分支名
 * @param owner - 仓库拥有者
 * @param repo - 仓库名称
 * @param entry - 首屏注水文件条目
 * @returns void
 */
const registerHydrationFile = (
  branch: string,
  owner: string,
  repo: string,
  entry: InitialContentFileEntry,
): void => {
  const normalizedPath = normalizeFilePath(entry.path);
  if (normalizedPath === "" || (!allowReadmeHydration && isReadmePath(normalizedPath))) {
    return;
  }

  const key = makeFileStoreKey(branch, normalizedPath);
  const content = decodeInitialFileContent(entry);

  const hydratedEntry: HydratedFileEntry = {
    path: normalizedPath,
    content,
    downloadUrl: entry.downloadUrl ?? null,
  };

  if (typeof entry.sha === "string") {
    hydratedEntry.sha = entry.sha;
  }

  initialFileStore.set(key, hydratedEntry);

  if (initialHydrationMeta !== null) {
    initialHydrationMeta.repoOwner = owner !== "" ? owner : initialHydrationMeta.repoOwner;
    initialHydrationMeta.repoName = repo !== "" ? repo : initialHydrationMeta.repoName;
  }
};

/**
 * 消费目录注水数据，若命中则写入缓存并返回。
 *
 * @param path - 目录路径
 * @param branch - Git 分支名
 * @param cacheKey - 目录缓存键
 * @returns 目录内容，未命中时返回 null
 */
export async function consumeHydratedDirectory(
  path: string,
  branch: string,
  cacheKey: string,
): Promise<GitHubContent[] | null> {
  if (!isHydrationActiveForBranch(branch)) {
    return null;
  }

  const key = makeDirectoryStoreKey(branch, path);
  const contents = initialDirectoryStore.get(key);
  if (contents === undefined) {
    return null;
  }

  initialDirectoryStore.delete(key);
  await storeDirectoryContents(cacheKey, path, branch, contents);
  cleanupInitialHydrationStateIfEmpty();
  logger.debug(`ContentHydration: 使用首屏注水目录数据 -> ${path === "" ? "/" : path}`);
  return contents;
}

/**
 * 消费文件注水数据，若命中则写入缓存并返回。
 *
 * @param fileUrl - 文件 URL
 * @param branch - Git 分支名
 * @param cacheKey - 文件缓存键
 * @returns 文件内容，未命中时返回 null
 */
export async function consumeHydratedFile(
  fileUrl: string,
  branch: string,
  cacheKey: string,
): Promise<string | null> {
  if (!isHydrationActiveForBranch(branch)) {
    return null;
  }

  const path = extractPathFromFileUrl(fileUrl);
  if (path === null || path === "") {
    return null;
  }

  const key = makeFileStoreKey(branch, path);
  const entry = initialFileStore.get(key);
  if (entry === undefined) {
    return null;
  }

  initialFileStore.delete(key);
  await storeFileContent(cacheKey, fileUrl, entry.content);
  cleanupInitialHydrationStateIfEmpty();
  logger.debug(`ContentHydration: 使用首屏注水文件数据 -> ${path}`);
  return entry.content;
}

/**
 * 注册首屏注水数据入口，在应用初始化时由构建产物调用。
 *
 * @param payload - 首屏注水载荷，可能为 null 或 undefined
 * @returns void
 */
export function hydrateInitialContent(
  payload: InitialContentHydrationPayload | null | undefined,
): void {
  if (payload === undefined || payload === null) {
    allowReadmeHydration = false;
    return;
  }

  try {
    initialDirectoryStore.clear();
    initialFileStore.clear();

    const branch = payload.branch;
    const repoOwner = payload.repo.owner;
    const repoName = payload.repo.name;
    allowReadmeHydration = payload.metadata?.["allowReadmeHydration"] === true;

    initialHydrationMeta = {
      branch,
      repoOwner,
      repoName,
      version: payload.version,
      generatedAt: payload.generatedAt,
    };

    payload.directories.forEach((directory) => {
      registerHydrationDirectory(branch, directory);
    });

    payload.files.forEach((file) => {
      registerHydrationFile(branch, repoOwner, repoName, file);
    });

    if (initialDirectoryStore.size === 0 && initialFileStore.size === 0) {
      initialHydrationMeta = null;
      allowReadmeHydration = false;
      return;
    }

    logger.debug("ContentHydration: 首屏注水数据已载入", {
      branch,
      directories: initialDirectoryStore.size,
      files: initialFileStore.size,
    });
  } catch (unknownError) {
    const cause = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    logger.warn("ContentHydration: 首屏注水数据处理失败", cause);
    initialDirectoryStore.clear();
    initialFileStore.clear();
    initialHydrationMeta = null;
    allowReadmeHydration = false;
  }
}
