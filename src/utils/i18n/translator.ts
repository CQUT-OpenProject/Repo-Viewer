import type {
  Locale,
  ILocaleJSON,
  InterpolationOptions,
  TranslatorOptions,
  ITranslator,
} from "./types";

const DEFAULT_MISSING_FN: (key: string) => string = (key: string): string => `**${key}**`;
const DEFAULT_INTERPOLATION_REGEX = /@@(.*?)@@/g;

/**
 * 字符串插值函数
 *
 * @param key - 翻译键
 * @param phrase - 待插值的字符串，如 "hello my name is @@name@@"
 * @param options - 插值选项，如 { name: "Joe" }
 * @param onMissingInterpolationFn - 缺失插值时的回调
 * @param locale - 语言代码
 * @returns 插值后的字符串，如 "hello my name is Joe"
 */
export function interpolateString(
  key: string,
  phrase: string,
  options: InterpolationOptions,
  onMissingInterpolationFn: ((key: string, interpolation: string) => void) | null,
  locale: Locale,
): string {
  return phrase.replace(
    DEFAULT_INTERPOLATION_REGEX,
    function (expression: string, argument: string) {
      const optionHasProperty = options.hasOwnProperty(argument);
      const optionType = typeof options[argument];
      const argumentIsUndefined = optionType === "undefined";
      const argumentIsValid = optionType === "string" || optionType === "number";
      let value: string = expression;

      if (optionHasProperty && argumentIsValid) {
        const validValue = options[argument];
        if (validValue === undefined) {
          return value;
        }

        // 如果是数字类型，使用本地化格式
        if (optionType === "number" && options.hasOwnProperty("count")) {
          value = (validValue as number).toLocaleString([locale, "en-US"]);
        } else {
          value = typeof validValue === "string" ? validValue : String(validValue);
        }
      } else if (onMissingInterpolationFn !== null && argumentIsUndefined) {
        onMissingInterpolationFn(key, value);
      }
      return value;
    },
  );
}

/**
 * 获取复数形式的键
 * 简化版：只支持 'one' 和 'other' 两种形式
 *
 * @param count - 数量
 * @param key - 基础键
 * @param locale - 语言代码
 * @returns 复数形式的键，如 "item.one" 或 "item.other"
 */
export const getPlural = (count: number, key: string, locale: Locale): string => {
  const parts = locale.split("-");
  const lang = parts[0]?.toLowerCase() ?? "";

  // 对于中文，通常不需要复数形式
  if (lang === "zh") {
    return key;
  }

  // 对于英文等语言，使用简单的复数规则
  if (lang === "en" || lang.startsWith("en")) {
    return count === 1 ? `${key}.one` : `${key}.other`;
  }

  // 其他语言默认返回原键
  return key;
};

/**
 * 从嵌套对象中获取值
 * 支持点号分隔的键路径，如 "search.results.empty"
 */
function getNestedValue(obj: ILocaleJSON, path: string): string | null {
  const keys = path.split(".");
  let current: string | ILocaleJSON = obj;

  for (const key of keys) {
    if (typeof current === "object" && key in current) {
      const nextValue: string | ILocaleJSON | undefined = current[key];
      if (nextValue === undefined) {
        return null;
      }
      current = nextValue;
    } else {
      return null;
    }
  }

  return typeof current === "string" ? current : null;
}

/**
 * 翻译器类
 * 管理翻译、复数规则和插值
 */
class Translator implements ITranslator {
  private readonly translationMap: Map<string, string>;
  private readonly locale: Locale;
  private readonly onMissingKeyFn: (key: string) => string;
  private readonly onMissingInterpolationFn: ((key: string, interpolation: string) => void) | null;
  private readonly translations: ILocaleJSON;

  constructor(locale: Locale, phrases: ILocaleJSON, options: TranslatorOptions = {}) {
    const { onMissingKeyFn = DEFAULT_MISSING_FN, onMissingInterpolationFn = null } = options;

    this.locale = locale;
    this.translations = phrases;

    // 将嵌套对象扁平化为 Map
    this.translationMap = new Map();
    this.flattenTranslations(phrases, "");

    this.onMissingKeyFn = onMissingKeyFn;
    this.onMissingInterpolationFn = onMissingInterpolationFn;
  }

  /**
   * 将嵌套的翻译对象扁平化
   */
  private flattenTranslations(obj: ILocaleJSON, prefix: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix !== "" ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        this.translationMap.set(fullKey, value);
      } else if (typeof value === "object" && !Array.isArray(value)) {
        this.flattenTranslations(value, fullKey);
      }
    }
  }

  /**
   * 获取翻译值
   */
  private getValue(key: string): string | null {
    // 先从 Map 中查找（扁平化后的键）
    const mapValue = this.translationMap.get(key);
    if (mapValue !== undefined) {
      return mapValue;
    }

    // 如果 Map 中没有，尝试从嵌套对象中查找
    return getNestedValue(this.translations, key);
  }

  /**
   * 翻译字符串
   * 支持插值和复数形式
   */
  translate(key: string, options: InterpolationOptions = {}): string {
    let internalKey = key;
    const { count } = options;

    // 处理复数形式
    if (count !== undefined && !isNaN(count)) {
      internalKey = getPlural(count, key, this.locale);
    }

    const keyValue = this.getValue(internalKey);

    // 如果复数形式的键不存在，回退到原键
    if (keyValue === null && internalKey !== key) {
      const fallbackValue = this.getValue(key);
      if (fallbackValue !== null) {
        return interpolateString(
          key,
          fallbackValue,
          options,
          this.onMissingInterpolationFn,
          this.locale,
        );
      }
    }

    return keyValue !== null
      ? interpolateString(
          internalKey,
          keyValue,
          options,
          this.onMissingInterpolationFn,
          this.locale,
        )
      : this.onMissingKeyFn(internalKey);
  }
}

export default Translator;
