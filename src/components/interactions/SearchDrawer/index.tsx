import React, { useCallback, useMemo } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useContentContext, usePreviewContext } from "@/contexts/unified";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { resolveItemHtmlUrl } from "./utils";
import { useI18n } from "@/contexts/I18nContext";
import {
  useSearchFilters,
  useFallbackDialog,
  useSearchDrawerInit,
  useSearchActions,
  useSearchFieldLabel,
} from "./hooks";
import { SearchInput } from "./SearchInput";
import { FilterSection, FilterToggleButton } from "./FilterSection";
import { IndexStatus } from "./IndexStatus";
import { SearchResults } from "./SearchResults";
import { FallbackDialog } from "./FallbackDialog";

interface SearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SearchDrawer: React.FC<SearchDrawerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useI18n();

  const {
    currentBranch,
    defaultBranch,
    currentPath,
    navigateTo,
    setCurrentBranch,
    findFileItemByPath,
    search,
  } = useContentContext();
  const { selectFile } = usePreviewContext();

  // 解构搜索相关状态
  const { branchFilter, availableBranches, indexStatus, pathPrefix, refreshIndexStatus } = search;
  const { enabled, loading, error, ready, indexedBranches, lastUpdatedAt } = indexStatus;

  // 使用自定义 hooks
  const {
    extensionInput,
    setExtensionInput,
    filtersExpanded,
    setFiltersExpanded,
    applyExtensionFilter,
    handleBranchToggle,
    clearBranchFilter,
    toggleFilters,
    handleResetFilters,
  } = useSearchFilters({ search });

  const { fallbackDialogOpen, openFallbackPrompt, handleFallbackDialogClose } = useFallbackDialog({
    search,
  });

  // 初始化逻辑
  const handleDialogEntered = useSearchDrawerInit({
    currentPath,
    search,
    setPathPrefix: search.setPathPrefix,
    setExtensionInput,
    setFiltersExpanded,
  });

  // 搜索操作
  const { handleSearch, handleApiSearch, handleResultClick } = useSearchActions({
    search,
    currentBranch,
    defaultBranch,
    setCurrentBranch,
    navigateTo,
    findFileItemByPath,
    selectFile,
    onClose,
  });

  // 搜索框标签
  const searchFieldLabel = useSearchFieldLabel({
    branchFilter,
    availableBranches,
    currentBranch,
    defaultBranch,
    pathPrefix,
    isSmallScreen,
  });

  // 处理搜索输入变化
  const handleSearchInputChange = useCallback(
    (value: string) => {
      search.setKeyword(value);
    },
    [search],
  );

  // Fallback 对话框确认
  const handleFallbackDialogConfirm = useCallback(() => {
    handleFallbackDialogClose();
    handleApiSearch();
  }, [handleApiSearch, handleFallbackDialogClose]);

  // 打开 GitHub
  const handleOpenGithub = useCallback((item: { htmlUrl?: string; html_url?: string }) => {
    const candidateUrl = resolveItemHtmlUrl(item);
    if (typeof candidateUrl === "string" && candidateUrl.length > 0) {
      window.open(candidateUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const searchSummaries = useMemo(() => {
    if (search.searchResult === null) {
      return t("search.empty");
    }
    const { items, took, mode } = search.searchResult;
    return t("search.results.summary", {
      count: items.length,
      took: took.toFixed(1),
      mode: mode === "search-index" ? t("search.results.indexMode") : t("search.results.apiMode"),
    });
  }, [search.searchResult, t]);

  const disableSearchButton = search.keyword.trim() === "";

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={isSmallScreen ? "sm" : "md"}
        slotProps={{
          paper: {
            sx: {
              borderRadius: isSmallScreen
                ? g3BorderRadius({ radius: 20, smoothness: 0.8 })
                : g3BorderRadius(G3_PRESETS.dialog),
              m: isSmallScreen ? 2 : 3,
            },
          },
          transition: {
            onEntered: () => {
              handleDialogEntered();
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: isSmallScreen ? 2 : 3,
            py: isSmallScreen ? 1.5 : 2,
          }}
        >
          <Typography component="span" variant={isSmallScreen ? "subtitle1" : "h6"}>
            {t("search.title")}
          </Typography>
          <IconButton
            onClick={onClose}
            aria-label={t("search.actions.close")}
            size={isSmallScreen ? "small" : "medium"}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            px: isSmallScreen ? 2 : 3,
            py: isSmallScreen ? 2 : 3,
            // 隐藏滚动条但保留滚动功能
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE/Edge
            "&::-webkit-scrollbar": {
              display: "none", // Chrome/Safari
            },
          }}
        >
          <Stack spacing={isSmallScreen ? 1.5 : 2}>
            {/* 搜索框和筛选按钮（水平布局） */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <SearchInput
                value={search.keyword}
                label={searchFieldLabel}
                onChange={handleSearchInputChange}
                onSearch={() => {
                  void handleSearch();
                }}
                onClear={() => {
                  search.setKeyword("");
                }}
                disabled={disableSearchButton}
                loading={search.searchLoading}
              />
              <FilterToggleButton expanded={filtersExpanded} onToggle={toggleFilters} />
            </Stack>

            {/* 筛选面板（向下展开） */}
            <FilterSection
              expanded={filtersExpanded}
              availableBranches={availableBranches}
              branchFilter={branchFilter}
              currentBranch={currentBranch}
              defaultBranch={defaultBranch}
              onBranchToggle={handleBranchToggle}
              onClearBranches={clearBranchFilter}
              extensionInput={extensionInput}
              onExtensionInputChange={setExtensionInput}
              onExtensionApply={applyExtensionFilter}
              onExtensionClear={() => {
                setExtensionInput("");
                search.setExtensionFilter([]);
              }}
              pathPrefix={search.pathPrefix}
              onPathPrefixChange={search.setPathPrefix}
              onPathPrefixClear={() => {
                search.setPathPrefix("");
              }}
            />

            <IndexStatus
              enabled={enabled}
              loading={loading}
              error={error}
              ready={ready}
              indexedBranches={indexedBranches}
              lastUpdatedAt={lastUpdatedAt}
              onRefresh={refreshIndexStatus}
            />

            {search.searchError !== null && (
              <Alert severity="error">
                {t("search.error", { message: search.searchError.message })}
              </Alert>
            )}

            <Divider />

            <Stack
              direction={isSmallScreen ? "column" : "row"}
              justifyContent="space-between"
              alignItems={isSmallScreen ? "stretch" : "center"}
              spacing={isSmallScreen ? 1 : 0}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {searchSummaries}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                justifyContent={isSmallScreen ? "flex-end" : "flex-start"}
              >
                <Button
                  size="small"
                  onClick={handleResetFilters}
                  sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
                >
                  {t("search.actions.resetFilters")}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    search.clearResults();
                  }}
                  sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
                >
                  {t("search.actions.clearResults")}
                </Button>
              </Stack>
            </Stack>

            <SearchResults
              items={search.searchResult?.items ?? []}
              keyword={search.keyword}
              loading={search.searchLoading}
              searchResult={search.searchResult}
              onResultClick={(item) => {
                void handleResultClick(item);
              }}
              onOpenGithub={handleOpenGithub}
              onFallbackPrompt={openFallbackPrompt}
              disableSearchButton={disableSearchButton}
            />
          </Stack>
        </DialogContent>
      </Dialog>

      <FallbackDialog
        open={fallbackDialogOpen}
        onClose={handleFallbackDialogClose}
        onConfirm={handleFallbackDialogConfirm}
      />
    </>
  );
};

export default SearchDrawer;
