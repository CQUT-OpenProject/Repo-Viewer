import type { GitHubContent } from "@/types";
import type { CodeSearchResultItem } from "@/services/github/core/search";

export type RepoSearchMode = "code-search" | "github-api";

export interface RepoSearchFilters {
  keyword: string;
  branches: string[];
  pathPrefix: string;
  extensions: string[];
}

export interface RepoSearchCodeItem extends CodeSearchResultItem {
  source: "code-search";
}

export interface RepoSearchApiItem extends GitHubContent {
  source: "github-api";
  branch: string;
}

export type RepoSearchItem = RepoSearchCodeItem | RepoSearchApiItem;

export interface RepoSearchExecutionResult {
  mode: RepoSearchMode;
  items: RepoSearchItem[];
  took: number;
  filters: RepoSearchFilters;
  completedAt: number;
}

export interface RepoSearchError {
  source: "search";
  message: string;
  raw?: unknown;
}

export interface RepoSearchExecuteOptions extends Partial<RepoSearchFilters> {}

export interface RepoSearchState {
  keyword: string;
  setKeyword: (value: string) => void;
  branchFilter: string[];
  setBranchFilter: (branches: string[] | string) => void;
  extensionFilter: string[];
  setExtensionFilter: (extensions: string[] | string) => void;
  pathPrefix: string;
  setPathPrefix: (prefix: string) => void;
  availableBranches: string[];
  searchResult: RepoSearchExecutionResult | null;
  searchLoading: boolean;
  searchError: RepoSearchError | null;
  search: (options?: RepoSearchExecuteOptions) => Promise<RepoSearchExecutionResult | null>;
  clearResults: () => void;
  resetFilters: () => void;
}

export interface UseRepoSearchOptions {
  currentBranch: string;
  defaultBranch: string;
  branches: string[];
}
