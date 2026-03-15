/**
 * 搜索索引获取模块
 *
 * 负责从服务器获取搜索索引的 manifest 文件和 docfind 模块。
 * 支持通过服务端 API 或静态资源方式加载搜索索引。
 *
 * @module searchIndex/fetchers
 */

import { getSearchIndexConfig } from "@/config";
import { logger } from "@/utils";
import { buildAbsoluteAppUrl } from "@/utils/routing/basePath";

import {
  safeValidateSearchIndexManifest,
  type SearchIndexManifest,
  type SearchIndexBranchEntry,
} from "../../schemas";
import {
  clearCaches,
  getManifestCache,
  getModuleCacheEntry,
  setManifestCache,
  setModuleCacheEntry,
  type DocfindSearchHandler,
} from "./cache";
import { createSearchIndexError, SearchIndexError, SearchIndexErrorCode } from "./errors";

interface DocfindModule {
  default?: DocfindSearchHandler;
  init?: (input?: RequestInfo | URL | Response) => Promise<unknown>;
}

const resolveApiUrl = (path: string): string => {
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).toString();
};

const resolveStaticAssetUrl = (path: string): string => buildAbsoluteAppUrl(path);

const ACTION_INDEX_BRANCH = "RV-Index";
const ACTION_INDEX_ROOT = "public";

type ActionResponseType = "json" | "text" | "binary";

const normalizeAssetPath = (value: string): string => value.replace(/^\/+/u, "");

const buildActionAssetPath = (value: string): string => {
  const normalized = normalizeAssetPath(value);
  return `${ACTION_INDEX_ROOT}/${normalized}`;
};

const buildActionAssetUrl = (
  path: string,
  responseType: ActionResponseType,
  hash?: string,
): string => {
  const params = new URLSearchParams();
  params.set("action", "getSearchIndexAsset");
  params.set("indexBranch", ACTION_INDEX_BRANCH);
  params.set("path", path);
  params.set("responseType", responseType);
  if (typeof hash === "string" && hash.length > 0) {
    params.set("v", hash);
  }
  return resolveApiUrl(`/api/github?${params.toString()}`);
};

const resolveDocfindPath = (entry: SearchIndexBranchEntry): string => {
  const config = getSearchIndexConfig();
  if (entry.docfindPath.startsWith("/")) {
    return entry.docfindPath;
  }
  const rawBasePath = config.assetBasePath.trim();
  const normalizedBasePath = rawBasePath.startsWith("/") ? rawBasePath : `/${rawBasePath}`;
  const basePath = normalizedBasePath.endsWith("/")
    ? normalizedBasePath.slice(0, -1)
    : normalizedBasePath;
  return `${basePath}/${entry.docfindPath}`;
};

const buildDocfindUrls = (
  entry: SearchIndexBranchEntry,
): { moduleUrl: string; wasmUrl: string } => {
  const config = getSearchIndexConfig();
  if (config.generationMode === "action") {
    const assetPath = buildActionAssetPath(entry.docfindPath);
    const moduleUrl = buildActionAssetUrl(assetPath, "text", entry.hash);
    const wasmPath = assetPath.replace(/docfind\.js$/i, "docfind_bg.wasm");
    const wasmUrl = buildActionAssetUrl(wasmPath, "binary", entry.hash);
    return { moduleUrl, wasmUrl };
  }

  const baseUrl = resolveStaticAssetUrl(resolveDocfindPath(entry));
  const moduleUrl =
    entry.hash.length > 0 ? `${baseUrl}?v=${encodeURIComponent(entry.hash)}` : baseUrl;
  const wasmBase = new URL("docfind_bg.wasm", baseUrl);
  if (entry.hash.length > 0) {
    wasmBase.searchParams.set("v", entry.hash);
  }
  return { moduleUrl, wasmUrl: wasmBase.toString() };
};

export async function fetchManifest(signal?: AbortSignal): Promise<SearchIndexManifest> {
  const config = getSearchIndexConfig();
  if (!config.enabled) {
    throw createSearchIndexError(SearchIndexErrorCode.DISABLED, "Search index feature is disabled");
  }

  const now = Date.now();
  const cached = getManifestCache();
  if (cached !== null && now - cached.fetchedAt <= config.refreshIntervalMs) {
    return cached.data;
  }

  try {
    const manifestUrl =
      config.generationMode === "action"
        ? buildActionAssetUrl(buildActionAssetPath(config.manifestPath), "json")
        : resolveStaticAssetUrl(config.manifestPath);

    const response = await fetch(manifestUrl, {
      method: "GET",
      signal: signal ?? null,
    });

    if (response.status === 404) {
      throw createSearchIndexError(
        SearchIndexErrorCode.MANIFEST_NOT_FOUND,
        "Search manifest not found",
        {
          status: 404,
          path: config.manifestPath,
        },
      );
    }

    if (!response.ok) {
      throw createSearchIndexError(
        SearchIndexErrorCode.MANIFEST_NOT_FOUND,
        "Failed to fetch manifest",
        {
          status: response.status,
          path: config.manifestPath,
        },
      );
    }

    const data: unknown = await response.json();
    const validation = safeValidateSearchIndexManifest(data);
    if (!validation.success) {
      throw createSearchIndexError(SearchIndexErrorCode.MANIFEST_INVALID, validation.error);
    }

    setManifestCache({ data: validation.data, fetchedAt: now });
    return validation.data;
  } catch (error) {
    if (error instanceof SearchIndexError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown manifest fetch error";
    throw createSearchIndexError(SearchIndexErrorCode.MANIFEST_NOT_FOUND, message, {
      cause: error,
    });
  }
}

async function loadDocfindModule(
  branch: string,
  entry: SearchIndexBranchEntry,
): Promise<DocfindSearchHandler> {
  const cached = getModuleCacheEntry(branch);
  if (cached?.hash === entry.hash) {
    return cached.search;
  }

  const { moduleUrl, wasmUrl } = buildDocfindUrls(entry);

  try {
    const module = (await import(/* @vite-ignore */ moduleUrl)) as DocfindModule;
    if (typeof module.init === "function") {
      await module.init(wasmUrl);
    }

    if (typeof module.default !== "function") {
      throw new Error("Invalid docfind module export");
    }

    setModuleCacheEntry(branch, { search: module.default, hash: entry.hash });
    return module.default;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load docfind module";
    logger.warn(`[SearchIndex] docfind module load failed: ${message}`);
    throw createSearchIndexError(SearchIndexErrorCode.INDEX_FILE_NOT_FOUND, message, {
      branch,
      path: entry.docfindPath,
      cause: error,
    });
  }
}

export async function getDocfindSearchHandler(
  branch: string,
  signal?: AbortSignal,
): Promise<DocfindSearchHandler> {
  const manifest = await fetchManifest(signal);
  const entry = manifest.branches[branch];
  if (entry === undefined) {
    throw createSearchIndexError(
      SearchIndexErrorCode.INDEX_BRANCH_NOT_INDEXED,
      "Branch not indexed",
      { branch },
    );
  }
  return loadDocfindModule(branch, entry);
}

export function invalidateSearchIndexCache(): void {
  clearCaches();
}

export async function refreshSearchIndexManifest(
  signal?: AbortSignal,
): Promise<SearchIndexManifest> {
  clearCaches();
  return fetchManifest(signal);
}

export async function prefetchSearchIndexForBranch(
  branch: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const manifest = await fetchManifest(signal);
    const entry = manifest.branches[branch];
    if (entry === undefined) {
      return false;
    }
    await loadDocfindModule(branch, entry);
    return true;
  } catch {
    return false;
  }
}
