import { g3BorderRadius, G3_PRESETS } from "../g3Curves";

/**
 * 按钮相关组件样式配置
 */
export const buttonStyles = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: g3BorderRadius(G3_PRESETS.button),
        padding: "10px 24px",
        boxShadow: "none",
        "@media (max-width:600px)": {
          padding: "8px 16px",
          fontSize: "0.8rem",
        },
      },
      contained: {
        "&:hover": {
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
        },
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: "50%",
        "@media (max-width:600px)": {
          padding: 8,
          "& .MuiSvgIcon-root": {
            fontSize: "1.25rem",
          },
        },
      },
    },
  },
};
