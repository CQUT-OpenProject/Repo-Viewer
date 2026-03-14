/**
 * Markdown代码块组件
 *
 * 渲染Markdown代码块，支持语法高亮和复制功能。
 * 桌面端支持悬停显示复制按钮，移动端始终显示。
 */

import React, { useMemo, useState } from "react";
import type { ClassAttributes, HTMLAttributes } from "react";
import { Box, IconButton, Tooltip, useTheme, useMediaQuery } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useI18n } from "@/contexts/I18nContext";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

/** 代码元素属性类型 */
type CodeElementProps = (HTMLAttributes<HTMLElement> & ClassAttributes<HTMLElement>) | undefined;

/**
 * Markdown代码块组件属性接口
 */
interface MarkdownCodeBlockProps {
  /** CSS类名 */
  className?: string | undefined;
  /** 代码语言 */
  language?: string | undefined;
  /** 代码内容 */
  content: string;
  /** 代码元素属性 */
  codeProps?: CodeElementProps;
  /** 数据OID */
  dataOid?: string | undefined;
}

/**
 * Markdown代码块组件
 *
 * 渲染代码块并添加复制按钮功能。
 */
export const MarkdownCodeBlock: React.FC<MarkdownCodeBlockProps> = ({
  className,
  language,
  content,
  codeProps,
  dataOid,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { copied, copy } = useCopyToClipboard();
  const [isHovered, setIsHovered] = useState(false);
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));

  const handleCopy = (): void => {
    void copy(content);
  };

  const { restProps: codeAttributes, ref: codeRef } = useMemo(() => {
    if (codeProps === undefined) {
      return { restProps: {} as HTMLAttributes<HTMLElement>, ref: undefined };
    }

    const {
      children: _children,
      ref,
      ...rest
    } = codeProps as Record<string, unknown> & {
      ref?: ClassAttributes<HTMLElement>["ref"];
    };

    return {
      restProps: rest as HTMLAttributes<HTMLElement>,
      ref: ref,
    };
  }, [codeProps]);

  const iconColor = copied ? theme.palette.success.main : theme.palette.text.secondary;
  const baseBg = alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.92 : 0.4);
  const hoverBg = alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 1 : 0.55);
  const borderColor = alpha(theme.palette.divider, 0.6);
  const showCopyButton = !isDesktop || isHovered;

  return (
    <Box
      sx={{ position: "relative", width: "100%" }}
      data-oid={dataOid !== undefined ? `${dataOid}-container` : undefined}
      onMouseEnter={
        isDesktop
          ? () => {
              setIsHovered(true);
            }
          : undefined
      }
      onMouseLeave={
        isDesktop
          ? () => {
              setIsHovered(false);
            }
          : undefined
      }
      onFocusCapture={
        isDesktop
          ? () => {
              setIsHovered(true);
            }
          : undefined
      }
      onBlurCapture={
        isDesktop
          ? () => {
              setIsHovered(false);
            }
          : undefined
      }
    >
      <pre
        className={className}
        tabIndex={0}
        data-language={language ?? undefined}
        data-oid={dataOid}
      >
        <code className={className} ref={codeRef} {...codeAttributes}>
          {content}
        </code>
      </pre>

      <Tooltip
        title={copied ? t("ui.markdown.copy.copied") : t("ui.markdown.copy.button")}
        placement="left"
        enterDelay={200}
        leaveDelay={150}
        disableHoverListener={!isDesktop}
        disableFocusListener={!isDesktop}
        disableTouchListener={!isDesktop}
      >
        <IconButton
          size="small"
          aria-label={t("ui.markdown.copy.aria")}
          onClick={handleCopy}
          sx={{
            position: "absolute",
            top: theme.spacing(0),
            right: theme.spacing(1),
            width: 28,
            height: 28,
            borderRadius: 10,
            backgroundColor: baseBg,
            color: iconColor,
            border: `1px solid ${borderColor}`,
            boxShadow: theme.shadows[1],
            backdropFilter: "blur(6px)",
            transition: theme.transitions.create(
              ["background-color", "color", "box-shadow", "opacity"],
              {
                duration: theme.transitions.duration.shortest,
              },
            ),
            opacity: showCopyButton ? 1 : 0,
            pointerEvents: showCopyButton ? "auto" : "none",
            "&:hover": {
              backgroundColor: hoverBg,
              color: copied ? theme.palette.success.dark : theme.palette.text.primary,
              boxShadow: theme.shadows[2],
            },
            "&:active": {
              boxShadow: theme.shadows[3],
            },
            zIndex: 2,
          }}
          data-oid={dataOid !== undefined ? `${dataOid}-copy` : undefined}
        >
          {copied ? (
            <CheckRoundedIcon sx={{ fontSize: 16 }} />
          ) : (
            <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};
