import React, { useRef, useState } from "react";
import type { ClassAttributes, TableHTMLAttributes } from "react";
import { Box, IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useI18n } from "@/contexts/I18nContext";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { serializeTableToTsv } from "../utils/tableCopy";

type MarkdownTableProps = TableHTMLAttributes<HTMLTableElement> & ClassAttributes<HTMLTableElement>;

/**
 * Markdown 表格：横向滚动 + 复制为 TSV（交互对齐代码块复制按钮）
 */
export const MarkdownTable: React.FC<MarkdownTableProps> = ({ children, className, ...props }) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { copied, copy } = useCopyToClipboard();
  const [isHovered, setIsHovered] = useState(false);
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
  const tableRef = useRef<HTMLTableElement>(null);

  const handleCopy = (): void => {
    const table = tableRef.current;
    if (table === null) {
      return;
    }
    void copy(serializeTableToTsv(table));
  };

  const iconColor = copied ? theme.palette.success.main : theme.palette.text.secondary;
  const baseBg = alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.92 : 0.4);
  const hoverBg = alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 1 : 0.55);
  const borderColor = alpha(theme.palette.divider, 0.6);
  const showCopyButton = !isDesktop || isHovered;

  return (
    <Box
      className="markdown-table-wrap"
      sx={{ position: "relative", width: "100%" }}
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
      <Box className="markdown-table-scroll" sx={{ overflowX: "auto", width: "100%" }}>
        <table ref={tableRef} className={className} {...props}>
          {children}
        </table>
      </Box>

      <Tooltip
        title={copied ? t("ui.markdown.copy.copied") : t("ui.markdown.copy.tableButton")}
        placement="left"
        enterDelay={200}
        leaveDelay={150}
        disableHoverListener={!isDesktop}
        disableFocusListener={!isDesktop}
        disableTouchListener={!isDesktop}
      >
        <IconButton
          size="small"
          aria-label={t("ui.markdown.copy.tableAria")}
          onClick={handleCopy}
          sx={{
            position: "absolute",
            top: theme.spacing(0.5),
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
