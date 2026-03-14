import { useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { BreadcrumbSegment } from "@/types";

interface UseBreadcrumbLayoutOptions {
  breadcrumbSegments: BreadcrumbSegment[];
  isSmallScreen: boolean;
}

interface UseBreadcrumbLayoutReturn {
  breadcrumbsMaxItems: number;
  breadcrumbsContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * 面包屑布局 Hook
 *
 * 处理面包屑导航的响应式布局和折叠逻辑
 */
export function useBreadcrumbLayout({
  breadcrumbSegments,
  isSmallScreen,
}: UseBreadcrumbLayoutOptions): UseBreadcrumbLayoutReturn {
  const breadcrumbsContainerRef = useRef<HTMLDivElement>(null);
  const breadcrumbsMaxItems = useMemo(() => {
    const segmentCount = breadcrumbSegments.length;

    if (isSmallScreen) {
      return segmentCount > 3 ? 3 : 0;
    }

    if (segmentCount <= 3) {
      return 0;
    }

    return segmentCount > 8 ? 8 : 0;
  }, [breadcrumbSegments.length, isSmallScreen]);

  return {
    breadcrumbsMaxItems,
    breadcrumbsContainerRef,
  };
}
