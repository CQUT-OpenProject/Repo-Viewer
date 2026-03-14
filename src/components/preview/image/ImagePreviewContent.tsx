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
import {
  useAspectRatioTracker,
  useContainerSize,
  useDesktopNavigation,
  useTouchNavigation,
  useKeyboardNavigation,
  useStageMetrics,
} from "./hooks";
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
      data-oid="j_s1bp2"
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
          data-oid="5q_.d-t"
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
        data-oid="znlgest"
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
          data-oid="v02yxzy"
        />

        {/* 加载骨架屏 */}
        {loading && (
          <ImagePreviewSkeleton
            isSmallScreen={isSmallScreen}
            aspectRatio={dominantAspectRatio}
            data-oid="84nup28"
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
            data-oid="w:-3iqj"
          >
            <Typography color="error" sx={{ mb: 2 }} data-oid="tex3zwr">
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
              <ReplayIcon data-oid=":znocig" />
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
          onTransformed={(ref) => {
            onTransformed(ref.state.scale);
          }}
          data-oid="2kb8slc"
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
                data-oid=":ze-2ev"
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
                    data-oid="y6kwode"
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
                      data-oid="nyva-.q"
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
                    data-oid="nyva-loading"
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

              {/* 移动端拖动视觉反馈 */}
              {isSmallScreen && isDragging && (
                <>
                  {/* 左侧提示（上一张） */}
                  {hasPrevious && dragOffset > 30 && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 60,
                        opacity: Math.min(dragOffset / 100, 0.8),
                        transition: "opacity 0.2s ease",
                        pointerEvents: "none",
                      }}
                      data-oid="drag-left-indicator"
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          bgcolor: alpha(theme.palette.primary.main, 0.9),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}`,
                        }}
                      >
                        <ChevronLeftIcon
                          sx={{
                            fontSize: "2rem",
                            color: "#fff",
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* 右侧提示（下一张） */}
                  {hasNext && dragOffset < -30 && (
                    <Box
                      sx={{
                        position: "absolute",
                        right: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 60,
                        opacity: Math.min(Math.abs(dragOffset) / 100, 0.8),
                        transition: "opacity 0.2s ease",
                        pointerEvents: "none",
                      }}
                      data-oid="drag-right-indicator"
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          bgcolor: alpha(theme.palette.primary.main, 0.9),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.3)}`,
                        }}
                      >
                        <ChevronRightIcon
                          sx={{
                            fontSize: "2rem",
                            color: "#fff",
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </>
              )}

              {/* 左侧导航按钮（仅桌面端且有上一张图片时显示） */}
              {!isSmallScreen && hasPrevious && onPrevious !== undefined && (
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
                    cursor: activeNavSide === "left" ? "pointer" : "default",
                    pointerEvents: activeNavSide === "left" ? "auto" : "none",
                  }}
                  data-oid="prev-nav-area"
                >
                  <IconButton
                    onClick={onPrevious}
                    aria-label={t("ui.image.previous")}
                    sx={{
                      bgcolor: alpha(
                        theme.palette.background.paper,
                        activeNavSide === "left" ? 0.95 : 0,
                      ),
                      backdropFilter: activeNavSide === "left" ? "blur(10px)" : "none",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                      },
                      width: "56px",
                      height: "56px",
                      opacity: activeNavSide === "left" ? 1 : 0,
                      transform: activeNavSide === "left" ? "translateX(0)" : "translateX(-20px)",
                      transition: "all 0.3s ease",
                      boxShadow:
                        activeNavSide === "left"
                          ? `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`
                          : "none",
                      pointerEvents: activeNavSide === "left" ? "auto" : "none",
                    }}
                    data-oid="prev-nav-btn"
                  >
                    <ChevronLeftIcon
                      sx={{
                        fontSize: "2rem",
                        color: theme.palette.text.primary,
                      }}
                      data-oid="prev-icon"
                    />
                  </IconButton>
                </Box>
              )}

              {/* 右侧导航按钮（仅桌面端且有下一张图片时显示） */}
              {!isSmallScreen && hasNext && onNext !== undefined && (
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
                    cursor: activeNavSide === "right" ? "pointer" : "default",
                    pointerEvents: activeNavSide === "right" ? "auto" : "none",
                  }}
                  data-oid="next-nav-area"
                >
                  <IconButton
                    onClick={onNext}
                    aria-label={t("ui.image.next")}
                    sx={{
                      bgcolor: alpha(
                        theme.palette.background.paper,
                        activeNavSide === "right" ? 0.95 : 0,
                      ),
                      backdropFilter: activeNavSide === "right" ? "blur(10px)" : "none",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                      },
                      width: "56px",
                      height: "56px",
                      opacity: activeNavSide === "right" ? 1 : 0,
                      transform: activeNavSide === "right" ? "translateX(0)" : "translateX(20px)",
                      transition: "all 0.3s ease",
                      boxShadow:
                        activeNavSide === "right"
                          ? `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`
                          : "none",
                      pointerEvents: activeNavSide === "right" ? "auto" : "none",
                    }}
                    data-oid="next-nav-btn"
                  >
                    <ChevronRightIcon
                      sx={{
                        fontSize: "2rem",
                        color: theme.palette.text.primary,
                      }}
                      data-oid="next-icon"
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
