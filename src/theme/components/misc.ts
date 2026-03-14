import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { g3BorderRadius, G3_PRESETS } from "../g3Curves";

/**
 * 其他杂项组件样式配置
 */
export const miscStyles = {
  MuiSwitch: {
    styleOverrides: {
      switchBase: {
        color: "#E6E1E5",
        "&.Mui-checked": {
          color: "#D0BCFF",
        },
        "&.Mui-checked + .MuiSwitch-track": {
          backgroundColor: "#9A82DB",
        },
      },
      track: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.mode === "light" ? "#CAC4D0" : "#49454F",
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
