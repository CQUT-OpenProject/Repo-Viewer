import Translator from "./translator";
import type { Locale, InterpolationOptions, ILocaleJSON, ITranslator } from "./types";
import { logger } from "@/utils";

/**
 * 格式化插值选项
 */
const formatOptions = (options: InterpolationOptions | number): InterpolationOptions =>
  typeof options === "number" ? { count: options } : options;

/**
 * I18N 类
 * 提供国际化翻译功能
 */
export class I18N {
  private readonly translator: ITranslator;
  private readonly alwaysShowScreamers: boolean;

  /**
   * 构建 I18N 实例
   *
   * @param locale - 语言代码，默认 'zh-CN'
   * @param translation - 翻译对象，默认 {}
   * @param alwaysShowScreamers - 是否始终显示键名（用于 QA 测试）
   * @param isLoading - 是否正在加载翻译文件（加载中时不报告缺失 key 警告）
   */
  constructor(
    locale: Locale = "zh-CN",
    translation: ILocaleJSON = {},
    alwaysShowScreamers = false,
    isLoading = false,
  ) {
    // 使用闭包捕获 isLoading 状态
    const shouldWarn = !isLoading;
    this.translator = new Translator(locale, translation, {
      onMissingKeyFn: (key: string): string => {
        // 只在翻译文件加载完成后才报告缺失 key 警告
        if (shouldWarn) {
          logger.warn("i18n: key missing:", key);
        }
        return `**${key}**`;
      },
      onMissingInterpolationFn: (key: string, interpolation: string) => {
        // 只在翻译文件加载完成后才报告缺失插值警告
        if (shouldWarn) {
          logger.warn(`i18n: key ${key} missing interpolation:`, interpolation);
        }
      },
    });
    this.alwaysShowScreamers = alwaysShowScreamers;
  }

  /**
   * 翻译方法
   *
   * @param key - 翻译键
   * @param options - 插值选项或数字（用于复数）
   * @returns 翻译后的字符串
   */
  t = (key: string, options: number | InterpolationOptions = {}): string => {
    if (this.alwaysShowScreamers) {
      return key;
    }

    const internalOptions: InterpolationOptions = formatOptions(options);

    return this.translator.translate(key, internalOptions);
  };
}

export default I18N;
