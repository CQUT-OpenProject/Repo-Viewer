import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { g3BorderRadius, G3_PRESETS } from "../g3Curves";

/**
 * 列表相关组件样式配置
 */
export const listStyles = {
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: g3BorderRadius(G3_PRESETS.fileListItem),
        margin: "4px 0",
        overflow: "visible",
        "@media (max-width:600px)": {
          margin: "2px 0",
          minHeight: "36px",
          borderRadius: g3BorderRadius({ ...G3_PRESETS.fileListItem, radius: 8 }),
        },
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: g3BorderRadius(G3_PRESETS.fileListItem),
        transition: "background-color 0.3s ease",
        "&:hover": {
          backgroundColor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === "light" ? 0.08 : 0.16,
          ),
        },
        "@media (max-width:600px)": {
          borderRadius: g3BorderRadius({ ...G3_PRESETS.fileListItem, radius: 8 }),
          py: 0.75,
        },
      }),
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: {
        "@media (max-width:600px)": {
          minWidth: "32px",
        },
      },
    },
  },
};
