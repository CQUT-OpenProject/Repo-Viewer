import React, { useMemo } from "react";
import type { ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createMaterialYouTheme } from "@/theme";
import { ColorModeContext } from "@/contexts/colorModeContext";
import { useThemeMode } from "@/hooks/useThemeMode";
import { I18nProvider } from "@/contexts/I18nContext";

/**
 * 主题提供者组件属性接口
 */
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * 主题提供者组件
 *
 * 为应用提供Material-UI主题和颜色模式管理功能。
 */
const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 使用自定义hook获取主题模式
  const colorMode = useThemeMode();

  // 仅当模式改变时才创建新主题
  const theme = useMemo(() => createMaterialYouTheme(colorMode.mode), [colorMode.mode]);

  return (
    <I18nProvider>
      <ColorModeContext.Provider value={colorMode} data-oid="x_82-n7">
        <MuiThemeProvider theme={theme} data-oid="onb75g6">
          <CssBaseline data-oid="t4l0o9n" />
          {children}
        </MuiThemeProvider>
      </ColorModeContext.Provider>
    </I18nProvider>
  );
};

// 添加显示名称以便调试
ThemeProvider.displayName = "ThemeProvider";

export default ThemeProvider;
