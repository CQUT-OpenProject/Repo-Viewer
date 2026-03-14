import { createContext, useContext } from "react";
import type I18N from "@/utils/i18n/i18n";

/**
 * I18n 上下文值接口
 */
export interface I18nContextValue {
  /** I18N 实例 */
  i18n: I18N;
  /** 翻译函数 */
  t: I18N["t"];
  /** 当前语言代码 */
  locale: string;
}

/**
 * I18n 上下文
 */
export const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * 使用 I18n 的 Hook
 *
 * @returns I18n 上下文值
 * @throws 如果在 I18nProvider 外部使用会抛出错误
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (context === null) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
