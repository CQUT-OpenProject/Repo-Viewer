export const FILE_ITEM_CONFIG = {
  baseHeight: {
    sm: 48,
    xs: 40,
  },
  spacing: {
    marginBottom: 8,
    visualMarginBottom: 4,
    paddingY: {
      sm: 6,
      xs: 4,
    },
  },
  hover: {
    shadowSpace: {
      sm: 6,
      xs: 4,
    },
    verticalOffset: 2,
  },
} as const;

export const LIST_HEIGHT_CONFIG = {
  minVisibleItems: 1,
  maxVisibleItems: 15,
  veryFewItemsThreshold: 2,
  containerPadding: {
    few: { xs: 0.5, sm: 1 },
    normal: { xs: 1, sm: 2 },
  },
  nonScrollPadding: {
    top: 12,
    bottom: 12,
  },
  readmePreviewHeightReduction: {
    few: 15,
    normal: 25,
    many: 30,
  },
} as const;

export const TOP_ELEMENTS_ESTIMATE = 180;
export const BOTTOM_RESERVED_SPACE = 50;
export const VIEWPORT_FALLBACK_HEIGHT = 720;
