import React, { useMemo } from "react";
import { getSiteConfig } from "@/config";
import { useI18n } from "@/contexts/I18nContext";
import { buildAbsoluteAppUrl } from "@/utils/routing/basePath";
import { getLanguageCode } from "@/utils/i18n/locale";

interface PageSEOProps {
  title?: string;
  description?: string;
  filePath?: string;
  fileType?: string;
  isDirectory?: boolean;
  repoOwner?: string;
  repoName?: string;
  keywords?: string;
  ogImage?: string;
  noindex?: boolean;
  canonical?: string;
}

function normalizeString(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function getHtmlLanguage(locale: string): string {
  const lang = getLanguageCode(locale) || "en";
  if (lang === "zh") {
    return "Chinese";
  }
  if (lang === "ja") {
    return "Japanese";
  }
  return "English";
}

const PageSEO: React.FC<PageSEOProps> = (props) => {
  const { t, locale } = useI18n();
  const site = getSiteConfig();

  const meta = useMemo(() => {
    const normalizedTitle = normalizeString(props.title);
    const normalizedFilePath = normalizeString(props.filePath);
    const normalizedDescription = normalizeString(props.description);
    const normalizedFileType = normalizeString(props.fileType);
    const normalizedRepoOwner = normalizeString(props.repoOwner);
    const normalizedRepoName = normalizeString(props.repoName);
    const normalizedKeywords = normalizeString(props.keywords);
    const normalizedOgImage = normalizeString(props.ogImage);
    const normalizedCanonical = normalizeString(props.canonical);

    if (normalizedFilePath.length === 0 && normalizedTitle.length === 0) {
      return {
        title: site.title,
        description: site.description,
        keywords: normalizedKeywords.length > 0 ? normalizedKeywords : site.keywords,
        ogImage: normalizedOgImage.length > 0 ? normalizedOgImage : site.ogImage,
        canonical: normalizedCanonical.length > 0 ? normalizedCanonical : window.location.href,
      };
    }

    let seoTitle = normalizedTitle;
    if (normalizedFilePath.length > 0 && seoTitle.length === 0) {
      const fileNameMatch = /([^/]+)$/.exec(normalizedFilePath);
      seoTitle = fileNameMatch?.[1] ?? normalizedFilePath;
    }
    const finalTitle = `${seoTitle} | Repo-Viewer`;

    let seoDescription = normalizedDescription;
    if (seoDescription.length === 0) {
      if (props.isDirectory === true) {
        const pathLabel =
          normalizedFilePath.length > 0 ? normalizedFilePath : t("ui.seo.repository");
        seoDescription = t("ui.seo.directoryDescription", { path: pathLabel });
      } else {
        const fileLabel = normalizedFilePath.length > 0 ? normalizedFilePath : t("ui.seo.file");
        seoDescription = t("ui.seo.fileDescription", { path: fileLabel });
        if (normalizedFileType.length > 0) {
          seoDescription += t("ui.seo.fileTypeSuffix", { fileType: normalizedFileType });
        }
      }
      if (normalizedRepoOwner.length > 0 && normalizedRepoName.length > 0) {
        seoDescription += t("ui.seo.repoSuffix", {
          owner: normalizedRepoOwner,
          repo: normalizedRepoName,
        });
      }
    }

    return {
      title: finalTitle,
      description: seoDescription,
      keywords: normalizedKeywords.length > 0 ? normalizedKeywords : site.keywords,
      ogImage: normalizedOgImage.length > 0 ? normalizedOgImage : site.ogImage,
      canonical: normalizedCanonical.length > 0 ? normalizedCanonical : window.location.href,
    };
  }, [
    props.title,
    props.filePath,
    props.description,
    props.fileType,
    props.isDirectory,
    props.repoOwner,
    props.repoName,
    props.keywords,
    props.ogImage,
    props.canonical,
    site.title,
    site.description,
    site.keywords,
    site.ogImage,
    t,
  ]);

  const fullOgImageUrl = meta.ogImage.startsWith("http")
    ? meta.ogImage
    : buildAbsoluteAppUrl(meta.ogImage);

  return (
    <>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {meta.keywords.length > 0 ? <meta name="keywords" content={meta.keywords} /> : null}
      <link rel="canonical" href={meta.canonical} />
      {props.noindex === true ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:image" content={fullOgImageUrl} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={meta.title} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content={getHtmlLanguage(locale)} />
    </>
  );
};

export default PageSEO;
