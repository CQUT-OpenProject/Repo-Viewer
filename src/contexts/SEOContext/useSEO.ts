import { useMetadata } from "@/contexts/MetadataContext/context";
import type { MetadataContextType } from "@/contexts/MetadataContext/context";

/**
 * SEO数据接口
 */
interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

/**
 * useSEO Hook返回值类型
 */
export type UseSEOResult = MetadataContextType & {
  /** 重置SEO信息 */
  resetSEO: () => void;
  /** 更新SEO信息 */
  updateSEO: (data: Partial<SEOData>) => void;
};

/**
 * 使用SEO Hook
 *
 * 提供SEO元数据的管理功能，包括设置和重置。
 *
 * @returns SEO管理函数和状态
 */
export const useSEO = (): UseSEOResult => {
  const metadata = useMetadata();

  const resetSEO = (): void => {
    metadata.resetMetadata();
  };

  const updateSEO = (data: Partial<SEOData>): void => {
    metadata.updateMetadata(data);
  };

  return {
    ...metadata,
    resetSEO,
    updateSEO,
  };
};
