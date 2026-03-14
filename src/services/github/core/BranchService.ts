import axios from "axios";
import { logger } from "@/utils";
import { shouldUseServerAPI } from "../config";
import { getAuthHeaders } from "./Auth";
import {
  GITHUB_API_BASE,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
  getDefaultBranch,
  getCurrentBranch,
} from "./Config";

/**
 * GitHub分支API响应项接口
 */
interface GitHubBranchApiItem {
  name?: string;
  protected?: boolean;
}

/**
 * 服务端分支响应接口
 */
interface ServerBranchResponse {
  status: "success" | "error";
  data: {
    defaultBranch?: string;
    branches: unknown;
  };
}

const MAX_PER_PAGE = 100;

/**
 * 标准化分支名称数组
 *
 * 从API响应中提取并验证分支名称。
 *
 * @param items - API响应的分支数据
 * @returns 标准化后的分支名称数组
 */
function normalizeBranchNames(items: unknown): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (item !== null && typeof item === "object") {
        const { name } = item as GitHubBranchApiItem;
        if (typeof name === "string" && name.trim().length > 0) {
          return name.trim();
        }
      }
      return undefined;
    })
    .filter((name): name is string => typeof name === "string");
}

/**
 * 通过服务端API获取分支列表
 *
 * 支持分页获取所有分支。
 *
 * @returns Promise，解析为分支名称数组
 * @throws 当API响应格式错误时抛出错误
 */
async function fetchBranchesViaServer(): Promise<string[]> {
  const branches: string[] = [];
  let page = 1;
  let shouldContinue = true;

  while (shouldContinue) {
    const params = new URLSearchParams();
    params.set("action", "getBranches");
    params.set("page", page.toString());
    params.set("per_page", MAX_PER_PAGE.toString());

    const response = await axios.get<ServerBranchResponse>(`/api/github?${params.toString()}`);
    const payload = response.data;

    if (payload.status !== "success") {
      throw new Error("分支列表响应格式错误");
    }

    const branchNames = normalizeBranchNames(payload.data.branches);
    branches.push(...branchNames);

    shouldContinue = branchNames.length === MAX_PER_PAGE;
    page += 1;
  }

  return branches;
}

/**
 * 直接从GitHub API获取分支列表
 *
 * 支持分页和Link头解析，获取所有分支。
 *
 * @returns Promise，解析为分支名称数组
 * @throws 当API请求失败时抛出错误
 */
async function fetchBranchesDirect(): Promise<string[]> {
  const headers = getAuthHeaders();
  const branches: string[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/branches?per_page=${MAX_PER_PAGE.toString()}&page=${page.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
    }

    const raw = (await response.json()) as unknown;
    const branchNames = normalizeBranchNames(raw);
    branches.push(...branchNames);

    const linkHeader = response.headers.get("Link") ?? response.headers.get("link");
    if (linkHeader?.includes('rel="next"') ?? false) {
      hasNext = true;
      page += 1;
    } else {
      hasNext = branchNames.length === MAX_PER_PAGE;
      if (hasNext) {
        page += 1;
      }
    }
  }

  return branches;
}

/**
 * 获取仓库的所有分支
 *
 * 根据环境自动选择使用服务端API或直接请求GitHub。
 * 返回的分支列表已去重并排序，默认分支始终在最前面。
 *
 * @returns Promise，解析为排序后的分支名称数组
 */
export async function getBranches(): Promise<string[]> {
  try {
    const branches = shouldUseServerAPI()
      ? await fetchBranchesViaServer()
      : await fetchBranchesDirect();

    const defaultBranch = getDefaultBranch();
    const currentBranch = getCurrentBranch();

    const deduplicated = Array.from(
      new Set(
        [defaultBranch, currentBranch, ...branches].filter((branch) => branch.trim().length > 0),
      ),
    );

    deduplicated.sort((a, b) => a.localeCompare(b));

    // 将默认分支置顶
    deduplicated.sort((a, b) => {
      if (a === defaultBranch) {
        return -1;
      }
      if (b === defaultBranch) {
        return 1;
      }
      return 0;
    });

    return deduplicated;
  } catch (error) {
    logger.error("获取分支列表失败:", error);
    const fallbackBranch = getCurrentBranch();
    return [fallbackBranch];
  }
}
