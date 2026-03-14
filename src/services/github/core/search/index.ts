/**
 * GitHub搜索服务模块
 *
 * 提供GitHub代码搜索功能（支持API搜索和Trees API）。
 */

export { searchWithGitHubApi, searchFiles, searchMultipleBranchesWithTreesApi } from "./service";

export type { SearchTreesResult } from "./service";
