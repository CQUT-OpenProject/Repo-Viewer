import type { Theme } from "@mui/material/styles";
import { g3BorderRadius, G3_PRESETS } from "../g3Curves";

/**
 * 容器相关组件样式配置
 */
export const containerStyles = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: g3BorderRadius(G3_PRESETS.card),
        padding: 16,
        boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.1)",
        backgroundColor: theme.palette.mode === "light" ? "#FFFFFF" : "#2D2C34",
        "@media (max-width:600px)": {
          padding: 12,
          borderRadius: g3BorderRadius({ ...G3_PRESETS.card, radius: 16 }),
        },
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: {
        borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
        "@media (max-width:600px)": {
          borderRadius: g3BorderRadius({ ...G3_PRESETS.fileListContainer, radius: 12 }),
        },
      },
      elevation1: {
        boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: g3BorderRadius(G3_PRESETS.dialog),
        padding: 0,
        "@media (max-width:600px)": {
          borderRadius: g3BorderRadius({ ...G3_PRESETS.dialog, radius: 20 }),
        },
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: "1.25rem",
        fontWeight: 500,
        "@media (max-width:600px)": {
          fontSize: "1.1rem",
          padding: "16px",
        },
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: 24,
        "@media (max-width:600px)": {
          padding: 16,
        },
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: "12px 24px",
        "@media (max-width:600px)": {
          padding: "8px 16px",
        },
      },
    },
  },
};
