import React, { useMemo } from "react";
import { Box, Typography, Link, Container, useTheme } from "@mui/material";
import { BranchSwitcher } from "@/components/ui";
import { getFeaturesConfig } from "@/config";
import { useI18n } from "@/contexts/I18nContext";

declare const __APP_VERSION__: string;

/**
 * 解析页脚左侧文本配置
 * 支持格式：
 * - "[文本](链接)" - 显示可点击的链接
 * - "纯文本" - 显示纯文本
 * - "" - 不显示
 */
const parseFooterLeftText = (
  text: string,
):
  | { type: "link"; content: string; href: string }
  | { type: "text"; content: string }
  | { type: "empty" } => {
  if (text.trim() === "") {
    return { type: "empty" };
  }

  // 匹配 Markdown 链接格式: [文本](链接)
  const linkRegex = /^\[(.+?)\]\((.+?)\)$/;
  const linkMatch = linkRegex.exec(text);
  if (
    linkMatch?.[1] !== undefined &&
    linkMatch[1] !== "" &&
    linkMatch[2] !== undefined &&
    linkMatch[2] !== ""
  ) {
    return {
      type: "link",
      content: linkMatch[1],
      href: linkMatch[2],
    };
  }

  return { type: "text", content: text };
};

/**
 * 页脚组件
 *
 * 显示应用底部信息，包括分支切换器、版权信息和自定义左侧信息。
 */
const Footer: React.FC = () => {
  const version = __APP_VERSION__;
  const theme = useTheme();
  const { t } = useI18n();
  const featuresConfig = getFeaturesConfig();
  const footerLeftConfig = useMemo(
    () => parseFooterLeftText(featuresConfig.footer.leftText),
    [featuresConfig.footer.leftText],
  );
  const showFooterLeftElement = footerLeftConfig.type !== "empty";

  return (
    <Box
      component="footer"
      sx={{
        py: { xs: 1.5, sm: 2.5 },
        px: { xs: 1.5, sm: 2 },
        mt: "auto",
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: theme.palette.mode === "light" ? "#FFFBFE" : "#1C1B1F",
        transition: "background-color 0.3s, border-color 0.3s",
      }}
      data-oid="bljwygu"
    >
      <Container maxWidth="lg" data-oid="bw3i.iq">
        <Box
          sx={{
            display: { xs: "flex", sm: "grid" },
            flexDirection: { xs: "column", sm: "row" },
            gridTemplateColumns: { sm: "1fr auto 1fr" },
            gap: { xs: 1, sm: 0 },
            alignItems: "center",
          }}
          data-oid="uk5kgqo"
        >
          {/* 分支切换器 - 移动端在最上方 */}
          <Box
            sx={{
              display: { xs: "flex", sm: "flex" },
              alignItems: "center",
              justifyContent: "center",
              order: { xs: 0, sm: 2 },
              transform: { xs: "scale(0.9)", sm: "scale(1)" },
              transformOrigin: "center",
            }}
            data-oid="wukw05h"
          >
            <BranchSwitcher showLabel={true} />
          </Box>

          {/* 移动端：自定义左侧信息和RepoViewer信息在一行 / 桌面端：自定义左侧信息 */}
          <Box
            sx={{
              display: { xs: "flex", sm: "flex" },
              alignItems: "center",
              justifyContent: { xs: "center", sm: "flex-start" },
              order: { xs: 1, sm: 1 },
              flexWrap: "wrap",
              gap: { xs: showFooterLeftElement ? 0.75 : 0, sm: 0 },
              visibility: { xs: "visible", sm: showFooterLeftElement ? "visible" : "hidden" },
            }}
            data-oid="3z6-ik7"
          >
            {/* 自定义左侧信息 */}
            {showFooterLeftElement && footerLeftConfig.type === "link" ? (
              <Link
                href={footerLeftConfig.href}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  textDecoration: "none",
                  fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                  color: "text.secondary",
                  transition: "color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    color: theme.palette.primary.main,
                  },
                }}
              >
                {footerLeftConfig.content}
              </Link>
            ) : null}

            {showFooterLeftElement && footerLeftConfig.type === "text" ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                }}
              >
                {footerLeftConfig.content}
              </Typography>
            ) : null}

            {/* 分隔符 - 仅移动端显示 */}
            {showFooterLeftElement ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: { xs: "inline", sm: "none" },
                  fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                  mx: { xs: 0.375, sm: 0.5 },
                }}
              >
                •
              </Typography>
            ) : null}

            {/* RepoViewer 信息 - 移动端显示 */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: { xs: "inline", sm: "none" },
                fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                textAlign: "center",
              }}
            >
              {t("ui.footer.presentedBy")}{" "}
              <Link
                color="primary"
                href="https://github.com/CQUT-OpenProject/Repo-Viewer"
                target="_blank"
                rel="noopener"
                sx={{
                  textDecoration: "none",
                  transition: "color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    color: theme.palette.primary.dark,
                    textDecoration: "none",
                  },
                }}
              >
                RepoViewer
              </Link>
              {version !== "" && <> {version}</>}
            </Typography>
          </Box>

          {/* RepoViewer 信息 - 桌面端显示 */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: { xs: "none", sm: "block" },
              textAlign: "right",
              fontSize: "0.75rem",
              order: 3,
            }}
            data-oid="78vii.:"
          >
            {t("ui.footer.presentedBy")}{" "}
            <Link
              color="primary"
              href="https://github.com/CQUT-OpenProject/Repo-Viewer"
              target="_blank"
              rel="noopener"
              sx={{
                textDecoration: "none",
                transition: "color 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  color: theme.palette.primary.dark,
                  textDecoration: "none",
                },
              }}
              data-oid=".fmrdb9"
            >
              RepoViewer
            </Link>
            {version !== "" && <> {version}</>}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
