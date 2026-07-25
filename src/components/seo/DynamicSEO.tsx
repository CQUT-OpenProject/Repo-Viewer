import React, { useEffect } from "react";
import { useMetadata } from "@/contexts/MetadataContext/context";
import NativeSEO from "./NativeSEO";

/**
 * 动态SEO组件属性接口
 */
interface DynamicSEOProps {
  title?: string;
  description?: string;
  filePath?: string;
  fileType?: string;
  isDirectory?: boolean;
  repoOwner?: string;
  repoName?: string;
}

/**
 * 动态SEO组件 - 根据当前查看的文件或目录动态更新SEO信息
 */
const DynamicSEO: React.FC<DynamicSEOProps> = ({
  title,
  description,
  filePath,
  fileType,
  isDirectory = false,
  repoOwner,
  repoName,
}) => {
  const { updateMetadata, resetMetadata } = useMetadata();

  useEffect(() => {
    const normalizeString = (value?: string): string =>
      typeof value === "string" ? value.trim() : "";

    const normalizedTitle = normalizeString(title);
    const normalizedFilePath = normalizeString(filePath);
    const normalizedDescription = normalizeString(description);
    const normalizedFileType = normalizeString(fileType);
    const normalizedRepoOwner = normalizeString(repoOwner);
    const normalizedRepoName = normalizeString(repoName);

    // 如果没有足够的信息，则使用默认SEO设置
    if (normalizedFilePath.length === 0 && normalizedTitle.length === 0) {
      resetMetadata();
      return;
    }

    // 构建SEO标题
    let seoTitle = normalizedTitle;
    if (normalizedFilePath.length > 0 && seoTitle.length === 0) {
      const fileNameMatch = /([^/]+)$/.exec(normalizedFilePath);
      seoTitle = fileNameMatch?.[1] ?? normalizedFilePath;
    }

    // 添加"Repo-Viewer"到标题中，不再显示仓库信息
    const finalTitle = `${seoTitle} | Repo-Viewer`;

    // 构建SEO描述
    let seoDescription = normalizedDescription;
    if (seoDescription.length === 0) {
      if (isDirectory) {
        const pathLabel = normalizedFilePath.length > 0 ? normalizedFilePath : "仓库";
        seoDescription = `查看 ${pathLabel} 目录中的内容`;
      } else {
        const fileLabel = normalizedFilePath.length > 0 ? normalizedFilePath : "文件";
        seoDescription = `查看 ${fileLabel} 的详细内容`;
        if (normalizedFileType.length > 0) {
          seoDescription += `（${normalizedFileType}格式）`;
        }
      }

      if (normalizedRepoOwner.length > 0 && normalizedRepoName.length > 0) {
        seoDescription += ` - ${normalizedRepoOwner}/${normalizedRepoName} GitHub仓库`;
      }
    }

    // 更新SEO数据
    updateMetadata({
      title: finalTitle,
      description: seoDescription,
    });

    // 组件卸载时重置SEO数据
    return () => {
      resetMetadata();
    };
  }, [
    filePath,
    title,
    description,
    fileType,
    isDirectory,
    repoOwner,
    repoName,
    updateMetadata,
    resetMetadata,
  ]);

  return <NativeSEO />;
};

export default DynamicSEO;
