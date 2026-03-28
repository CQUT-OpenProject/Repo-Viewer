import React, { useMemo, useState } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import type { GitHubContent } from "@/types";
import { getContentFirstLetter } from "@/utils/sorting/contentSorting";

/**
 * 字母索引组件属性
 */
interface AlphabetIndexProps {
  /** 文件列表内容 */
  contents: GitHubContent[];
  /** 滚动到指定索引的回调 */
  onScrollToIndex: (index: number) => void;
  /** 是否显示（仅在虚拟滚动时显示） */
  visible: boolean;
}

/**
 * 字母索引组件
 *
 * 在文件列表右侧显示字母索引，支持快速跳转到对应首字母的文件。
 * 仅在虚拟滚动模式下显示。
 */
const AlphabetIndex: React.FC<AlphabetIndexProps> = ({ contents, onScrollToIndex, visible }) => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

  /**
   * 构建字母到文件索引的映射
   */
  const letterIndexMap = useMemo(() => {
    const map = new Map<string, number>();

    contents.forEach((item, index) => {
      const firstLetter = getContentFirstLetter(item);

      // 只记录每个字母第一次出现的位置
      if (!map.has(firstLetter)) {
        map.set(firstLetter, index);
      }
    });

    return map;
  }, [contents]);

  /**
   * 获取所有可用的字母（按字母顺序排序）
   */
  const availableLetters = useMemo(() => {
    return Array.from(letterIndexMap.keys()).sort((a, b) => {
      // # 排在最后
      if (a === "#") {
        return 1;
      }
      if (b === "#") {
        return -1;
      }
      return a.localeCompare(b);
    });
  }, [letterIndexMap]);

  /**
   * 处理字母点击
   */
  const handleLetterClick = (letter: string) => {
    const index = letterIndexMap.get(letter);
    if (index !== undefined) {
      setActiveIndex(letter);
      onScrollToIndex(index);

      // 短暂高亮后恢复
      setTimeout(() => {
        setActiveIndex(null);
      }, 500);
    }
  };

  // 如果没有可用字母，不渲染
  if (availableLetters.length === 0) {
    return null;
  }

  return (
    <Box
      className="alphabet-index"
      sx={{
        position: "absolute",
        right: 0,
        top: "50%",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 0.2, sm: 0.3 },
        py: { xs: 0.8, sm: 1 },
        px: { xs: 0.4, sm: 0.5 },
        borderRadius: "20px",
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: "blur(10px)",
        boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        maxHeight: { xs: "75%", sm: "80%" },
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        transform: visible ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(10px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.2s ease-out, opacity 0.2s ease-out, background-color 0.2s ease",
        "&:hover": {
          backgroundColor: alpha(theme.palette.background.paper, 0.98),
          boxShadow: `0 6px 16px ${alpha(theme.palette.common.black, 0.25)}`,
        },
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {availableLetters.map((letter) => {
        const isActive = activeIndex === letter;
        const isHovered = hoveredIndex === letter;

        return (
          <Box
            key={letter}
            onMouseEnter={() => {
              setHoveredIndex(letter);
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
            }}
            onClick={() => {
              handleLetterClick(letter);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 18, sm: 20 },
              height: { xs: 18, sm: 20 },
              borderRadius: "50%",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: isActive
                ? alpha(theme.palette.primary.main, 0.3)
                : isHovered
                  ? alpha(theme.palette.primary.main, 0.1)
                  : "transparent",
              transform: isActive || isHovered ? "scale(1.2)" : "scale(1)",
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.15),
              },
              "&:active": {
                transform: "scale(1.1)",
              },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "0.6rem", sm: "0.65rem" },
                fontWeight: isActive ? 700 : isHovered ? 600 : 500,
                color: isActive
                  ? theme.palette.primary.main
                  : isHovered
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                transition: "all 0.15s ease",
                userSelect: "none",
                lineHeight: 1,
              }}
            >
              {letter}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default AlphabetIndex;
