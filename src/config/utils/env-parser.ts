/**
 * 标准化字符串值
 *
 * @param value - 待标准化的值
 * @returns 标准化后的字符串，如果无效则返回undefined
 */
const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * 解析布尔值
 *
 * @param value - 字符串值
 * @returns 如果值为'true'返回true，否则返回false
 */
export const parseBoolean = (value: string | undefined): boolean => value === "true";

/**
 * 解析字符串数组
 *
 * 将逗号分隔的字符串解析为数组。
 *
 * @param value - 逗号分隔的字符串
 * @returns 解析后的字符串数组
 */
export const parseStringArray = (value: string | undefined): string[] => {
  const normalized = normalizeString(value);
  if (normalized === undefined) {
    return [];
  }
  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

interface ParseIntegerOptions {
  min?: number;
  max?: number;
}

/**
 * 解析整数值
 *
 * @param value - 字符串值
 * @param fallback - 不合法时的回退值
 * @param options - 附加的最小/最大值约束
 * @returns 解析后的整数值
 */
export const parseInteger = (
  value: string | undefined,
  fallback: number,
  options: ParseIntegerOptions = {},
): number => {
  const normalized = normalizeString(value);
  if (normalized === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  const { min, max } = options;
  if (typeof min === "number" && parsed < min) {
    return min;
  }

  if (typeof max === "number" && parsed > max) {
    return max;
  }

  return parsed;
};

/**
 * 验证Token是否有效
 *
 * 检查token是否为有效的字符串，且不是占位符。
 *
 * @param token - 待验证的token
 * @returns 如果是有效token返回true，否则返回false
 */
export const validateToken = (token: unknown): token is string => {
  const normalized = normalizeString(token);
  if (normalized === undefined) {
    return false;
  }
  return !(normalized === "your_token_here" || normalized.includes("placeholder"));
};

/**
 * 环境变量解析器
 *
 * 提供解析和验证环境变量的工具函数。
 */
export const EnvParser = {
  parseBoolean,
  parseStringArray,
  parseInteger,
  validateToken,
} as const;
