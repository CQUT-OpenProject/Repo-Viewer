import type { Theme, SxProps } from "@mui/material";
import { alpha } from "@mui/material";
import { responsiveG3Styles, g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";

const SYSTEM_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";
const MONO_FONT =
  "var(--fontStack-monospace, ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, 'Liberation Mono', monospace)";

/**
 * 创建Markdown样式
 *
 * 根据主题、LaTeX公式数量和屏幕大小生成Markdown预览的样式配置。
 *
 * @param theme - Material-UI主题对象
 * @param latexCount - LaTeX公式数量（用于性能优化）
 * @param isSmallScreen - 是否为小屏幕，默认false
 * @returns Material-UI SxProps样式对象
 */
export const createMarkdownStyles = (
  theme: Theme,
  latexCount: number,
  isSmallScreen = false,
): SxProps<Theme> => {
  const containerBorderRadius = responsiveG3Styles.readmeContainer(isSmallScreen);
  const isDark = theme.palette.mode === "dark";
  const textColor = theme.palette.text.primary;
  const secondaryTextColor = theme.palette.text.secondary;
  const primary = theme.palette.primary.main;
  const blockquoteBorderColor = alpha(primary, isDark ? 0.55 : 0.4);
  const codeSurfaceColor = alpha(primary, isDark ? 0.22 : 0.12);
  const codeBorderColor = alpha(primary, isDark ? 0.45 : 0.28);
  const dividerColor = alpha(
    isDark ? theme.palette.common.white : theme.palette.common.black,
    isDark ? 0.2 : 0.15,
  );
  const tableHeaderBackground = alpha(primary, isDark ? 0.2 : 0.1);
  const tableStripeBackground = alpha(
    isDark ? theme.palette.common.white : theme.palette.common.black,
    isDark ? 0.08 : 0.05,
  );

  return {
    position: "relative",
    py: { xs: 2.5, sm: 3 },
    px: { xs: 2.5, sm: 4 },
    mt: 2,
    mb: 3,
    borderRadius: containerBorderRadius,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",

    "& .markdown-body": {
      color: `${textColor} !important`,
      backgroundColor: "transparent !important",
      fontSize: { xs: "0.875rem", sm: "1rem" },
      lineHeight: 1.7,
      wordBreak: "break-word",
      fontFamily: SYSTEM_FONT,
      boxSizing: "border-box",
      transition: theme.transitions.create(["color", "background-color"], {
        duration: theme.transitions.duration.standard,
      }),
    },

    "& .markdown-body *": {
      borderColor: `${dividerColor} !important`,
    },

    "& .markdown-body :where(h1, h2, h3, h4, h5, h6)": {
      color: textColor,
    },

    "& .markdown-body a": {
      color: primary,
      textDecoration: "none",
      "&:hover": {
        textDecoration: "underline",
      },
    },

    "& .markdown-body strong": {
      color: textColor,
      fontWeight: 600,
    },

    "& .markdown-body a strong": {
      color: "inherit",
    },

    "& .markdown-body em": {
      color: textColor,
      fontStyle: "italic",
    },

    "& .markdown-body a em": {
      color: "inherit",
    },

    "& .markdown-body del": {
      color: secondaryTextColor,
      textDecoration: "line-through",
    },

    "& .markdown-body p": {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
      color: textColor,
    },

    "& .markdown-body ul, & .markdown-body ol": {
      listStylePosition: "outside",
      paddingLeft: "2em",
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },

    "& .markdown-body ul": {
      listStyleType: "disc",
    },

    "& .markdown-body ol": {
      listStyleType: "decimal",
    },

    "& .markdown-body ul ul, & .markdown-body ul ol, & .markdown-body ol ul, & .markdown-body ol ol":
      {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
        paddingLeft: "1.8em",
      },

    "& .markdown-body ol ol, & .markdown-body ul ol": {
      listStyleType: "lower-roman",
    },

    "& .markdown-body ul ul ol, & .markdown-body ul ol ol, & .markdown-body ol ul ol, & .markdown-body ol ol ol":
      {
        listStyleType: "lower-alpha",
      },

    "& .markdown-body li": {
      marginTop: theme.spacing(0.75),
      marginBottom: theme.spacing(0.75),
      color: textColor,
    },

    "& .markdown-body li > p": {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },

    "& .markdown-body blockquote": {
      padding: theme.spacing(0, 2),
      borderLeft: `4px solid ${blockquoteBorderColor}`,
      color: secondaryTextColor,
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },

    "& .markdown-body hr": {
      border: 0,
      borderTop: `1px solid ${dividerColor}`,
      margin: theme.spacing(3, 0),
    },

    "& .markdown-body table": {
      width: "100%",
      borderCollapse: "collapse",
      borderSpacing: 0,
      display: "block",
      overflowX: "auto",
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },

    "& .markdown-body table th, & .markdown-body table td": {
      padding: theme.spacing(1),
      border: `1px solid ${dividerColor}`,
      textAlign: "left",
      color: `${textColor} !important`,
      backgroundColor: `${theme.palette.background.paper} !important`,
    },

    "& .markdown-body table th": {
      fontWeight: 600,
      backgroundColor: `${tableHeaderBackground} !important`,
    },

    "& .markdown-body table tbody tr": {
      backgroundColor: `${theme.palette.background.paper} !important`,
    },

    "& .markdown-body table tbody tr:nth-of-type(2n)": {
      backgroundColor: `${tableStripeBackground} !important`,
    },

    "& .markdown-body table tbody tr:nth-of-type(2n) td": {
      backgroundColor: `${tableStripeBackground} !important`,
    },

    "& .markdown-body table tbody tr:nth-of-type(odd) td": {
      backgroundColor: `${theme.palette.background.paper} !important`,
    },

    // 支持内联样式的 table
    "& .markdown-body table[style*='border: none']": {
      border: "none !important",
      backgroundColor: "transparent !important",
    },

    "& .markdown-body table[style*='border: none'] th, & .markdown-body table[style*='border: none'] td":
      {
        border: "none !important",
        backgroundColor: "transparent !important",
      },

    "& .markdown-body table[style*='border: none'] tbody tr": {
      backgroundColor: "transparent !important",
    },

    "& .markdown-body pre": {
      marginTop: theme.spacing(0),
      marginBottom: theme.spacing(0),
      padding: theme.spacing(0.5, 2),
      overflowX: "hidden",
      overflowY: "hidden",
      borderRadius: g3BorderRadius(G3_PRESETS.card),
      backgroundColor: "transparent",
      border: 0,
      maxWidth: "100%",
    },

    "& .markdown-body pre > code": {
      display: "block",
      width: "100%",
      maxWidth: "100%",
      fontFamily: MONO_FONT,
      fontSize: { xs: "0.8125rem", sm: "0.875rem" },
      lineHeight: 1.55,
      backgroundColor: codeSurfaceColor, // 代码块背景色
      borderRadius: "inherit",
      border: `1px solid ${codeBorderColor}`,
      padding: theme.spacing(1.5, 1.75),
      paddingRight: theme.spacing(2.75),
      color: textColor,
      boxSizing: "border-box",
      whiteSpace: "pre",
      maxHeight: "min(56vh, 720px)",
      overflowX: "auto",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    },

    "& .markdown-body :not(pre) > code": {
      fontFamily: MONO_FONT,
      fontSize: { xs: "0.8125em", sm: "0.875em" },
      backgroundColor: codeSurfaceColor,
      borderRadius: "6px",
      padding: "0.2em 0.4em",
      color: textColor,
      border: 0,
      boxDecorationBreak: "clone",
      whiteSpace: "break-spaces",
    },

    // 主题切换时的过渡效果
    "&.theme-transition-katex .katex-display, &.theme-transition-katex .katex": {
      visibility: "hidden",
      opacity: 0,
      transition: "visibility 0s, opacity 0.3s linear",
    },

    // 大量公式时的特殊优化
    ...(latexCount > 50 && {
      "& .markdown-body .katex": {
        contain: "paint layout style",
        willChange: "transform",
      },
      "& .markdown-body .katex-display": {
        contain: "paint layout style",
        willChange: "transform",
      },
    }),

    "& .markdown-body img": {
      maxWidth: "100%",
      borderRadius: g3BorderRadius(G3_PRESETS.image),
      marginTop: theme.spacing(0),
      marginBottom: theme.spacing(0),
      transition: theme.transitions.create(["opacity", "filter"], {
        duration: theme.transitions.duration.standard,
      }),
      filter: "brightness(1)",
    },

    "& .markdown-body img:not(.loaded)": {
      opacity: 0.7,
      filter: "brightness(0.95)",
      transform: "scale(0.98)",
    },

    "& .markdown-body img.failed": {
      filter: "grayscale(0.5) brightness(0.9)",
      border: `1px dashed ${theme.palette.error.main}`,
    },

    "& .markdown-body img.theme-transition": {
      transition: "none !important",
    },

    // LaTeX公式样式
    "& .markdown-body .math": {
      fontSize: { xs: "1em", sm: "1.08em" },
      margin: "0.5em 0",
    },
    "& .markdown-body .math-inline": {
      display: "inline-flex",
      alignItems: "center",
      margin: "0 0.25em",
    },
    "& .markdown-body .katex-display": {
      margin: "1em 0",
      padding: "0.5em 0",
      overflowX: "auto",
      overflowY: "hidden",
      borderRadius: g3BorderRadius(G3_PRESETS.card),
    },

    // 深色模式下的LaTeX样式调整
    ...(theme.palette.mode === "dark" && {
      "& .markdown-body .katex": {
        color: "#e6e1e5",
      },
      "& .markdown-body .katex-display": {
        background: alpha(theme.palette.background.paper, 0.4),
        borderRadius: g3BorderRadius(G3_PRESETS.card),
      },
    }),
  };
};
