import React, { useState } from "react";
import type { GitHubContent } from "@/types";
import {
  transformImageSrc,
  handleImageError,
  handleImageLoad,
  tryDirectImageLoad,
} from "../utils/imageUtils";
import type { ImageLoadingState } from "../utils/imageUtils";
import { ImageErrorDisplay } from "./ImageErrorDisplay";

/**
 * Markdown图片组件属性接口
 */
interface MarkdownImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "style" | "onLoad" | "onError"
> {
  src?: string;
  alt?: string;
  style?: React.CSSProperties | undefined;
  previewingItem: GitHubContent | null;
  imageState: ImageLoadingState;
  currentBranch?: string | undefined;
}

/**
 * Markdown图片组件
 *
 * 处理Markdown中的图片显示，支持代理加载和错误处理。
 */
export const MarkdownImage: React.FC<MarkdownImageProps> = ({
  src,
  alt,
  style,
  previewingItem,
  imageState,
  currentBranch,
  ...rest
}) => {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageFailed, setIsImageFailed] = useState(
    normalizedSrc.length > 0 && imageState.failedImages.has(normalizedSrc),
  );

  const { imgSrc, originalSrc } = transformImageSrc(src, previewingItem, currentBranch);
  const sanitizedImgSrc = imgSrc.trim();
  const sanitizedOriginalSrc = originalSrc.trim();
  const stateKey =
    sanitizedImgSrc.length > 0
      ? sanitizedImgSrc
      : sanitizedOriginalSrc.length > 0
        ? sanitizedOriginalSrc
        : originalSrc;
  const elementIdSource = stateKey.length > 0 ? stateKey : "fallback-placeholder";
  const imgId = `img-${elementIdSource.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const resolvedImgSrc = stateKey.length > 0 ? stateKey : undefined;

  const handleRetry = (): void => {
    setIsImageFailed(false);

    const trimmedStateKey = stateKey.trim();
    if (trimmedStateKey.length > 0) {
      imageState.failedImages.delete(trimmedStateKey);
    }

    const directSrc = tryDirectImageLoad(imgSrc);
    if (directSrc !== null && directSrc.trim().length > 0) {
      const imageElement = document.getElementById(imgId);
      if (imageElement instanceof HTMLImageElement) {
        imageElement.src = directSrc;
      }
    } else {
      window.location.reload();
    }
  };

  if (isImageFailed) {
    return (
      <ImageErrorDisplay
        imgSrc={stateKey.length > 0 ? stateKey : originalSrc}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <img
      src={resolvedImgSrc}
      id={imgId}
      style={{
        maxWidth: "100%",
        height: "auto",
        opacity: isImageLoaded ? 1 : 0.7,
        transition: "opacity 0.3s ease",
        display: "block",
        margin: "1em auto",
        ...style,
      }}
      alt={alt ?? "图片"}
      {...rest}
      loading="lazy"
      className={isImageLoaded ? "loaded" : undefined}
      onLoad={(event) => {
        event.currentTarget.classList.add("loaded");
        event.currentTarget.style.opacity = "1";
        handleImageLoad(stateKey, imageState, setIsImageLoaded);
      }}
      onError={(event) => {
        const newSrc = handleImageError(stateKey, originalSrc, imageState, setIsImageFailed);
        if (newSrc !== null && newSrc.trim().length > 0 && newSrc !== stateKey) {
          event.currentTarget.src = newSrc;
        }
      }}
      data-oid="1jtw89v"
    />
  );
};
