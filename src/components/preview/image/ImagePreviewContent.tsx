import React from "react";
import { Box, Typography, IconButton, alpha, useTheme, GlobalStyles } from "@mui/material";
import {
  Replay as ReplayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ImagePreviewSkeleton } from "@/components/ui/skeletons";
import ImageToolbar from "./ImageToolbar";
import type { ImagePreviewContentProps } from "./types";
import { useAspectRatioTracker } from "./hooks/useAspectRatioTracker";
import { useContainerSize } from "./hooks/useContainerSize";
import { useDesktopNavigation } from "./hooks/useDesktopNavigation";
import { useTouchNavigation } from "./hooks/useTouchNavigation";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useStageMetrics } from "./hooks/useStageMetrics";
import { useI18n } from "@/contexts/I18nContext";

/**
 * 图片预览内容组件
 *
 * 显示图片预览主体内容，支持缩放、旋转和拖拽。
 */
const ImagePreviewContent: React.FC<ImagePreviewContentProps> = ({
  imageUrl,
  fileName,
  rotation,
  loading,
  error,
  shouldLoad,
  isSmallScreen,
  imgRef,
  className,
  style,
  toolbarProps,
  onLoad,
  onError,
  onTransformed,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  initialAspectRatio,
  onAspectRatioChange,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { containerRef, containerSize } = useContainerSize();
  const { dominantAspectRatio, processAspectRatioFromImage, handleImageRef } =
    useAspectRatioTracker({
      imageUrl,
      imgRef,
      onLoad,
      ...(typeof initialAspectRatio === "number" ? { initialAspectRatio } : {}),
      ...(onAspectRatioChange !== undefined ? { onAspectRatioChange } : {}),
    });
  const stageMetrics = useStageMetrics({ containerSize, dominantAspectRatio, isSmallScreen });
  const stageWidth = stageMetrics?.width ?? null;
  const stageHeight = stageMetrics?.height ?? null;
  const stageMaxWidth = stageMetrics?.availableWidth ?? null;
  const stageMaxHeight = stageMetrics?.availableHeight ?? null;
  const currentScale = toolbarProps.scale;

  const normalizedFileName =
    typeof fileName === "string" && fileName.trim().length > 0 ? fileName : undefined;
  const displayFileName = normalizedFileName ?? "未知文件";
  const altText = normalizedFileName ?? "图片预览";
  const hasError = error;

  const { dragOffset, isDragging, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useTouchNavigation({
      isSmallScreen,
      currentScale,
      hasError,
      loading,
      hasPrevious,
      hasNext,
      imageUrl,
      ...(onPrevious !== undefined ? { onPrevious } : {}),
      ...(onNext !== undefined ? { onNext } : {}),
    });

  const { activeNavSide, handleContainerMouseMove, handleContainerMouseLeave } =
    useDesktopNavigation({
      containerRef,
      isSmallScreen,
      hasError,
      loading,
      hasPrevious,
      hasNext,
    });

  const leftNavActive =
    activeNavSide === "left" || (isSmallScreen && isDragging && dragOffset > 30);
  const rightNavActive =
    activeNavSide === "right" || (isSmallScreen && isDragging && dragOffset < -30);

  useKeyboardNavigation({
    loading,
    hasError,
    hasPrevious,
    hasNext,
    ...(onPrevious !== undefined ? { onPrevious } : {}),
    ...(onNext !== undefined ? { onNext } : {}),
  });

  const rotationTransform = `rotate(${String(rotation)}deg)`;
  const containerClassName = [className, "image-preview-container"]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        bgcolor: theme.palette.mode === "dark" ? "#1a1a1a" : "#f5f5f5",
        "--rv-image-preview-aspect-ratio": dominantAspectRatio.toFixed(3),
        ...(stageWidth !== null
          ? { "--rv-image-preview-stage-width": `${stageWidth.toString()}px` }
          : {}),
        ...(stageHeight !== null
          ? { "--rv-image-preview-stage-height": `${stageHeight.toString()}px` }
          : {}),
      }}
      className={containerClassName.length > 0 ? containerClassName : "image-preview-container"}
      style={style}
    >
      {/* 屏幕阅读器状态提示区域 */}
      <Box
        component="div"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        {loading && "正在加载图片"}
        {hasError && "图片加载失败"}
        {!loading && !hasError && `图片已加载：${displayFileName}`}
      </Box>

      {/* 文件名标题（仅在非小屏幕时显示） */}
      {!isSmallScreen && (
        <Typography
          variant="h6"
          sx={{
            py: 1.5,
            px: 2,
            textAlign: "center",
            bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {displayFileName}
        </Typography>
      )}

      {/* 主要内容区域 */}
      <Box
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
        sx={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* 全局样式 */}
        <GlobalStyles
          styles={{
            ".react-transform-wrapper": {
              width: "100%",
              height: "100%",
            },
            ".react-transform-component": {
              width: "100%",
              height: "100%",
            },
          }}
        />

        {/* 加载骨架屏 */}
        {loading && (
          <ImagePreviewSkeleton
            isSmallScreen={isSmallScreen}
            aspectRatio={dominantAspectRatio}
            {...(stageWidth !== null ? { targetWidth: stageWidth } : {})}
            {...(stageHeight !== null ? { targetHeight: stageHeight } : {})}
          />
        )}

        {/* 错误状态显示 */}
        {hasError && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
          >
            <Typography color="error" sx={{ mb: 2 }}>
              图像加载失败
            </Typography>
            <IconButton
              onClick={() => {
                if (typeof toolbarProps.setError === "function") {
                  toolbarProps.setError(false);
                }
              }}
              color="primary"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <ReplayIcon />
            </IconButton>
          </Box>
        )}

        {/* 缩放平移组件 */}
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={5}
          centerOnInit={true}
          wheel={{ disabled: hasError }}
          pinch={{ disabled: hasError }}
          panning={{ disabled: hasError || (isSmallScreen && currentScale === 1) }}
          onTransform={(ref, state) => {
            onTransformed(state.scale);
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* 图片展示 */}
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                  boxSizing: "border-box",
                }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  transform:
                    isSmallScreen && isDragging ? `translateX(${String(dragOffset)}px)` : undefined,
                  transition: isDragging ? "none" : "transform 0.3s ease",
                }}
                wrapperProps={{
                  onTouchStart: handleTouchStart,
                  onTouchMove: handleTouchMove,
                  onTouchEnd: handleTouchEnd,
                  onTouchCancel: handleTouchEnd,
                }}
              >
                {!hasError && !loading && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      transform: rotationTransform,
                      transition: "transform 0.3s ease, width 0.35s ease, height 0.35s ease",
                      transformOrigin: "center center",
                      width: stageWidth !== null ? `${stageWidth.toString()}px` : "auto",
                      height: stageHeight !== null ? `${stageHeight.toString()}px` : "auto",
                      maxWidth: stageMaxWidth !== null ? `${stageMaxWidth.toString()}px` : "100%",
                      maxHeight:
                        stageMaxHeight !== null ? `${stageMaxHeight.toString()}px` : "100%",
                      position: "relative",
                    }}
                  >
                    <img
                      ref={handleImageRef}
                      src={shouldLoad ? imageUrl : ""}
                      alt={altText}
                      className="loaded"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        opacity: 1,
                        transition: "opacity 0.3s ease",
                      }}
                      onLoad={(event) => {
                        processAspectRatioFromImage(event.currentTarget);
                        onLoad();
                      }}
                      onError={onError}
                    />
                  </div>
                )}
                {!hasError && loading && (
                  <img
                    ref={handleImageRef}
                    src={shouldLoad ? imageUrl : ""}
                    alt={altText}
                    style={{
                      display: "none",
                    }}
                    onLoad={(event) => {
                      processAspectRatioFromImage(event.currentTarget);
                      onLoad();
                    }}
                    onError={onError}
                  />
                )}
              </TransformComponent>

              {/* 工具栏 */}
              <ImageToolbar
                {...toolbarProps}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                resetTransform={resetTransform}
              />

              {/* 左侧导航按钮（桌面端悬停显示，移动端拖动时作为方向提示） */}
              {hasPrevious && onPrevious !== undefined && (
                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: "72px", // 避开底部工具栏
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingLeft: 2,
                    zIndex: 50,
                    cursor: leftNavActive ? "pointer" : "default",
                    pointerEvents: isSmallScreen ? "none" : leftNavActive ? "auto" : "none",
                  }}
                >
                  <IconButton
                    onClick={onPrevious}
                    aria-label={t("ui.image.previous")}
                    sx={{
                      bgcolor: alpha(theme.palette.background.paper, leftNavActive ? 0.95 : 0),
                      backdropFilter: leftNavActive ? "blur(10px)" : "none",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                      },
                      width: isSmallScreen ? "44px" : "56px",
                      height: isSmallScreen ? "44px" : "56px",
                      opacity: leftNavActive ? 1 : 0,
                      transform: leftNavActive ? "translateX(0)" : "translateX(-20px)",
                      transition: "all 0.3s ease",
                      touchAction: "manipulation",
                      boxShadow: leftNavActive
                        ? `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`
                        : "none",
                      pointerEvents: isSmallScreen ? "none" : leftNavActive ? "auto" : "none",
                    }}
                  >
                    <ChevronLeftIcon
                      sx={{
                        fontSize: "2rem",
                        color: theme.palette.text.primary,
                      }}
                    />
                  </IconButton>
                </Box>
              )}

              {/* 右侧导航按钮（桌面端悬停显示，移动端拖动时作为方向提示） */}
              {hasNext && onNext !== undefined && (
                <Box
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 2,
                    zIndex: 50,
                    cursor: rightNavActive ? "pointer" : "default",
                    pointerEvents: isSmallScreen ? "none" : rightNavActive ? "auto" : "none",
                  }}
                >
                  <IconButton
                    onClick={onNext}
                    aria-label={t("ui.image.next")}
                    sx={{
                      bgcolor: alpha(theme.palette.background.paper, rightNavActive ? 0.95 : 0),
                      backdropFilter: rightNavActive ? "blur(10px)" : "none",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                      },
                      width: isSmallScreen ? "44px" : "56px",
                      height: isSmallScreen ? "44px" : "56px",
                      opacity: rightNavActive ? 1 : 0,
                      transform: rightNavActive ? "translateX(0)" : "translateX(20px)",
                      transition: "all 0.3s ease",
                      touchAction: "manipulation",
                      boxShadow: rightNavActive
                        ? `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`
                        : "none",
                      pointerEvents: isSmallScreen ? "none" : rightNavActive ? "auto" : "none",
                    }}
                  >
                    <ChevronRightIcon
                      sx={{
                        fontSize: "2rem",
                        color: theme.palette.text.primary,
                      }}
                    />
                  </IconButton>
                </Box>
              )}
            </>
          )}
        </TransformWrapper>
      </Box>
    </Box>
  );
};

export default ImagePreviewContent;
