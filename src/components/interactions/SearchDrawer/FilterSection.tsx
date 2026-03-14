/**
 * 搜索筛选区域组件
 *
 * 提供搜索结果的筛选功能，包括分支筛选、文件扩展名筛选和路径前缀筛选。
 */

import {
  Box,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Clear as ClearIcon, FilterList as FilterListIcon } from "@mui/icons-material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import { useI18n } from "@/contexts/I18nContext";
import React from "react";

/**
 * 筛选区域组件属性接口
 */
interface FilterSectionProps {
  /** 筛选面板是否展开 */
  expanded: boolean;
  /** 可用分支列表 */
  availableBranches: string[];
  /** 当前选中的分支筛选 */
  branchFilter: string[];
  /** 当前分支 */
  currentBranch: string;
  /** 默认分支 */
  defaultBranch: string;
  /** 切换分支筛选回调 */
  onBranchToggle: (branch: string) => void;
  /** 清除分支筛选回调 */
  onClearBranches: () => void;
  /** 扩展名输入值 */
  extensionInput: string;
  /** 扩展名输入变化回调 */
  onExtensionInputChange: (value: string) => void;
  /** 应用扩展名筛选回调 */
  onExtensionApply: () => void;
  /** 清除扩展名筛选回调 */
  onExtensionClear: () => void;
  /** 路径前缀值 */
  pathPrefix: string;
  /** 路径前缀变化回调 */
  onPathPrefixChange: (value: string) => void;
  /** 清除路径前缀回调 */
  onPathPrefixClear: () => void;
}

/**
 * 筛选切换按钮组件属性接口
 */
interface FilterToggleButtonProps {
  /** 是否展开 */
  expanded: boolean;
  /** 切换回调 */
  onToggle: () => void;
}

/**
 * 筛选切换按钮组件
 *
 * 用于展开/收起筛选面板的按钮。
 */
export const FilterToggleButton: React.FC<FilterToggleButtonProps> = ({ expanded, onToggle }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useI18n();

  return (
    <Tooltip title={expanded ? t("search.filter.collapse") : t("search.filter.toggle")}>
      <IconButton
        onClick={onToggle}
        sx={{
          height: isSmallScreen ? 40 : 48,
          width: isSmallScreen ? 40 : 48,
          borderRadius: g3BorderRadius(G3_PRESETS.button),
        }}
        size={isSmallScreen ? "small" : "medium"}
        color={expanded ? "primary" : "default"}
        aria-pressed={expanded}
      >
        <FilterListIcon fontSize={isSmallScreen ? "small" : "medium"} />
      </IconButton>
    </Tooltip>
  );
};

/**
 * 筛选区域组件
 *
 * 渲染搜索筛选面板，包含分支选择、扩展名和路径筛选。
 */
export const FilterSection: React.FC<FilterSectionProps> = ({
  expanded,
  availableBranches,
  branchFilter,
  currentBranch,
  defaultBranch,
  onBranchToggle,
  onClearBranches,
  extensionInput,
  onExtensionInputChange,
  onExtensionApply,
  onExtensionClear,
  pathPrefix,
  onPathPrefixChange,
  onPathPrefixClear,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useI18n();

  return (
    <Collapse in={expanded} unmountOnExit>
      <Box
        sx={{
          mt: 1,
          p: isSmallScreen ? 1.5 : 2,
          borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
          border: (themeArg) => `1px solid ${themeArg.palette.divider}`,
          backgroundColor: (themeArg) => themeArg.palette.action.hover,
        }}
      >
        <Stack spacing={isSmallScreen ? 1 : 1.5}>
          <Typography variant="subtitle2" color="text.secondary">
            {t("search.filter.title")}
          </Typography>

          <Stack direction="row" spacing={isSmallScreen ? 0.75 : 1} flexWrap="wrap" useFlexGap>
            {availableBranches.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("search.filter.noBranches")}
              </Typography>
            ) : (
              availableBranches.map((branch) => {
                const isCurrentBranch =
                  branch === currentBranch || (currentBranch === "" && branch === defaultBranch);
                const selected =
                  branchFilter.length === 0 ? isCurrentBranch : branchFilter.includes(branch);
                return (
                  <Chip
                    key={branch}
                    label={branch}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    size={isSmallScreen ? "small" : "medium"}
                    onClick={() => {
                      onBranchToggle(branch);
                    }}
                    sx={{ borderRadius: g3BorderRadius({ radius: 14, smoothness: 0.8 }) }}
                  />
                );
              })
            )}
            {branchFilter.length > 0 && (
              <Chip
                label={t("search.filter.clear")}
                onClick={onClearBranches}
                onDelete={onClearBranches}
                color="secondary"
                variant="outlined"
                size={isSmallScreen ? "small" : "medium"}
                sx={{ borderRadius: g3BorderRadius({ radius: 14, smoothness: 0.8 }) }}
              />
            )}
          </Stack>

          <TextField
            label={t("search.filter.extensionLabel")}
            value={extensionInput}
            onChange={(event) => {
              onExtensionInputChange(event.target.value);
            }}
            onBlur={onExtensionApply}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onExtensionApply();
              }
            }}
            placeholder={t("search.filter.extensionPlaceholder")}
            size={isSmallScreen ? "small" : "medium"}
            fullWidth
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
                endAdornment:
                  extensionInput.trim().length > 0 ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={onExtensionClear}
                        sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
              },
            }}
          />

          <TextField
            label={t("search.filter.pathLabel")}
            value={pathPrefix}
            onChange={(event) => {
              onPathPrefixChange(event.target.value);
            }}
            placeholder={t("search.filter.pathPlaceholder")}
            size={isSmallScreen ? "small" : "medium"}
            fullWidth
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
                endAdornment:
                  pathPrefix.trim().length > 0 ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={onPathPrefixClear}
                        sx={{ borderRadius: g3BorderRadius(G3_PRESETS.button) }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
              },
            }}
          />
        </Stack>
      </Box>
    </Collapse>
  );
};
