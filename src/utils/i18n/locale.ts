import type { Locale } from "./types";

/**
 * RTL 语言代码列表
 * 从右到左书写的语言
 */
const RTL_LANG_CODES = [
  "ar", // arabic
  "he", // hebrew
  "ku", // kurdish
  "ur", // urdu
  "ps", // pashto
  "yi", // yiddish
];

/**
 * 确定页面的文本方向
 *
 * @param localeCode - 语言代码，如 'zh-CN', 'en-US'
 * @returns 'rtl' 或 'ltr'
 */
export function getPageDir(localeCode: string): "rtl" | "ltr" {
  const parts = localeCode.split("-");
  const twoLettersLangCode = parts[0]?.toLowerCase() ?? "";
  const isRTLLang = RTL_LANG_CODES.includes(twoLettersLangCode);
  return isRTLLang ? "rtl" : "ltr";
}

/**
 * 获取 HTML 语言属性
 *
 * @param locale - 语言代码
 * @returns HTML lang 和 dir 属性值
 */
export function getLocAttributes(locale: string): {
  dir: "rtl" | "ltr";
  lang: string;
} {
  const pageDir = getPageDir(locale);

  // 标准化语言代码为 BCP47 格式
  // 例如: 'zh-CN' -> 'zh-CN', 'en' -> 'en'
  const normalizedLang = locale.toLowerCase().replace("_", "-");

  return {
    dir: pageDir,
    lang: normalizedLang,
  };
}

/**
 * 标准化语言代码
 *
 * @param locale - 原始语言代码
 * @returns 标准化后的语言代码
 */
export function normalizeLocale(locale: string): Locale {
  // 标准化格式：将下划线替换为连字符，转换为小写
  const normalized = locale.toLowerCase().replace("_", "-");

  // 支持的语言映射
  const localeMap: Record<string, Locale> = {
    zh: "zh-CN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-CN", // 暂时使用简体中文
    "zh-hk": "zh-CN", // 暂时使用简体中文
    en: "en-US",
    "en-us": "en-US",
    "en-gb": "en-US", // 暂时使用美式英语
    ja: "ja-JP",
    "ja-jp": "ja-JP",
  };

  // 如果映射中存在，返回映射值
  const mappedLocale = localeMap[normalized];
  if (mappedLocale !== undefined) {
    return mappedLocale;
  }

  // 如果已经是标准格式（如 'zh-CN'），直接返回
  const matchResult = /^[a-z]{2}-[a-z]{2}$/i.exec(normalized);
  if (matchResult !== null) {
    return normalized;
  }

  // 默认返回英文
  return "en-US";
}

/**
 * 从浏览器获取用户语言
 *
 * @returns 标准化的语言代码
 */
export function getBrowserLocale(): Locale {
  if (typeof window === "undefined") {
    return "zh-CN"; // 默认中文
  }

  const primaryLang = window.navigator.language;
  const fallbackLang = window.navigator.languages[0];
  const browserLang =
    primaryLang !== ""
      ? primaryLang
      : fallbackLang !== undefined && fallbackLang !== ""
        ? fallbackLang
        : "zh-CN";
  return normalizeLocale(browserLang);
}
