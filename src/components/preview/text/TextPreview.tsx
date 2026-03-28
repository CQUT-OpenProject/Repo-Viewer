/**
 * 文本文件预览组件模块
 *
 * 提供代码文件的预览功能，包括语法高亮、行号显示、自动换行、
 * 虚拟滚动优化、复制到剪贴板等特性。支持大文件的性能优化渲染。
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  GlobalStyles,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { List as VirtualList, type RowComponentProps, useDynamicRowHeight } from "react-window";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import WrapTextIcon from "@mui/icons-material/WrapText";
import TextRotationNoneIcon from "@mui/icons-material/TextRotationNone";
import type { TextPreviewProps } from "./types";
import { formatFileSize } from "@/utils/format/formatters";
import { useI18n } from "@/contexts/I18nContext";
import { encodeLines, normalizeContentLines } from "@/utils/content/textPreviewLines";
import { detectLanguage } from "@/utils/content/languageDetector";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useContainerSize } from "@/components/preview/image/hooks";

/** 等宽字体栈 */
const MONO_FONT_STACK =
  "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, 'Source Code Pro', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
const MAX_SYNTACTIC_HIGHLIGHT_CHARS = 400_000;
const MAX_SYNTACTIC_HIGHLIGHT_LINES = 15_000;

/**
 * 文本预览内容组件属性接口
 * 继承TextPreviewProps，但要求content为必填字符串
 */
interface TextPreviewContentProps extends Omit<TextPreviewProps, "content" | "loading"> {
  /** 文件内容字符串 */
  content: string;
}

/**
 * 文本预览内容组件
 *
 * 渲染代码文件的内容，支持语法高亮、行号、虚拟滚动等功能。
 */
