/**
 * 搜索输入组件
 *
 * 提供搜索关键词输入功能，包含清除按钮和搜索按钮。
 * 支持回车键触发搜索。
 */

import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { useI18n } from "@/contexts/I18nContext";
import React from "react";

/**
 * 搜索输入组件属性接口
 */
interface SearchInputProps {
  /** 输入值 */
  value: string;
  /** 输入框标签 */
  label: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 搜索回调 */
  onSearch: () => void;
  /** 清除回调 */
  onClear: () => void;
  /** 是否禁用 */
  disabled: boolean;
  /** 是否加载中 */
  loading: boolean;
}

/**
 * 搜索输入组件
 *
 * 渲染搜索输入框，包含搜索按钮和清除按钮。
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  label,
  onChange,
  onSearch,
  onClear,
  disabled,
  loading,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useI18n();

  return (
    <TextField
      id="repo-search-keyword"
      label={label}
      placeholder={t("search.input.placeholder")}
      variant="outlined"
      fullWidth
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onSearch();
        }
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: g3BorderRadius(G3_PRESETS.button),
        },
        "& .MuiOutlinedInput-input": {
          paddingLeft: isSmallScreen ? "16px" : "25px",
        },
      }}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment
              position="end"
              sx={{
                mr: -1,
                gap: 0.5,
                display: "flex",
                alignItems: "center",
                height: "100%",
              }}
            >
              {value.trim().length > 0 && (
                <IconButton
                  size="small"
                  onClick={onClear}
                  sx={{
                    mr: 0.5,
                    borderRadius: g3BorderRadius(G3_PRESETS.button),
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
              <Button
                variant="contained"
                size={isSmallScreen ? "small" : "medium"}
                startIcon={loading ? <CircularProgress size={16} /> : undefined}
                disabled={disabled || loading}
                onClick={onSearch}
                sx={{
                  mr: 0,
                  borderRadius: g3BorderRadius(G3_PRESETS.button),
                  minWidth: isSmallScreen ? "auto" : undefined,
                  px: isSmallScreen ? 2 : 3,
                }}
              >
                {t("search.actions.search")}
              </Button>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};
