import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { g3BorderRadius, G3_PRESETS } from "../g3Curves";

/**
 * 其他杂项组件样式配置
 */
export const miscStyles = {
  MuiSwitch: {
    styleOverrides: {
      switchBase: ({ theme }: { theme: Theme }) => ({
        color: theme.palette.mode === "light" ? "#D7E2EA" : theme.palette.divider,
        "&.Mui-checked": {
          color: theme.palette.secondary.main,
        },
        "&.Mui-checked + .MuiSwitch-track": {
          backgroundColor: theme.palette.secondary.main,
        },
      }),
      track: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === "light" ? "#B5C5D1" : "#3D4E5D",
      }),
    },
  },
  MuiTooltip: {
    defaultProps: {},
    styleOverrides: {
      tooltip: ({ theme }: { theme: Theme }) => ({
        backgroundColor: alpha(theme.palette.grey[700], 0.92),
        color: "#fff",
        borderRadius: g3BorderRadius(G3_PRESETS.tooltip),
        padding: "6px 12px",
        fontSize: theme.typography.pxToRem(12),
        maxWidth: 300,
      }),
      popper: {
        transition: "none !important",
      },
    },
  },
  MuiSvgIcon: {
    styleOverrides: {
      root: {
        "@media (max-width:600px)": {
          fontSize: "1.25rem",
        },
        "&.MuiSvgIcon-fontSizeSmall": {
          "@media (max-width:600px)": {
            fontSize: "1rem",
          },
        },
      },
    },
  },
};
