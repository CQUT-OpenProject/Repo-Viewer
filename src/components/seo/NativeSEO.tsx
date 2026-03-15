import React from "react";
import { useMetadata } from "@/contexts/MetadataContext/context";
import { buildAbsoluteAppUrl } from "@/utils/routing/basePath";

/**
 * NativeSEO组件属性接口
 */
interface NativeSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  noindex?: boolean;
  canonical?: string;
}

/**
 * NativeSEO组件 - 使用React 19原生元数据功能设置页面的元数据
 * 支持标题、描述、关键词、Open Graph标签
 */
const NativeSEO: React.FC<NativeSEOProps> = ({
  title,
  description,
  keywords,
  ogImage,
  noindex = false,
  canonical,
}) => {
  // 从Metadata上下文获取当前SEO状态
  const metadata = useMetadata();

  const normalizeString = (value?: string): string =>
    typeof value === "string" ? value.trim() : "";

  // 使用传入的值，如果没有则使用上下文中的默认值
  const normalizedTitle = normalizeString(title);
  const normalizedDescription = normalizeString(description);
  const normalizedKeywords = normalizeString(keywords);
  const normalizedOgImage = normalizeString(ogImage);

  const metaTitle = normalizedTitle.length > 0 ? normalizedTitle : metadata.title;
  const metaDescription =
    normalizedDescription.length > 0 ? normalizedDescription : metadata.description;
  const metaKeywords = normalizedKeywords.length > 0 ? normalizedKeywords : metadata.keywords;
  const metaOgImage = normalizedOgImage.length > 0 ? normalizedOgImage : metadata.ogImage;

  // 确保ogImage是完整URL
  const fullOgImageUrl = metaOgImage.startsWith("http")
    ? metaOgImage
    : buildAbsoluteAppUrl(metaOgImage);

  // 获取当前规范URL（canonical）
  const normalizedCanonical = normalizeString(canonical);
  const canonicalUrl = normalizedCanonical.length > 0 ? normalizedCanonical : window.location.href;

  return (
    <>
      {/* React 19原生元标签支持 */}
      <title data-oid="49bkxr2">{metaTitle}</title>
      <meta name="description" content={metaDescription} data-oid="fj1dqmk" />
      {metaKeywords.length > 0 ? (
        <meta name="keywords" content={metaKeywords} data-oid="m:_df6k" />
      ) : null}

      {/* 规范链接和索引控制 */}
      <link rel="canonical" href={canonicalUrl} data-oid="2kjm6oq" />
      {noindex && <meta name="robots" content="noindex, nofollow" data-oid="pvnw5h5" />}

      {/* Open Graph标签 - 用于社交媒体分享 */}
      <meta property="og:title" content={metaTitle} data-oid="v3.fbm." />
      <meta property="og:description" content={metaDescription} data-oid="73sama8" />
      <meta property="og:image" content={fullOgImageUrl} data-oid="marbcjk" />
      <meta property="og:url" content={canonicalUrl} data-oid="8u43ypl" />
      <meta property="og:type" content="website" data-oid="vj3-ill" />
      <meta property="og:site_name" content={metaTitle} data-oid="vax8:o5" />

      {/* 其他常用元标签 */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" data-oid="wr_5f5z" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" data-oid="fxgfwa5" />
      <meta name="language" content="Chinese" data-oid="axk0m1l" />
    </>
  );
};

export default NativeSEO;
