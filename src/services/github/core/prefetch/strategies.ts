import type { GitHubContent } from "@/types";

const IMPORTANT_DIR_NAMES = ["src", "docs", "components", "pages", "lib", "utils", "assets"];
const IMPORTANT_EXTENSIONS = [".md", ".txt", ".json", ".js", ".ts", ".tsx", ".jsx"];
const MAX_PREFETCH_FILE_SIZE = 100 * 1024;

/**
 * 选择需要优先预加载的目录。
 *
 * @param directories - 待评估的目录数组
 * @returns 优先目录列表
 */
export function selectPriorityDirectories(directories: GitHubContent[]): GitHubContent[] {
  const prioritized = directories.sort((a, b) => {
    const aImportance = IMPORTANT_DIR_NAMES.findIndex((name) =>
      a.name.toLowerCase().includes(name.toLowerCase()),
    );
    const bImportance = IMPORTANT_DIR_NAMES.findIndex((name) =>
      b.name.toLowerCase().includes(name.toLowerCase()),
    );

    if (aImportance !== -1 && bImportance === -1) {
      return -1;
    }
    if (aImportance === -1 && bImportance !== -1) {
      return 1;
    }
    if (aImportance !== -1 && bImportance !== -1) {
      return aImportance - bImportance;
    }

    return a.name.localeCompare(b.name);
  });

  return prioritized.slice(0, 3);
}

/**
 * 选择需要优先预加载的文件。
 *
 * @param files - 待评估的文件数组
 * @returns 优先文件列表
 */
export function selectPriorityFiles(files: GitHubContent[]): GitHubContent[] {
  const candidates = files.filter((file) => {
    if (file.size === undefined || file.size === 0 || file.size > MAX_PREFETCH_FILE_SIZE) {
      return false;
    }

    const lastDotIndex = file.name.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return false;
    }

    const extension = file.name.substring(lastDotIndex);
    return IMPORTANT_EXTENSIONS.includes(extension.toLowerCase());
  });

  const prioritized = candidates.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    if (aName.startsWith("readme")) {
      return bName.startsWith("readme") ? 0 : -1;
    }
    if (bName.startsWith("readme")) {
      return 1;
    }

    return (a.size ?? 0) - (b.size ?? 0);
  });

  return prioritized.slice(0, 5);
}
