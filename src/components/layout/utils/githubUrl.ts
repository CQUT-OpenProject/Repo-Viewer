import { getPreviewFromUrl } from "@/utils/routing/urlManager";
import { logger } from "@/utils/logging/logger";

interface RepoInfo {
  repoOwner: string;
  repoName: string;
}

const encodeSegment = (segment: string): string => {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch (error) {
    logger.debug("路径片段解码失败，使用原始片段", error);
    return encodeURIComponent(segment);
  }
};

export function buildGitHubUrl(
  repoInfo: RepoInfo,
  currentBranch: string,
  defaultBranch: string,
  currentPath: string,
): string {
  const activeBranch = currentBranch !== "" ? currentBranch : defaultBranch;
  const encodedBranch = encodeURIComponent(activeBranch);

  const safePath = currentPath
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeSegment)
    .join("/");

  let githubUrl = `https://github.com/${repoInfo.repoOwner}/${repoInfo.repoName}`;

  const previewTarget = getPreviewFromUrl();
  const hasPathname = safePath.length > 0;

  if (typeof previewTarget === "string" && previewTarget.length > 0 && hasPathname) {
    let decodedFileName = previewTarget;
    try {
      decodedFileName = decodeURIComponent(previewTarget);
    } catch (error) {
      logger.debug("预览文件名解码失败，使用原始值", error);
    }
    const safeFileName = encodeURIComponent(decodedFileName);
    githubUrl += `/blob/${encodedBranch}/${safePath}/${safeFileName}`;
  } else if (hasPathname) {
    githubUrl += `/tree/${encodedBranch}/${safePath}`;
  } else {
    githubUrl += `/tree/${encodedBranch}`;
  }

  return githubUrl;
}
