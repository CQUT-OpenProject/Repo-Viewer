import React from "react";
import { Box, Button, useTheme } from "@mui/material";
import { g3BorderRadius, G3_PRESETS } from "@/theme/g3Curves";
import type { ImageThumbnailProps } from "./types";
import { useI18n } from "@/contexts/I18nContext";

/**
 * 图片缩略图组件
 *
 * 显示图片的缩略图，点击后打开完整预览。
 */
const ImageThumbnail: React.FC<ImageThumbnailProps> = ({
  imageUrl,
  fileName,
  thumbnailSize,
  aspectRatio,
  shouldLoad,
  onOpenPreview,
  onLoad,
  onError,
  imgRef,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const normalizedFileName =
    typeof fileName === "string" && fileName.trim().length > 0 ? fileName : undefined;
  const altText = normalizedFileName ?? "缩略图";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
      data-oid="sma03t:"
    >
      {/* 缩略图容器 */}
      <Box
        sx={{
          width: thumbnailSize.width,
          height: thumbnailSize.height,
          overflow: "hidden",
          cursor: "pointer",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: g3BorderRadius(G3_PRESETS.image),
          ...(typeof aspectRatio === "number" && aspectRatio > 0
            ? {
                aspectRatio,
                height: "auto",
              }
            : {}),
          "&:hover": {
            boxShadow: theme.shadows[2],
          },
        }}
        onClick={onOpenPreview}
        data-oid="4vk_mgq"
      >
        <img
          ref={imgRef}
          src={shouldLoad ? imageUrl : ""}
          alt={altText}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
          }}
          onLoad={onLoad}
          onError={onError}
          data-oid="..bfs6c"
        />
      </Box>

      {/* 查看大图按钮 */}
      <Button
        variant="contained"
        onClick={onOpenPreview}
        aria-label={t("ui.image.openPreview")}
        data-oid="otw7voa"
      >
        {t("ui.image.openPreview")}
      </Button>
    </Box>
  );
};

export default ImageThumbnail;
