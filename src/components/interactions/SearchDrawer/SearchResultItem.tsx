/**
 * 搜索结果项组件
 *
 * 显示单个搜索结果，包含文件路径、分支信息、代码片段等。
 * 支持关键词高亮显示。
 */

import {
  Box,
  Chip,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { highlightKeyword, highlightKeywords, resolveItemHtmlUrl } from "./utils";
import type { RepoSearchItem } from "@/hooks/github/useRepoSearch";
import { useI18n } from "@/contexts/I18nContext";
import React from "react";
import type { CSSProperties } from "react";

interface HighlightPart {
  text: string;
  highlight: boolean;
}

interface KeyedHighlightPart extends HighlightPart {
  key: string;
}

const withStableHighlightKeys = (parts: HighlightPart[], prefix: string): KeyedHighlightPart[] => {
  let offset = 0;
  return parts.map((part) => {
    const start = offset;
    offset += part.text.length;
    return {
      ...part,
      key: `${prefix}-${part.highlight ? "hit" : "text"}-${start}-${offset}`,
    };
  });
};

/**
 * 搜索结果项组件属性接口
 */
interface SearchResultItemProps {
  /** 搜索结果项数据 */
  item: RepoSearchItem;
  /** 搜索关键词 */
  keyword: string;
  /** 小写化的搜索关键词 */
  keywordLower: string;
  /** 关键词高亮正则表达式 */
  highlightRegex: RegExp | null;
  /** 是否小屏幕 */
  isSmallScreen: boolean;
  /** 点击结果项回调 */
  onClick: (item: RepoSearchItem) => void;
  /** 在GitHub打开回调 */
  onOpenGithub: (item: RepoSearchItem) => void;
  /** 自定义样式 */
  style?: CSSProperties;
  /** ARIA无障碍属性 */
  ariaAttributes?: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
}

/**
 * 搜索结果项组件
 *
 * 渲染单个搜索结果，包含分支标签、文件路径高亮、代码片段等。
 */
export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  item,
  keyword,
  keywordLower,
  highlightRegex,
  isSmallScreen,
  onClick,
  onOpenGithub,
  style,
  ariaAttributes,
}) => {
  const { t } = useI18n();

  const pathParts = withStableHighlightKeys(
    highlightKeyword(item.path, keyword, keywordLower),
    "path",
  );
  const githubUrl = resolveItemHtmlUrl(item);

  const snippet =
    "snippet" in item && typeof (item as { snippet?: unknown }).snippet === "string"
      ? (item as { snippet?: string }).snippet
      : undefined;
  const snippetParts =
    snippet !== undefined && snippet.length > 0
      ? withStableHighlightKeys(highlightKeywords(snippet, keyword, highlightRegex), "snippet")
      : null;

  const listItemProps = {
    disablePadding: true,
    alignItems: "flex-start" as const,
    ...(style !== undefined ? { style } : {}),
    ...ariaAttributes,
  };

  return (
    <ListItem {...listItemProps}>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          gap: 1,
          alignItems: "flex-start",
        }}
      >
        <ListItemButton
          onClick={() => {
            onClick(item);
          }}
          sx={{
            flex: 1,
            alignItems: "flex-start",
            borderRadius: g3BorderRadius(G3_PRESETS.fileListItem),
          }}
        >
          <ListItemText
            primary={
              <Stack direction="row" spacing={isSmallScreen ? 0.5 : 1} alignItems="center">
                <Chip
                  size="small"
                  label={item.branch}
                  color={item.source === "code-search" ? "primary" : "default"}
                  sx={{
                    borderRadius: g3BorderRadius({ radius: 12, smoothness: 0.8 }),
                    fontSize: isSmallScreen ? "0.7rem" : undefined,
                  }}
                />
                <Typography variant={isSmallScreen ? "caption" : "body2"} color="text.secondary">
                  {item.source === "code-search"
                    ? t("search.results.source.code")
                    : t("search.results.source.api")}
                </Typography>
              </Stack>
            }
            secondary={
              <Box component="span">
                <Box component="span">
                  {pathParts.map((part) =>
                    part.highlight ? (
                      <Box
                        component="span"
                        key={part.key}
                        sx={{
                          color: (theme) => theme.palette.primary.main,
                          fontWeight: 600,
                        }}
                      >
                        {part.text}
                      </Box>
                    ) : (
                      <Box component="span" key={part.key}>
                        {part.text}
                      </Box>
                    ),
                  )}
                </Box>
                {snippetParts !== null && snippetParts.length > 0 && (
                  <Box component="span" display="block" mt={0.5}>
                    {snippetParts.map((part) =>
                      part.highlight ? (
                        <Box
                          component="span"
                          key={part.key}
                          sx={{
                            color: (theme) => theme.palette.primary.main,
                            fontWeight: 600,
                          }}
                        >
                          {part.text}
                        </Box>
                      ) : (
                        <Box component="span" key={part.key}>
                          {part.text}
                        </Box>
                      ),
                    )}
                  </Box>
                )}
              </Box>
            }
            slotProps={{
              secondary: {
                component: "div",
                sx: {
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                },
              },
            }}
          />
        </ListItemButton>
        {githubUrl !== undefined && (
          <Tooltip title={t("search.github.open")} placement="left">
            <IconButton
              onClick={() => {
                onOpenGithub(item);
              }}
              aria-label={t("search.github.open")}
              sx={{
                mt: 1,
                borderRadius: g3BorderRadius(G3_PRESETS.button),
              }}
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </ListItem>
  );
};
