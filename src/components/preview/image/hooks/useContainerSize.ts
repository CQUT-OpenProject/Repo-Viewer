import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";

interface ContainerSize {
  width: number;
  height: number;
}

interface UseContainerSizeReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  containerSize: ContainerSize;
}

/**
 * 容器尺寸追踪 Hook
 *
 * 使用 ResizeObserver 追踪容器尺寸变化
 */
export function useContainerSize(): UseContainerSizeReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }

    const updateSize = (): void => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry !== undefined) {
          const { width, height } = entry.contentRect;
          setContainerSize({ width, height });
        }
      });
      observer.observe(container);
      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return {
    containerRef,
    containerSize,
  };
}
