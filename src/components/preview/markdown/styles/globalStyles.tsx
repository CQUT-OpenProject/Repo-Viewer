import { GlobalStyles } from "@mui/material";

/**
 * Markdown全局样式
 *
 * 定义主题切换时的图片过渡行为。
 */
export const markdownGlobalStyles = (
  <GlobalStyles
    styles={{
      ".MuiPaper-root.theme-switching img": {
        transition: "none !important",
      },
    }}
    data-oid="66:1nx7"
  />
);
