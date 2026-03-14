/**
 * 搜索结果列表组件
 *
 * 显示搜索结果列表，支持虚拟化渲染大量结果。
 * 当索引搜索无结果时，提供切换到API搜索的选项。
 */

import {
  Alert,
  Box,
  Button,
  List as MuiList,
  ListItem,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { SearchResultItem } from "./SearchResultItem";
import { getHighlightRegex } from "./utils";
import type { RepoSearchItem } from "@/hooks/github/useRepoSearch";
import { useI18n } from "@/contexts/I18nContext";
import React, { useMemo } from "react";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { List as VirtualList, useDynamicRowHeight } from "react-window";
import type { RowComponentProps } from "react-window";

/**
 * 搜索结果列表组件属性接口
 */
interface SearchResultsProps {
  /** 搜索结果项列表 */
  items: RepoSearchItem[];
  /** 搜索关键词 */
  keyword: string;
  /** 是否加载中 */
  loading: boolean;
  /** 搜索结果数据 */
  searchResult: {
    mode: string;
    items: RepoSearchItem[];
  } | null;
  /** 点击结果项回调 */
  onResultClick: (item: RepoSearchItem) => void;
  /** 在GitHub打开回调 */
  onOpenGithub: (item: RepoSearchItem) => void;
  /** 显示回退提示回调 */
  onFallbackPrompt: () => void;
  /** 是否禁用搜索按钮 */
  disableSearchButton: boolean;
}

/**
 * 搜索结果行数据接口（用于虚拟列表）
 */
interface SearchResultRowData {
  /** 结果项列表 */
  items: RepoSearchItem[];
  /** 搜索关键词 */
  keyword: string;
  /** 小写化关键词 */
  keywordLower: string;
  /** 高亮正则 */
  highlightRegex: RegExp | null;
  /** 是否小屏幕 */
  isSmallScreen: boolean;
  /** 点击回调 */
  onResultClick: (item: RepoSearchItem) => void;
  /** GitHub打开回调 */
  onOpenGithub: (item: RepoSearchItem) => void;
}

/** 虚拟化阈值，超过此数量启用虚拟列表 */
const VIRTUALIZE_THRESHOLD = 30;

/**
 * 搜索结果行组件（用于虚拟列表）
 *
 * 渲染单个搜索结果行。
 */
const SearchResultRow = ({
  ariaAttributes,
  index,
  style,
  ...rowData
}: RowComponentProps<SearchResultRowData>): React.ReactElement => {
  const item = rowData.items[index];

  if (item === undefined) {
    return <div style={style} {...ariaAttributes} aria-hidden="true" />;
  }

  return (
    <SearchResultItem
      item={item}
      keyword={rowData.keyword}
      keywordLower={rowData.keywordLower}
      highlightRegex={rowData.highlightRegex}
      isSmallScreen={rowData.isSmallScreen}
      onClick={rowData.onResultClick}
      onOpenGithub={rowData.onOpenGithub}
      style={style}
      ariaAttributes={ariaAttributes}
    />
  );
};

/**
 * 搜索结果列表组件
 *
 * 渲染搜索结果，根据结果数量决定是否使用虚拟列表。
 */
export const SearchResults: React.FC<SearchResultsProps> = ({
  items,
  keyword,
  loading,
  searchResult,
  onResultClick,
  onOpenGithub,
  onFallbackPrompt,
  disableSearchButton,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useI18n();
  const listHeight = isSmallScreen ? 300 : 400;
  const shouldVirtualize = items.length >= VIRTUALIZE_THRESHOLD;
  const keywordLower = useMemo(() => keyword.toLowerCase(), [keyword]);
  const highlightRegex = useMemo(() => getHighlightRegex(keyword), [keyword]);
  const defaultRowHeight = isSmallScreen ? 72 : 88;
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight, key: keyword });

  const rowData = useMemo(
    (): SearchResultRowData => ({
      items,
      keyword,
      keywordLower,
      highlightRegex,
      isSmallScreen,
      onResultClick,
      onOpenGithub,
    }),
    [items, keyword, keywordLower, highlightRegex, isSmallScreen, onResultClick, onOpenGithub],
  );

  const showEmptyIndexResult =
    !loading &&
    keyword.trim() !== "" &&
    searchResult !== null &&
    searchResult.mode === "search-index" &&
    searchResult.items.length === 0;

  return (
    <>
      {showEmptyIndexResult && (
        <Alert
          severity="info"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            px: isSmallScreen ? 1.5 : 2,
          }}
          action={
            <Button
              size="small"
              variant="outlined"
              onClick={onFallbackPrompt}
              disabled={disableSearchButton}
              sx={{
                borderRadius: g3BorderRadius(G3_PRESETS.button),
                whiteSpace: "nowrap",
              }}
            >
              {isSmallScreen
                ? t("search.results.apiSearchButtonShort")
                : t("search.results.apiSearchButton")}
            </Button>
          }
        >
          <Typography variant={isSmallScreen ? "caption" : "body2"}>
            {t("search.results.emptyIndexResult")}
          </Typography>
        </Alert>
      )}

      {shouldVirtualize && items.length > 0 ? (
        <Box sx={{ height: listHeight, width: "100%" }}>
          <AutoSizer
            renderProp={({ width, height }) => {
              if (width === undefined || height === undefined) {
                return null;
              }

              return (
                <VirtualList
                  rowCount={items.length}
                  rowHeight={dynamicRowHeight}
                  rowComponent={SearchResultRow}
                  rowProps={rowData}
                  overscanCount={6}
                  tagName="ul"
                  style={{
                    height,
                    width,
                    overflowX: "hidden",
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                  }}
                />
              );
            }}
          />
        </Box>
      ) : (
        <MuiList
          sx={{
            maxHeight: listHeight,
            overflowY: "auto",
            overflowX: "hidden",
            width: "100%",
          }}
        >
          {items.map((item) => (
            <SearchResultItem
              key={`${item.branch}:${item.path}`}
              item={item}
              keyword={keyword}
              keywordLower={keywordLower}
              highlightRegex={highlightRegex}
              isSmallScreen={isSmallScreen}
              onClick={onResultClick}
              onOpenGithub={onOpenGithub}
            />
          ))}
          {searchResult !== null && searchResult.items.length === 0 && (
            <ListItem>
              <ListItemText
                primary={t("search.results.noResults")}
                secondary={t("search.results.noResultsHint")}
                slotProps={{
                  primary: {
                    variant: isSmallScreen ? "body2" : "body1",
                  },
                  secondary: {
                    variant: isSmallScreen ? "caption" : "body2",
                  },
                }}
              />
            </ListItem>
          )}
        </MuiList>
      )}
    </>
  );
};
