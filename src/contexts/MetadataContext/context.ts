import { createContext, useContext } from "react";
import { getSiteConfig } from "@/config";

/**
 * 元数据上下文类型接口
 */
export interface MetadataContextType {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setKeywords: (keywords: string) => void;
  setOgImage: (ogImage: string) => void;
  resetMetadata: () => void;
  updateMetadata: (data: Partial<MetadataData>) => void;
}

/**
 * 元数据接口
 */
export interface MetadataData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

const siteConfig = getSiteConfig();

export const DEFAULT_METADATA = {
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  ogImage: siteConfig.ogImage,
};

export const MetadataContext = createContext<MetadataContextType | null>(null);

/**
 * 使用元数据上下文Hook
 *
 * @returns 元数据上下文值
 * @throws 当在MetadataProvider外部使用时抛出错误
 */
export const useMetadata = (): MetadataContextType => {
  const context = useContext(MetadataContext);
  if (context === null) {
    throw new Error("useMetadata必须在MetadataProvider内部使用");
  }
  return context;
};
