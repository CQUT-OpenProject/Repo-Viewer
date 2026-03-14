import React, { useCallback } from "react";
import { useTheme } from "@mui/material";

/**
 * 检查链接是否为外部链接
 */
const isExternalLink = (href: string): boolean => {
  // 空链接视为外部链接（不处理）
  if (href.length === 0 || href.trim().length === 0) {
    return true;
  }

  const trimmedHref = href.trim();

  // 以协议开头的链接视为外部链接
  if (/^(https?:\/\/|\/\/|mailto:|tel:|ftp:|file:)/i.test(trimmedHref)) {
    return true;
  }

  // 以 # 开头的锚点链接视为外部链接（页内跳转）
  if (trimmedHref.startsWith("#")) {
    return true;
  }

  // 其他情况视为内部链接（相对路径）
  return false;
};

/**
 * Markdown链接组件属性接口
 */
interface MarkdownLinkProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "style" | "target" | "rel"
> {
  href?: string;
  style?: React.CSSProperties | undefined;
  children?: React.ReactNode;
  /** 内部链接点击回调 */
  onInternalLinkClick?: (relativePath: string) => void;
}

/**
 * Markdown链接组件
 *
 * 自定义Markdown中的链接样式。
 * - 外部链接：在新标签页中打开
 * - 内部链接：触发回调进行应用内导航
 */
export const MarkdownLink: React.FC<MarkdownLinkProps> = ({
  href,
  children,
  style,
  onInternalLinkClick,
  ...props
}) => {
  const theme = useTheme();
  const resolvedHref = href?.trim() ?? "";
  const hasValidHref = resolvedHref.length > 0;
  const isExternal = isExternalLink(resolvedHref);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // 如果是外部链接或没有内部链接回调，使用默认行为
      if (isExternal || onInternalLinkClick === undefined) {
        return;
      }

      // 阻止默认行为，使用内部导航
      e.preventDefault();
      e.stopPropagation();
      onInternalLinkClick(resolvedHref);
    },
    [isExternal, onInternalLinkClick, resolvedHref],
  );

  // 对于外部链接，使用 target="_blank"
  // 对于内部链接，不设置 target，通过 onClick 处理
  const linkProps = isExternal
    ? {
        href: hasValidHref ? resolvedHref : undefined,
        target: "_blank" as const,
        rel: "noopener noreferrer",
      }
    : {
        href: hasValidHref ? resolvedHref : undefined,
        // 内部链接不设置 target，保持在当前页面
      };

  return (
    <a
      {...props}
      {...linkProps}
      onClick={handleClick}
      style={{
        color: theme.palette.primary.main,
        textDecoration: "none",
        cursor: "pointer",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = "underline";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = "none";
      }}
      data-oid="wswk6df"
    >
      {children}
    </a>
  );
};
