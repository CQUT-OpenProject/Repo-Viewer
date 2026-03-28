import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  ButtonBase,
  CircularProgress,
  ClickAwayListener,
  useTheme,
} from "@mui/material";
import { useContentContext } from "@/contexts/unified";
import { useI18n } from "@/contexts/I18nContext";

/**
 * 分支切换器组件属性接口
 */
interface BranchSwitcherProps {
  /** 是否显示标签 */
  showLabel?: boolean;
}

/**
 * 分支切换器组件
 *
 * 提供Git分支选择和切换功能，支持动画和响应式设计。
 */
const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ showLabel = true }) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { currentBranch, branches, branchLoading, setCurrentBranch, refresh } = useContentContext();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingBranch, setAnimatingBranch] = useState<string>("");
  const [animatingBranchStartY, setAnimatingBranchStartY] = useState<number>(0);
  const open = Boolean(anchorEl);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const CHARS_PER_LINE = 12;
  const MAX_VISIBLE_LINES = 2;
  const getDisplayBranchName = (branchName: string): string =>
    branchName !== "" ? branchName : "main";

  // 处理分支名显示为最多两行，并对过长文本进行省略
  const formatBranchName = (branchName: string): string[] => {
    const normalized = branchName.trim();

    if (normalized.length <= CHARS_PER_LINE) {
      return [normalized];
    }

    const separators = ["/", "-", "_"];
    const lines: string[] = [];
    let remaining = normalized;

    while (remaining.length > 0 && lines.length < MAX_VISIBLE_LINES) {
      if (lines.length === MAX_VISIBLE_LINES - 1) {
        if (remaining.length > CHARS_PER_LINE) {
          const truncated = remaining.substring(0, Math.max(CHARS_PER_LINE - 3, 0));
          lines.push(`${truncated}...`);
        } else {
          lines.push(remaining);
        }
        break;
      }

      const searchLimit = Math.min(remaining.length, CHARS_PER_LINE);
      let splitIndex = -1;

      for (let i = searchLimit; i > 0; i--) {
        const char = remaining[i - 1];
        if (char !== undefined && separators.includes(char)) {
          splitIndex = i;
          break;
        }
      }

      if (splitIndex === -1) {
        splitIndex = searchLimit;
      }

      lines.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex);
    }

    return lines;
  };

  const containerWidth = CHARS_PER_LINE * 8 + 16;
  const getBranchHeight = (branchName: string): number => {
    const branchLines = formatBranchName(getDisplayBranchName(branchName));
    return branchLines.length * 14 + 14;
  };
  const getCurrentBranchHeight = (): number =>
    getBranchHeight(isAnimating && animatingBranch !== "" ? animatingBranch : currentBranch);
  const getCollapsedBranchLines = (): string[] =>
    formatBranchName(
      getDisplayBranchName(isAnimating && animatingBranch !== "" ? animatingBranch : currentBranch),
    );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(anchorEl !== null ? null : event.currentTarget);
  };

  const handleClose = () => {
    if (!isAnimating) {
      setAnchorEl(null);
    }
  };

  const handleBranchSelect = (branch: string) => {
    if (branch === currentBranch || isAnimating) {
      return;
    }

    // 计算被选中分支的起始Y位置（相对于容器顶部）
    const otherBranches = branches.filter((b) => b !== currentBranch);
    const selectedIndex = otherBranches.findIndex((b) => b === branch);

    let startY = 0;
    for (let i = 0; i < selectedIndex; i++) {
      const branchAtIndex = otherBranches[i];
      if (branchAtIndex !== undefined) {
        const branchLines = formatBranchName(branchAtIndex);
        startY += branchLines.length * 14 + 14;
      }
    }

    setAnimatingBranch(branch);
    setAnimatingBranchStartY(startY);
    setIsAnimating(true);

    // 等待动画完成后再切换分支
    setTimeout(() => {
      setCurrentBranch(branch);
      setIsAnimating(false);
      setAnchorEl(null);
      setAnimatingBranch("");
      setAnimatingBranchStartY(0);

      // 切换分支后触发刷新
      setTimeout(() => {
        refresh();
      }, 100);
    }, 300);
  };

  if (branchLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <CircularProgress size={12} sx={{ color: "text.secondary" }} />
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
          }}
        >
          {t("ui.branch.loading")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      {showLabel && (
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
          }}
        >
          {t("ui.branch.label")}
        </Typography>
      )}

      <ClickAwayListener onClickAway={handleClose}>
        <Box
          sx={{
            position: "relative",
            display: "inline-block",
            minWidth: containerWidth,
          }}
        >
          <Box
            ref={buttonRef}
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: open ? undefined : 0,
              minWidth: containerWidth,
              width: open ? containerWidth : undefined,
              borderRadius: "8px",
              border: `1px solid ${
                theme.palette.mode === "light"
                  ? "rgba(103, 80, 164, 0.2)"
                  : "rgba(208, 188, 255, 0.2)"
              }`,
              backgroundColor: open
                ? theme.palette.mode === "light"
                  ? theme.palette.background.paper
                  : theme.palette.background.paper
                : theme.palette.mode === "light"
                  ? "rgba(103, 80, 164, 0.04)"
                  : "rgba(208, 188, 255, 0.04)",
              overflow: "visible",
              transition:
                "height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              height:
                open && !isAnimating
                  ? (() => {
                      const totalHeight = branches
                        .filter((branch) => branch !== currentBranch)
                        .reduce((acc, branch) => acc + getBranchHeight(branch), 0);
                      const currentBranchHeight = getBranchHeight(currentBranch);
                      return Math.min(totalHeight + currentBranchHeight, 280);
                    })()
                  : getCurrentBranchHeight(),
              maxHeight: 280,
              borderColor: open
                ? theme.palette.primary.main
                : theme.palette.mode === "light"
                  ? "rgba(103, 80, 164, 0.2)"
                  : "rgba(208, 188, 255, 0.2)",
              zIndex: open ? 1000 : 1,
              boxShadow: open
                ? theme.palette.mode === "light"
                  ? "0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)"
                  : "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)"
                : "none",
            }}
          >
            {/* 其他分支的循环滚动列表容器（仅展开且未动画时显示） */}
            {open && !isAnimating && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: getCurrentBranchHeight(),
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  {branches
                    .filter((b) => b !== currentBranch)
                    .map((branch, index) => {
                      const branchLines = formatBranchName(branch);
                      return (
                        <ButtonBase
                          key={branch}
                          onClick={() => {
                            handleBranchSelect(branch);
                          }}
                          disabled={isAnimating}
                          sx={{
                            px: 1,
                            height: branchLines.length * 14 + 14,
                            minHeight: branchLines.length * 14 + 14,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            fontSize: "0.75rem",
                            fontWeight: 400,
                            color: "text.primary",
                            backgroundColor: "transparent",
                            borderBottom: `1px dashed ${theme.palette.divider}`,
                            borderRadius: index === 0 ? "8px 8px 0 0" : "0",
                            transition:
                              "background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor:
                                theme.palette.mode === "light"
                                  ? "rgba(103, 80, 164, 0.12)"
                                  : "rgba(208, 188, 255, 0.12)",
                            },
                            "&:disabled": {
                              opacity: 0.5,
                              cursor: "not-allowed",
                            },
                          }}
                        >
                          {branchLines.map((line, lineIndex) => (
                            <Box
                              key={lineIndex}
                              sx={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                width: "100%",
                                textAlign: "center",
                                lineHeight: "14px",
                              }}
                            >
                              {line}
                            </Box>
                          ))}
                        </ButtonBase>
                      );
                    })}
                </Box>
              </Box>
            )}

            {isAnimating &&
              animatingBranch !== "" &&
              (() => {
                const animatingBranchLines = formatBranchName(animatingBranch);
                const animatingBranchHeight = animatingBranchLines.length * 14 + 14;

                // 使用与当前分支按钮相同的定位方式：bottom: 0
                // 起始位置：从底部向上偏移到原来在列表中的位置
                // 计算：展开时的总高度 - 收缩后的高度 - animatingBranchStartY
                const expandedHeight = (() => {
                  const totalHeight = branches
                    .filter((branch) => branch !== currentBranch)
                    .reduce((acc, branch) => acc + getBranchHeight(branch), 0);
                  const currentBranchHeight = getBranchHeight(currentBranch);
                  return Math.min(totalHeight + currentBranchHeight, 280);
                })();

                // 从底部算起，需要向上偏移的距离
                const startOffsetFromBottom =
                  expandedHeight - animatingBranchHeight - animatingBranchStartY;

                return (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      px: 1,
                      height: animatingBranchHeight,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                      backgroundColor: "transparent",
                      pointerEvents: "none",
                      transform: `translateY(${String(-startOffsetFromBottom)}px)`,
                      animation: "moveToBottom 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards",
                      "@keyframes moveToBottom": {
                        "0%": {
                          transform: `translateY(${String(-startOffsetFromBottom)}px)`,
                        },
                        "100%": {
                          transform: "translateY(0px)",
                        },
                      },
                    }}
                  >
                    {animatingBranchLines.map((line, lineIndex) => (
                      <Box
                        key={lineIndex}
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%",
                          textAlign: "center",
                          lineHeight: "14px",
                        }}
                      >
                        {line}
                      </Box>
                    ))}
                  </Box>
                );
              })()}
            <ButtonBase
              onClick={() => {
                if (buttonRef.current !== null) {
                  handleClick({
                    currentTarget: buttonRef.current,
                  } as unknown as React.MouseEvent<HTMLElement>);
                }
              }}
              disabled={isAnimating || branches.length === 0}
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                px: 1,
                height: getCurrentBranchHeight(),
                minHeight: getCurrentBranchHeight(),
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: open ? theme.palette.primary.main : "text.primary",
                backgroundColor: "transparent",
                cursor: "pointer",
                borderRadius: open ? "0 0 8px 8px" : "8px",
                borderTop: open ? `1px dashed ${theme.palette.divider}` : "none",
                transition:
                  "color 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                overflow: "hidden",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? "rgba(103, 80, 164, 0.08)"
                      : "rgba(208, 188, 255, 0.08)",
                },
                "&:disabled": {
                  opacity: 0.5,
                  cursor: "not-allowed",
                },
              }}
            >
              {getCollapsedBranchLines().map((line, lineIndex) => (
                <Box
                  key={lineIndex}
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                    textAlign: "center",
                    lineHeight: "14px",
                    opacity: isAnimating ? 0 : 1,
                    transition: "opacity 0s",
                  }}
                >
                  {line}
                </Box>
              ))}
            </ButtonBase>
          </Box>
          {/* 占位元素，保持外层容器宽度固定 */}
          <Box
            sx={{
              height: getCurrentBranchHeight(),
              width: containerWidth,
              visibility: "hidden",
            }}
          />
        </Box>
      </ClickAwayListener>
    </Box>
  );
};

export default BranchSwitcher;
