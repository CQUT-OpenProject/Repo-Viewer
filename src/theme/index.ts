import { createTheme, type PaletteMode, type Theme } from "@mui/material/styles";
import { g3BorderRadius, G3_PRESETS } from "./g3Curves";
import { getLightPalette, getDarkPalette } from "./palettes";
import { getCurrentTheme } from "./utils";
import { typographyConfig } from "./typography";
import {
  buttonStyles,
  navigationStyles,
  containerStyles,
  listStyles,
  miscStyles,
} from "./components";

/**
 * 创建Material You主题
 *
 * 根据指定的模式（明/暗）创建完整的Material-UI主题配置。
 *
 * @param mode - 主题模式（'light'或'dark'）
 * @returns Material-UI主题对象
 */
export const createMaterialYouTheme = (mode: PaletteMode): Theme => {
  const currentTheme = getCurrentTheme();

  const themeConfig = {
    palette: {
      mode,
      ...(mode === "light" ? getLightPalette(currentTheme) : getDarkPalette(currentTheme)),
    },
    shape: {
      borderRadius: g3BorderRadius(G3_PRESETS.fileListContainer),
    },
    typography: typographyConfig,
    components: {
      ...buttonStyles,
      ...navigationStyles,
      ...containerStyles,
      ...listStyles,
      ...miscStyles,
    },
  };

  return createTheme(themeConfig);
};

const materialYouTheme = createMaterialYouTheme("light");
export default materialYouTheme;
export { getCurrentThemeName } from "./utils";
export * from "./g3Curves";
export * from "./animations";