const TextPreviewContent: React.FC<TextPreviewContentProps> = ({
  content,
  isSmallScreen,
  previewingItem,
  onClose,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const [wrapText, setWrapText] = useState<boolean>(false);
  const highlightRequestIdRef = useRef(0);
  const { copied, copy } = useCopyToClipboard();
  // 小屏/桌面字号与控件尺寸统一管理，避免分散调整
  const contentFontSize = isSmallScreen ? "0.78rem" : "0.9rem";
  const lineNumberFontSize = isSmallScreen ? "0.7rem" : "0.9rem";
  const controlButtonSize = isSmallScreen ? 26 : 32;
  const controlIconSize = isSmallScreen ? 14 : 18;
  const charCount = useMemo(() => content.length, [content]);

  const normalizedLines = useMemo(() => {
    return normalizeContentLines(content);
  }, [content]);

  const lineCount = normalizedLines.length === 0 ? 1 : normalizedLines.length;
  const previewingName = previewingItem?.name ?? null;
  const language = useMemo(() => {
    if (previewingName === null || previewingName.length === 0) {
      return null;
    }
    return detectLanguage(previewingName);
  }, [previewingName]);

  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);
  const shouldBypassSyntaxHighlight = useMemo(() => {
    return charCount > MAX_SYNTACTIC_HIGHLIGHT_CHARS || lineCount > MAX_SYNTACTIC_HIGHLIGHT_LINES;
  }, [charCount, lineCount]);

  useEffect(() => {
    let cancelled = false;
    let worker: Worker | null = null;
    let timer: number | null = null;
    let idleHandle: number | null = null;
    const requestId = highlightRequestIdRef.current + 1;
    highlightRequestIdRef.current = requestId;

    if (
      normalizedLines.length === 0 ||
      language === null ||
      language === "" ||
      shouldBypassSyntaxHighlight
    ) {
      setHighlightedLines([]);
      return () => {
        cancelled = true;
      };
    }

    const applyResult = (nextLines: string[], nextRequestId: number): void => {
      if (cancelled || nextRequestId !== highlightRequestIdRef.current) {
        return;
      }
      setHighlightedLines(nextLines);
    };

    const runFallbackHighlight = async (): Promise<void> => {
      const { highlightContent } = await import("@/utils/content/prismHighlighter");
      if (cancelled) {
        return;
      }
      applyResult(highlightContent(content, language), requestId);
    };

    if (typeof Worker !== "undefined") {
      try {
        worker = new Worker(
          new URL("../../../utils/content/prismHighlighter.worker.ts", import.meta.url),
          {
            type: "module",
          },
        );

        worker.onmessage = (
          event: MessageEvent<{ id: number; highlightedLines?: string[]; error?: string }>,
        ): void => {
          const { id, highlightedLines: nextLines } = event.data;
          if (worker !== null) {
            worker.terminate();
            worker = null;
          }
          if (Array.isArray(nextLines)) {
            applyResult(nextLines, id);
            return;
          }
          applyResult([], id);
        };

        worker.onerror = (): void => {
          if (worker !== null) {
            worker.terminate();
            worker = null;
          }

          void runFallbackHighlight().catch(() => {
            applyResult([], requestId);
          });
        };

        worker.postMessage({ id: requestId, content, language });

        return () => {
          cancelled = true;
          if (worker !== null) {
            worker.terminate();
          }
        };
      } catch {
        worker = null;
      }
    }

    const scheduleFallback = (): void => {
      void runFallbackHighlight().catch(() => {
        applyResult([], requestId);
      });
    };

    if (typeof window !== "undefined") {
      const idleCallback = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

      if (typeof idleCallback.requestIdleCallback === "function") {
        idleHandle = idleCallback.requestIdleCallback(scheduleFallback, { timeout: 700 });

        return () => {
          cancelled = true;
          if (idleHandle !== null && typeof idleCallback.cancelIdleCallback === "function") {
            idleCallback.cancelIdleCallback(idleHandle);
          }
        };
      }
    }

    timer = window.setTimeout(scheduleFallback, 0);

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [content, language, normalizedLines.length, shouldBypassSyntaxHighlight]);

  // 预先转义文本，避免滚动过程中反复计算
  const escapedLines = useMemo(() => {
    return encodeLines(normalizedLines);
  }, [normalizedLines]);

  // 计算实际字节大小（UTF-8 编码）
  const byteSize = useMemo(() => {
    if (typeof content !== "string") {
      return 0;
    }
    try {
      return new TextEncoder().encode(content).length;
    } catch {
      // 如果TextEncoder不可用，使用字符数的近似值（假设平均每个字符2字节）
      return charCount * 2;
    }
  }, [content, charCount]);

  // 格式化文件大小
  const formattedSize = useMemo(() => formatFileSize(byteSize), [byteSize]);

  const lineNumberColumnWidth = useMemo(() => {
    const digitCount = Math.max(2, String(lineCount).length);
    return digitCount.toString() + "ch";
  }, [lineCount]);

  const { containerRef, containerSize } = useContainerSize();

  const baseRowHeight = useMemo(() => {
    const fontSizePx = parseFloat(contentFontSize) * theme.typography.fontSize;
    const verticalPaddingPx = parseFloat(theme.spacing(0.5));
    return fontSizePx * 1.6 + verticalPaddingPx;
  }, [contentFontSize, theme]);

  const [viewportHeight, setViewportHeight] = useState<number | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = (): void => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const maxContainerHeight = useMemo(() => {
    const fallbackHeight = 640;
    const windowHeight = viewportHeight ?? fallbackHeight;
    const reservedSpace = isSmallScreen ? 220 : 280;
    return Math.max(220, windowHeight - reservedSpace);
  }, [isSmallScreen, viewportHeight]);

  const listHeight = useMemo(() => {
    const estimated = lineCount * baseRowHeight;
    return Math.min(maxContainerHeight, estimated);
  }, [baseRowHeight, lineCount, maxContainerHeight]);

  const listWidth = useMemo(() => {
    return containerSize.width > 0 ? containerSize.width : 1;
  }, [containerSize.width]);

  const rowHeightCacheKey = useMemo(() => {
    return `${String(wrapText)}-${String(containerSize.width)}-${contentFontSize}-${lineNumberColumnWidth}-${String(normalizedLines.length)}`;
  }, [
    wrapText,
    containerSize.width,
    contentFontSize,
    lineNumberColumnWidth,
    normalizedLines.length,
  ]);

  // 自动换行时使用动态行高缓存，避免重新计算整表
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: baseRowHeight,
    key: rowHeightCacheKey,
  });
  const rowHeight = wrapText ? dynamicRowHeight : baseRowHeight;
  const emptyRowProps = useMemo(() => ({}), []);

  const Row = ({ index, style, ariaAttributes }: RowComponentProps): React.ReactElement => {
    const lineHtml =
      index < highlightedLines.length
        ? (highlightedLines[index] ?? "\u00A0")
        : (escapedLines[index] ?? "\u00A0");

    return (
      <Box
        style={{ ...style, width: "100%" }}
        {...ariaAttributes}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          minWidth: wrapText ? "100%" : "max-content",
        }}
      >
        <Box
          component="div"
          sx={{
            textAlign: "right",
            userSelect: "none",
            alignSelf: "flex-start",
            padding: isSmallScreen
              ? `${theme.spacing(0.25)} ${theme.spacing(0.75)}`
              : `${theme.spacing(0.25)} ${theme.spacing(1)}`,
            width: `calc(${lineNumberColumnWidth} + ${isSmallScreen ? theme.spacing(0.75) : theme.spacing(1)})`,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            color: alpha(theme.palette.text.secondary, 0.9),
            backgroundColor: alpha(theme.palette.background.default, 0.35),
            position: "sticky",
            left: 0,
            fontSize: lineNumberFontSize,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </Box>
        <Box
          component="div"
          sx={{
            padding: isSmallScreen
              ? `${theme.spacing(0.25)} ${theme.spacing(2)} ${theme.spacing(0.25)} ${theme.spacing(1.5)}`
              : `${theme.spacing(0.25)} ${theme.spacing(3)} ${theme.spacing(0.25)} ${theme.spacing(2)}`,
          }}
        >
          <Box
            component="span"
            sx={{
              display: "block",
              fontFamily: MONO_FONT_STACK,
              fontSize: contentFontSize,
              lineHeight: 1.6,
              whiteSpace: wrapText ? "pre-wrap" : "pre",
              wordBreak: wrapText ? "break-word" : "normal",
              minWidth: wrapText ? "auto" : "max-content",
              "& code": {
                fontFamily: "inherit",
                fontSize: "inherit",
                background: "transparent",
                padding: 0,
                borderRadius: 0,
              },
              "& .token": {
                fontFamily: "inherit",
                fontSize: "inherit",
              },
              "& span.token": {
                fontFamily: "inherit",
                fontSize: "inherit",
              },
            }}
            dangerouslySetInnerHTML={{
              __html: lineHtml,
            }}
          />
        </Box>
      </Box>
    );
  };

  const handleCopy = (): void => {
    if (typeof content === "string") {
      void copy(content);
    }
  };

  const handleToggleWrap = () => {
    setWrapText((prev) => !prev);
  };

  const headerBg = useMemo(
    () => alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.8 : 0.35),
    [theme.palette.background.paper, theme.palette.mode],
  );
  const borderColor = useMemo(() => alpha(theme.palette.divider, 0.56), [theme.palette.divider]);

  // Prism 主题颜色 - 使用 CSS 变量优化性能
  // 使用 useMemo 优化，但依赖 theme.palette.mode 而不是整个 theme 对象
  const prismTheme = useMemo(() => {
    const isLight = theme.palette.mode === "light";
    return {
      background: isLight
        ? alpha(theme.palette.background.paper, 0.95)
        : alpha(theme.palette.background.paper, 0.16),
      comment: isLight ? "#6a737d" : "#8b949e",
      string: isLight ? "#032f62" : "#a5d6ff",
      keyword: isLight ? "#d73a49" : "#ff7b72",
      function: isLight ? "#6f42c1" : "#d2a8ff",
      number: isLight ? "#005cc5" : "#79c0ff",
      operator: isLight ? "#d73a49" : "#ff7b72",
      punctuation: isLight ? "#24292e" : "#c9d1d9",
      property: isLight ? "#005cc5" : "#79c0ff",
      tag: isLight ? "#22863a" : "#7ee787",
      selector: isLight ? "#6f42c1" : "#d2a8ff",
      boolean: isLight ? "#005cc5" : "#79c0ff",
      variable: isLight ? "#e36209" : "#ffa657",
      regex: isLight ? "#032f62" : "#a5d6ff",
      "class-name": isLight ? "#6f42c1" : "#d2a8ff",
    };
  }, [theme.palette.mode, theme.palette.background.paper]);

  const handleCloseOptimized = () => {
    if (containerRef.current !== null) {
      const container = containerRef.current;
      container.textContent = "";
      container.style.display = "none";
      container.style.visibility = "hidden";
      container.style.opacity = "0";
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (typeof onClose === "function") {
          onClose();
        }
      }, 0);
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container !== null) {
      // 更新 Prism 语法高亮的颜色变量
      container.style.setProperty("--prism-comment", prismTheme.comment);
      container.style.setProperty("--prism-string", prismTheme.string);
      container.style.setProperty("--prism-keyword", prismTheme.keyword);
      container.style.setProperty("--prism-function", prismTheme.function);
      container.style.setProperty("--prism-number", prismTheme.number);
      container.style.setProperty("--prism-operator", prismTheme.operator);
      container.style.setProperty("--prism-punctuation", prismTheme.punctuation);
      container.style.setProperty("--prism-property", prismTheme.property);
      container.style.setProperty("--prism-tag", prismTheme.tag);
      container.style.setProperty("--prism-selector", prismTheme.selector);
      container.style.setProperty("--prism-boolean", prismTheme.boolean);
      container.style.setProperty("--prism-variable", prismTheme.variable);
      container.style.setProperty("--prism-regex", prismTheme.regex);
      container.style.setProperty("--prism-class-name", prismTheme["class-name"]);
      // 更新文本颜色变量
      container.style.setProperty("--text-primary", theme.palette.text.primary);
    }
  }, [containerRef, prismTheme, theme.palette.text.primary]);

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }} data-oid="text-preview">
      <GlobalStyles
        styles={{
          ".text-preview__code-table": {
            fontFamily: MONO_FONT_STACK,
            fontSize: contentFontSize,
            lineHeight: 1.6,
            color: "var(--text-primary)",
          },
          ".text-preview__code-container .token.comment": {
            color: "var(--prism-comment)",
            fontStyle: "italic",
          },
          ".text-preview__code-container .token.prolog": {
            color: "var(--prism-comment)",
          },
          ".text-preview__code-container .token.doctype": {
            color: "var(--prism-comment)",
          },
          ".text-preview__code-container .token.cdata": {
            color: "var(--prism-comment)",
          },
          ".text-preview__code-container .token.punctuation": {
            color: "var(--prism-punctuation)",
          },
          ".text-preview__code-container .token.property": {
            color: "var(--prism-property)",
          },
          ".text-preview__code-container .token.tag": {
            color: "var(--prism-tag)",
          },
          ".text-preview__code-container .token.boolean": {
            color: "var(--prism-boolean)",
          },
          ".text-preview__code-container .token.number": {
            color: "var(--prism-number)",
          },
          ".text-preview__code-container .token.constant": {
            color: "var(--prism-number)",
          },
          ".text-preview__code-container .token.symbol": {
            color: "var(--prism-number)",
          },
          ".text-preview__code-container .token.deleted": {
            color: "var(--prism-keyword)",
          },
          ".text-preview__code-container .token.selector": {
            color: "var(--prism-selector)",
          },
          ".text-preview__code-container .token.attr-name": {
            color: "var(--prism-property)",
          },
          ".text-preview__code-container .token.string": {
            color: "var(--prism-string)",
          },
          ".text-preview__code-container .token.char": {
            color: "var(--prism-string)",
          },
          ".text-preview__code-container .token.builtin": {
            color: "var(--prism-function)",
          },
          ".text-preview__code-container .token.inserted": {
            color: "var(--prism-tag)",
          },
          ".text-preview__code-container .token.operator": {
            color: "var(--prism-operator)",
          },
          ".text-preview__code-container .token.entity": {
            color: "var(--prism-variable)",
            cursor: "help",
          },
          ".text-preview__code-container .token.url": {
            color: "var(--prism-string)",
          },
          ".text-preview__code-container .token.variable": {
            color: "var(--prism-variable)",
          },
          ".text-preview__code-container .token.atrule": {
            color: "var(--prism-selector)",
          },
          ".text-preview__code-container .token.attr-value": {
            color: "var(--prism-string)",
          },
          ".text-preview__code-container .token.function": {
            color: "var(--prism-function)",
          },
          ".text-preview__code-container .token.class-name": {
            color: "var(--prism-class-name)",
          },
          ".text-preview__code-container .token.keyword": {
            color: "var(--prism-keyword)",
          },
          ".text-preview__code-container .token.regex": {
            color: "var(--prism-regex)",
          },
          ".text-preview__code-container .token.important": {
            color: "var(--prism-keyword)",
            fontWeight: "bold",
          },
          ".text-preview__code-container .token.bold": {
            fontWeight: "bold",
          },
          ".text-preview__code-container .token.italic": {
            fontStyle: "italic",
          },
        }}
      />

      {typeof onClose === "function" ? (
        <Tooltip title={t("ui.text.closePreview")} placement="bottom">
          <IconButton
            onClick={handleCloseOptimized}
            sx={{
              position: "fixed",
              top: { xs: 34, sm: 38 },
              right: { xs: 16, sm: 24 },
              zIndex: theme.zIndex.modal + 10,
              bgcolor: "background.paper",
              boxShadow: theme.shadows[4],
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              "&:hover": {
                bgcolor: "action.hover",
                boxShadow: theme.shadows[6],
              },
              "&:active": {
                boxShadow: theme.shadows[8],
              },
              transition: theme.transitions.create(
                ["background-color", "box-shadow", "transform"],
                {
                  duration: theme.transitions.duration.short,
                },
              ),
            }}
            data-oid="text-preview-close"
          >
            <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Tooltip>
      ) : null}

      <Paper
        square
        elevation={0}
        sx={{
          width: "100%",
          position: "relative",
          borderRadius: 1,
          overflow: "hidden",
          boxShadow: theme.shadows[1],
        }}
        data-oid="text-preview-paper"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: { xs: 1, sm: 1.5 },
            flexWrap: "nowrap",
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            bgcolor: headerBg,
            borderBottom: `1px solid ${borderColor}`,
            backdropFilter: "blur(10px)",
          }}
          data-oid="text-preview-header"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 0.25, sm: 0.5 },
              flex: 1,
              minWidth: 0,
              pr: { xs: 0.5, sm: 1 },
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: "text.primary",
                wordBreak: "break-all",
                fontSize: { xs: "0.95rem", sm: "1rem" },
                lineHeight: { xs: 1.4, sm: 1.5 },
              }}
              data-oid="text-preview-filename"
            >
              {previewingItem?.name ?? t("ui.text.title")}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                wordBreak: "break-all",
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                lineHeight: { xs: 1.3, sm: 1.4 },
              }}
              data-oid="text-preview-meta"
            >
              {previewingItem?.path ?? ""} · {t("ui.text.meta.totalLines", { count: lineCount })} ·{" "}
              {formattedSize}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.75, sm: 1 },
              flexShrink: 0,
            }}
          >
            <Tooltip title={wrapText ? t("ui.text.disableWrap") : t("ui.text.enableWrap")}>
              <IconButton
                size="small"
                onClick={handleToggleWrap}
                sx={{
                  width: controlButtonSize,
                  height: controlButtonSize,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                  boxShadow: wrapText ? theme.shadows[2] : theme.shadows[0],
                  color: wrapText ? theme.palette.primary.main : theme.palette.text.secondary,
                  bgcolor: wrapText ? alpha(theme.palette.primary.main, 0.12) : "transparent",
                  "&:hover": {
                    bgcolor: wrapText
                      ? alpha(theme.palette.primary.main, 0.16)
                      : alpha(theme.palette.action.hover, 0.4),
                  },
                }}
                data-oid="text-preview-wrap"
              >
                {wrapText ? (
                  <TextRotationNoneIcon sx={{ fontSize: controlIconSize }} />
                ) : (
                  <WrapTextIcon sx={{ fontSize: controlIconSize }} />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title={copied ? t("ui.text.copied") : t("ui.text.copyAll")}>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  width: controlButtonSize,
                  height: controlButtonSize,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                  color: copied ? theme.palette.success.main : theme.palette.text.secondary,
                  bgcolor: copied ? alpha(theme.palette.success.main, 0.12) : "transparent",
                  "&:hover": {
                    bgcolor: copied
                      ? alpha(theme.palette.success.main, 0.16)
                      : alpha(theme.palette.action.hover, 0.4),
                  },
                  transition: theme.transitions.create(
                    ["background-color", "box-shadow", "transform"],
                    {
                      duration: theme.transitions.duration.shortest,
                    },
                  ),
                }}
                data-oid="text-preview-copy"
              >
                {copied ? (
                  <CheckRoundedIcon sx={{ fontSize: controlIconSize }} />
                ) : (
                  <ContentCopyRoundedIcon sx={{ fontSize: controlIconSize }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box
          ref={containerRef}
          className="text-preview__code-container"
          sx={{
            width: "100%",
            height: listHeight,
            maxHeight: maxContainerHeight,
            overflow: "hidden",
            backgroundColor: prismTheme.background,
          }}
          data-oid="text-preview-content"
        >
          {/* 行级虚拟化：仅渲染可见行，避免超大文件 DOM 爆炸 */}
          <VirtualList
            rowCount={normalizedLines.length}
            rowHeight={rowHeight}
            rowComponent={Row}
            rowProps={emptyRowProps}
            defaultHeight={listHeight}
            overscanCount={6}
            className="text-preview__code-table"
            style={{
              height: listHeight,
              width: listWidth,
              overflowX: wrapText ? "hidden" : "auto",
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

const TextPreview: React.FC<TextPreviewProps> = ({
  content,
  loading,
  isSmallScreen,
  previewingItem,
  onClose,
}) => {
  const contentKey = useMemo(() => {
    const safeContent = typeof content === "string" ? content : "";
    const pathKey = previewingItem?.path ?? "";
    return `${pathKey}::${safeContent}`;
  }, [content, previewingItem?.path]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          minHeight: "220px",
        }}
        data-oid="text-preview-loading"
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (typeof content !== "string") {
    return null;
  }

  return (
    <TextPreviewContent
      key={contentKey}
      content={content}
      isSmallScreen={isSmallScreen}
      previewingItem={previewingItem ?? null}
      {...(onClose !== undefined ? { onClose } : {})}
    />
  );
};

TextPreview.displayName = "TextPreview";

export default TextPreview;
