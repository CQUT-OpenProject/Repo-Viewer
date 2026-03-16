import { getGithubConfig } from "@/config";
import type { InitialContentHydrationPayload } from "@/types";
import { logger } from "@/utils";
import { buildAbsoluteAppUrl } from "@/utils/routing/basePath";

interface InitialContentManifestBranchEntry {
  payloadPath: string;
}

interface InitialContentManifest {
  version: number;
  generatedAt: string;
  repo: {
    owner: string;
    name: string;
  };
  branches: Record<string, InitialContentManifestBranchEntry>;
}

const INITIAL_CONTENT_MANIFEST_PATH = "/initial-content/manifest.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isInitialContentManifest = (value: unknown): value is InitialContentManifest => {
  if (!isRecord(value) || !isRecord(value.repo) || !isRecord(value.branches)) {
    return false;
  }

  if (
    typeof value.version !== "number" ||
    typeof value.generatedAt !== "string" ||
    typeof value.repo.owner !== "string" ||
    typeof value.repo.name !== "string"
  ) {
    return false;
  }

  return Object.values(value.branches).every(
    (entry) => isRecord(entry) && typeof entry.payloadPath === "string",
  );
};

const isInitialContentPayload = (value: unknown): value is InitialContentHydrationPayload => {
  if (!isRecord(value) || !isRecord(value.repo)) {
    return false;
  }

  if (
    typeof value.version !== "number" ||
    typeof value.generatedAt !== "string" ||
    typeof value.branch !== "string" ||
    typeof value.repo.owner !== "string" ||
    typeof value.repo.name !== "string" ||
    !Array.isArray(value.directories) ||
    !Array.isArray(value.files)
  ) {
    return false;
  }

  return value.directories.every(
    (directory) =>
      isRecord(directory) &&
      typeof directory.path === "string" &&
      Array.isArray(directory.contents),
  );
};

const resolveInitialContentUrl = (path: string): string => buildAbsoluteAppUrl(path);

export async function fetchInitialContentManifest(
  signal?: AbortSignal,
): Promise<InitialContentManifest | null> {
  const manifestUrl = resolveInitialContentUrl(INITIAL_CONTENT_MANIFEST_PATH);

  try {
    const response = await fetch(manifestUrl, {
      method: "GET",
      signal: signal ?? null,
    });

    if (response.status === 404) {
      logger.debug("[InitialContent] Manifest not found, skipping preload.");
      return null;
    }

    if (!response.ok) {
      logger.warn(`[InitialContent] Failed to fetch manifest: ${response.status}`);
      return null;
    }

    const data: unknown = await response.json();
    if (!isInitialContentManifest(data)) {
      logger.warn("[InitialContent] Manifest validation failed.");
      return null;
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[InitialContent] Manifest fetch failed: ${message}`);
    return null;
  }
}

export async function loadInitialContentPayload(
  signal?: AbortSignal,
): Promise<InitialContentHydrationPayload | null> {
  const githubConfig = getGithubConfig();
  const manifest = await fetchInitialContentManifest(signal);

  if (manifest === null) {
    return null;
  }

  if (
    manifest.repo.owner !== githubConfig.repoOwner ||
    manifest.repo.name !== githubConfig.repoName
  ) {
    logger.warn("[InitialContent] Manifest repo mismatch, skipping preload.");
    return null;
  }

  const entry = manifest.branches[githubConfig.repoBranch];
  if (entry === undefined) {
    logger.debug(`[InitialContent] No preload entry for branch ${githubConfig.repoBranch}.`);
    return null;
  }

  try {
    const response = await fetch(resolveInitialContentUrl(entry.payloadPath), {
      method: "GET",
      signal: signal ?? null,
    });

    if (response.status === 404) {
      logger.debug(`[InitialContent] Payload not found for branch ${githubConfig.repoBranch}.`);
      return null;
    }

    if (!response.ok) {
      logger.warn(`[InitialContent] Failed to fetch payload: ${response.status}`);
      return null;
    }

    const data: unknown = await response.json();
    if (!isInitialContentPayload(data)) {
      logger.warn("[InitialContent] Payload validation failed.");
      return null;
    }

    if (
      data.branch !== githubConfig.repoBranch ||
      data.repo.owner !== githubConfig.repoOwner ||
      data.repo.name !== githubConfig.repoName
    ) {
      logger.warn("[InitialContent] Payload repo or branch mismatch, skipping preload.");
      return null;
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[InitialContent] Payload fetch failed: ${message}`);
    return null;
  }
}

export const __initialContentLoaderTestUtils = {
  isInitialContentManifest,
  isInitialContentPayload,
  resolveInitialContentUrl,
};
