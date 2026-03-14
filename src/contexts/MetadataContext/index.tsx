import React, { useState, type ReactNode } from "react";
import { MetadataContext, type MetadataData, DEFAULT_METADATA } from "./context";

/**
 * 元数据提供者组件属性接口
 */
interface MetadataProviderProps {
  children: ReactNode;
}

/**
 * 元数据提供者组件
 *
 * 管理页面元数据（标题、描述、关键词等），为SEO组件提供数据。
 */
export const MetadataProvider: React.FC<MetadataProviderProps> = ({ children }) => {
  const [title, setTitle] = useState<string>(DEFAULT_METADATA.title);
  const [description, setDescription] = useState<string>(DEFAULT_METADATA.description);
  const [keywords, setKeywords] = useState<string>(DEFAULT_METADATA.keywords);
  const [ogImage, setOgImage] = useState<string>(DEFAULT_METADATA.ogImage);

  // 重置SEO数据到默认值
  const resetMetadata = (): void => {
    setTitle(DEFAULT_METADATA.title);
    setDescription(DEFAULT_METADATA.description);
    setKeywords(DEFAULT_METADATA.keywords);
    setOgImage(DEFAULT_METADATA.ogImage);
  };

  // 批量更新SEO数据
  const updateMetadata = (data: Partial<MetadataData>): void => {
    if (typeof data.title === "string") {
      setTitle(data.title);
    }
    if (typeof data.description === "string") {
      setDescription(data.description);
    }
    if (typeof data.keywords === "string") {
      setKeywords(data.keywords);
    }
    if (typeof data.ogImage === "string") {
      setOgImage(data.ogImage);
    }
  };

  return (
    <MetadataContext.Provider
      value={{
        title,
        description,
        keywords,
        ogImage,
        setTitle,
        setDescription,
        setKeywords,
        setOgImage,
        resetMetadata,
        updateMetadata,
      }}
      data-oid="2::o-n6"
    >
      {children}
    </MetadataContext.Provider>
  );
};

export default MetadataProvider;
