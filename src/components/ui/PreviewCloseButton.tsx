import React from "react";
import { IconButton, Tooltip, alpha, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Close as CloseIcon } from "@mui/icons-material";

export const navigationActionButtonSize = {
  width: { xs: 36, sm: 40 },
  height: { xs: 36, sm: 40 },
};

interface PreviewCloseButtonProps {
  onClick: () => void;
  isSmallScreen: boolean;
  disabled?: boolean;
  ariaLabel: string;
  tooltip?: string;
  sx?: SxProps<Theme>;
}

const PreviewCloseButton: React.FC<PreviewCloseButtonProps> = ({
  onClick,
  isSmallScreen,
  disabled = false,
  ariaLabel,
  tooltip,
  sx,
}) => {
  const theme = useTheme();
  const isEnabled = !disabled;

  const button = (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      size={isSmallScreen ? "small" : "medium"}
      sx={[
        {
          bgcolor: "background.paper",
          color: isEnabled ? theme.palette.primary.main : "text.disabled",
          boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.05)",
          ...navigationActionButtonSize,
          position: "relative",
          "&:hover": isEnabled
            ? {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }
            : {},
          "&:active": isEnabled
            ? {
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                transition: "all 0.18s cubic-bezier(0.3, 0, 0.5, 1)",
              }
            : {},
          "&::after": isEnabled
            ? {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                backgroundColor: theme.palette.primary.main,
                transition: "all 0.3s cubic-bezier(0.2, 0, 0.3, 1)",
                opacity: 0,
                zIndex: -1,
              }
            : {},
          "&:active::after": isEnabled
            ? {
                opacity: 0.18,
                transform: "scale(1.3)",
                transition: "all 0.2s cubic-bezier(0, 0, 0.2, 1)",
              }
            : {},
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        },
        ...(sx === undefined ? [] : Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <CloseIcon fontSize={isSmallScreen ? "small" : "medium"} />
    </IconButton>
  );

  if (tooltip === undefined || tooltip === "") {
    return button;
  }

  return (
    <Tooltip title={tooltip}>
      <span>{button}</span>
    </Tooltip>
  );
};

export default PreviewCloseButton;
