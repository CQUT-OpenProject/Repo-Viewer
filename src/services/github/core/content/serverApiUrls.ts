import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER, getCurrentBranch } from "../Config";

interface ParsedConfiguredRepoRawUrl {
  branch: string;
  path: string;
}

const RAW_GITHUB_HOST = "raw.githubusercontent.com";

const decodePathSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const sanitizeFilePath = (filePath: string): string => filePath.trim().replace(/^\/+/, "");

const splitBranchSegments = (branch: string): string[] => {
  const normalized = branch.trim();
  if (normalized === "") {
    return [];
  }
  return normalized.split("/").filter((segment) => segment.length > 0);
};

export function buildRepoFileContentApiUrl(filePath: string, branch?: string): string {
  const params = new URLSearchParams();
  params.set("action", "getFileContent");
  params.set("path", sanitizeFilePath(filePath));

  const branchToUse = (branch ?? getCurrentBranch()).trim();
  if (branchToUse.length > 0) {
    params.set("branch", branchToUse);
  }

  return `/api/github?${params.toString()}`;
}

export function buildGitHubAssetApiUrl(url: string): string {
  const params = new URLSearchParams();
  params.set("action", "getGitHubAsset");
  params.set("url", url);
  return `/api/github?${params.toString()}`;
}

export function parseConfiguredRepoRawUrl(
  rawUrl: string,
  preferredBranch = getCurrentBranch(),
): ParsedConfiguredRepoRawUrl | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname !== RAW_GITHUB_HOST) {
      return null;
    }

    const segments = parsed.pathname
      .split("/")
      .filter((segment) => segment.length > 0)
      .map((segment) => decodePathSegment(segment));

    if (segments.length < 4) {
      return null;
    }

    if (segments[0] !== GITHUB_REPO_OWNER || segments[1] !== GITHUB_REPO_NAME) {
      return null;
    }

    const branchAndPath = segments.slice(2);
    const preferredBranchSegments = splitBranchSegments(preferredBranch);

    if (
      preferredBranchSegments.length > 0 &&
      branchAndPath.length > preferredBranchSegments.length
    ) {
      const isPreferredBranch = preferredBranchSegments.every(
        (segment, index) => branchAndPath[index] === segment,
      );

      if (isPreferredBranch) {
        const path = branchAndPath.slice(preferredBranchSegments.length).join("/");
        if (path.length > 0) {
          return {
            branch: preferredBranch,
            path,
          };
        }
      }
    }

    const fallbackBranch = branchAndPath[0] ?? "";
    const fallbackPath = branchAndPath.slice(1).join("/");
    if (fallbackBranch === "" || fallbackPath === "") {
      return null;
    }

    return {
      branch: fallbackBranch,
      path: fallbackPath,
    };
  } catch {
    return null;
  }
}

export function buildServerApiUrlForGitHubResource(url: string, preferredBranch?: string): string {
  const parsedRepoFile = parseConfiguredRepoRawUrl(url, preferredBranch ?? getCurrentBranch());
  if (parsedRepoFile !== null) {
    return buildRepoFileContentApiUrl(parsedRepoFile.path, parsedRepoFile.branch);
  }

  return buildGitHubAssetApiUrl(url);
}
