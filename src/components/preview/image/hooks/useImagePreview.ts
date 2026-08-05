import { useState, useRef, useEffect } from "react";
import type { UseImagePreviewReturn, ImagePreviewProps } from "../types";

export const useImagePreview = ({
  isFullScreen = false,
  lazyLoad = true,
  onClose,
}: Pick<ImagePreviewProps, "isFullScreen" | "lazyLoad" | "onClose">): UseImagePreviewReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [fullScreenMode, setFullScreenMode] = useState(isFullScreen);
  const [scale, setScale] = useState(1);
  const [shouldLoad, setShouldLoad] = useState(() => {
    if (!lazyLoad) {
      return true;
    }
    return typeof IntersectionObserver === "undefined";
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!lazyLoad || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries[0]?.isIntersecting ?? false;
        if (isIntersecting) {
          setShouldLoad(true);
          const image = imgRef.current;
          if (image !== null) {
            observer.unobserve(image);
          }
        }
      },
      { root: null, rootMargin: "100px", threshold: 0.1 },
    );

    observerRef.current = observer;
    const image = imgRef.current;
    if (image !== null) {
      observer.observe(image);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [lazyLoad]);

  return {
    loading,
    error,
    rotation,
    fullScreenMode,
    scale,
    shouldLoad,
    imgRef,
    handleRotateLeft: () => {
      setRotation((prev) => prev - 90);
    },
    handleRotateRight: () => {
      setRotation((prev) => prev + 90);
    },
    toggleFullScreen: () => {
      setFullScreenMode((prev) => !prev);
    },
    handleClosePreview: () => {
      if (fullScreenMode) {
        setFullScreenMode(false);
      }
      if (typeof onClose === "function") {
        onClose();
      }
    },
    handleImageLoad: () => {
      setLoading(false);
    },
    handleImageError: () => {
      setLoading(false);
      setError(true);
    },
    handleTransformed: (newScale: number) => {
      setScale(newScale);
    },
    setError,
    resetLoadingState: () => {
      setLoading(true);
      setError(false);
      setRotation(0);
      setScale(1);
    },
    resetStateForCachedImage: () => {
      setLoading(false);
      setError(false);
      setRotation(0);
      setScale(1);
    },
  };
};
