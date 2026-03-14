import type { GitHubContent } from "@/types";
import type {
  SearchIndexErrorCode,
  SearchIndexResultItem,
} from "@/services/github/core/searchIndex";

export type RepoSearchMode = "search-index" | "github-api";

export type RepoSearchFallbackReason =
  | "index-disabled"
  | "index-not-ready"
  | "index-error"
  | "branch-not-indexed";

export interface RepoSearchFilters {
  keyword: string;
  branches: string[];
  pathPrefix: string;
  extensions: string[];
}

export interface RepoSearchIndexItem extends SearchIndexResultItem {
  source: "search-index";
}

export interface RepoSearchApiItem extends GitHubContent {
  source: "github-api";
  branch: string;
}

export type RepoSearchItem = RepoSearchIndexItem | RepoSearchApiItem;

export interface RepoSearchExecutionResult {
  mode: RepoSearchMode;
  items: RepoSearchItem[];
  took: number;
  filters: RepoSearchFilters;
  completedAt: number;
}

export interface RepoSearchError {
  source: "index" | "search";
  code?: SearchIndexErrorCode;
  message: string;
  details?: unknown;
  raw?: unknown;
}

export interface RepoSearchIndexStatus {
  enabled: boolean;
  ready: boolean;
  loading: boolean;
  error: RepoSearchError | null;
  indexedBranches: string[];
  lastUpdatedAt?: number;
}

export interface RepoSearchExecuteOptions extends Partial<RepoSearchFilters> {
  mode?: RepoSearchMode;
}

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
  availableModes: RepoSearchMode[];
  preferredMode: RepoSearchMode;
  setPreferredMode: (mode: RepoSearchMode) => void;
  mode: RepoSearchMode;
  fallbackReason: RepoSearchFallbackReason | null;
  indexStatus: RepoSearchIndexStatus;
  searchResult: RepoSearchExecutionResult | null;
  searchLoading: boolean;
  searchError: RepoSearchError | null;
  search: (options?: RepoSearchExecuteOptions) => Promise<RepoSearchExecutionResult | null>;
  clearResults: () => void;
  resetFilters: () => void;
  isBranchIndexed: (branch: string) => boolean;
  refreshIndexStatus: () => void;
  initializeIndex: () => void;
}

export interface UseRepoSearchOptions {
  currentBranch: string;
  defaultBranch: string;
  branches: string[];
}
