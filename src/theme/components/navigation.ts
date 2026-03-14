import type { Theme } from "@mui/material/styles";

/**
 * 导航相关组件样式配置
 */
export const navigationStyles = {
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        boxShadow: "none",
        backgroundColor: theme.palette.mode === "light" ? "#FFFBFE" : "#1C1B1F",
        color: theme.palette.mode === "light" ? "#1C1B1F" : "#E6E1E5",
      }),
    },
  },
  MuiBreadcrumbs: {
    styleOverrides: {
      root: {
        "& .MuiBreadcrumbs-separator": {
          margin: "0 8px",
          "@media (max-width:600px)": {
            margin: "0 4px",
          },
        },
      },
    },
  },
  MuiToolbar: {
    styleOverrides: {
      root: {
        "@media (max-width:600px)": {
          minHeight: "56px",
          padding: "0 16px",
        },
      },
    },
  },
};
