import { createContext } from "react";
import type { PaletteMode } from "@mui/material";

/**
 * 颜色模式上下文类型接口
 */
export interface ColorModeContextType {
  toggleColorMode: () => void;
  toggleAutoMode: () => void;
  mode: PaletteMode;
  isAutoMode: boolean;
}

const createMissingProviderWarning = (methodName: string): (() => void) => {
  const isProductionEnvironment = (): boolean => {
    const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process;
    const env = globalProcess?.env;
    return env?.["NODE_ENV"] === "production";
  };

  return () => {
    if (!isProductionEnvironment()) {
      console.warn(`${methodName} 需要在 ColorModeProvider 中使用`);
    }
  };
};

export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: createMissingProviderWarning("toggleColorMode"),
  toggleAutoMode: createMissingProviderWarning("toggleAutoMode"),
  mode: "light",
  isAutoMode: false,
});
