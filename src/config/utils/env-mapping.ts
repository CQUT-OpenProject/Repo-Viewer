import { ENV_MAPPING, CONFIG_DEFAULTS } from "../constants";
import type { EnvMappingOptions } from "../types";

type MutableEnvRecord = Record<string, string | undefined>;
type EnvLookupRecord = Record<string, unknown>;

const getProcessEnvRecord = (): MutableEnvRecord | undefined => {
  const globalProcess = (globalThis as { process?: { env?: unknown } }).process;
  if (
    globalProcess !== undefined &&
    typeof globalProcess.env === "object" &&
    globalProcess.env !== null
  ) {
    return globalProcess.env as MutableEnvRecord;
  }
  return undefined;
};

const runtimeProcessEnv = getProcessEnvRecord();

const setProcessEnvValue = (key: string, value: string): void => {
  const processEnv = getProcessEnvRecord();
  if (processEnv !== undefined) {
    processEnv[key] = value;
  }
};

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * 检查是否在生产环境
 *
 * 使用多个环境标志进行严格检查，确保在生产环境中不会泄露敏感信息。
 *
 * @param env - 环境变量记录
 * @param isProdLike - 调用者提供的生产环境标志
 * @returns 是否在生产环境
 */
function isProductionEnvironment(env: MutableEnvRecord, isProdLike: boolean): boolean {
  // 检查多个环境标志
  const nodeEnv = env["NODE_ENV"] ?? runtimeProcessEnv?.["NODE_ENV"];
  const mode = env["MODE"] ?? runtimeProcessEnv?.["MODE"];
  const viteProd = env["PROD"] ?? runtimeProcessEnv?.["PROD"];

  // 任何一个标志表明是生产环境，就返回 true
  return isProdLike || nodeEnv === "production" || mode === "production" || viteProd === "true";
}

export function applyEnvMappingForVite(
  env: MutableEnvRecord,
  options: EnvMappingOptions = {},
): void {
  const { isProdLike = false } = options;

  // 1) 通用映射：无前缀 -> VITE_
  Object.entries(ENV_MAPPING).forEach(([plainKey, viteKey]) => {
    const viteValue = normalizeEnvValue(env[viteKey] ?? runtimeProcessEnv?.[viteKey]);
    const plainValue = normalizeEnvValue(env[plainKey] ?? runtimeProcessEnv?.[plainKey]);
    if (viteValue === undefined && plainValue !== undefined) {
      // 写回到两处，确保 Vite dev/build 与后续 import.meta.env 都可见
      env[viteKey] = plainValue;
      setProcessEnvValue(viteKey, plainValue);
    }
  });

  // 2) PAT 同步（仅在开发模式下），避免生产构建把令牌注入前端
  // 使用严格的生产环境检查
  const isProduction = isProductionEnvironment(env, isProdLike);

  if (!isProduction) {
    const plainPrefix = "GITHUB_PAT";
    const vitePrefix = "VITE_GITHUB_PAT";

    // 基础（无数字后缀）
    const basePlain = normalizeEnvValue(env[plainPrefix] ?? runtimeProcessEnv?.[plainPrefix]);
    const baseVite = normalizeEnvValue(env[vitePrefix] ?? runtimeProcessEnv?.[vitePrefix]);
    if (basePlain !== undefined && baseVite === undefined) {
      env[vitePrefix] = basePlain;
      setProcessEnvValue(vitePrefix, basePlain);
    }

    // 带数字后缀 1..MAX
    for (let i = 1; i <= CONFIG_DEFAULTS.MAX_PAT_NUMBER; i++) {
      const suffix = String(i);
      const pKey = `${plainPrefix}${suffix}`;
      const vKey = `${vitePrefix}${suffix}`;
      const pVal = normalizeEnvValue(env[pKey] ?? runtimeProcessEnv?.[pKey]);
      const vVal = normalizeEnvValue(env[vKey] ?? runtimeProcessEnv?.[vKey]);
      if (pVal !== undefined && vVal === undefined) {
        env[vKey] = pVal;
        setProcessEnvValue(vKey, pVal);
      }
    }
  }
}

/**
 * 查找环境变量
 *
 * 从环境变量记录中查找指定键的值，支持运行时环境变量回退。
 *
 * @param env - 环境变量记录
 * @param key - 环境变量键名
 * @returns 环境变量值，如果未找到则返回 undefined
 */
function lookupEnv(env: EnvLookupRecord, key: string): string | undefined {
  const value = normalizeEnvValue(env[key]);
  if (value !== undefined) {
    return value;
  }

  if (runtimeProcessEnv !== undefined) {
    return normalizeEnvValue(runtimeProcessEnv[key]);
  }

  return undefined;
}

/**
 * 解析环境变量（支持映射）
 *
 * 查找环境变量值，支持Vite前缀映射和后备值。
 *
 * @param env - 环境变量记录
 * @param plainKey - 无前缀的键名
 * @param fallback - 后备值
 * @returns 解析后的环境变量值
 */
export const resolveEnvWithMapping = (
  env: EnvLookupRecord,
  plainKey: string,
  fallback: string,
): string => {
  // 优先使用VITE_前缀的变量（如果存在）
  if (plainKey in ENV_MAPPING) {
    const viteKey = ENV_MAPPING[plainKey as keyof typeof ENV_MAPPING];
    // 尝试查找 VITE_ 前缀变量
    const viteValue = lookupEnv(env, viteKey);
    if (viteValue !== undefined) {
      return viteValue;
    }

    // 如果VITE_变量不存在，尝试使用无前缀变量
    const plainValue = lookupEnv(env, plainKey);
    if (plainValue !== undefined) {
      return plainValue;
    }
  }

  return fallback;
};

export const hasEnvValue = (env: EnvLookupRecord, keys: string[]): boolean => {
  for (const key of keys) {
    if (normalizeEnvValue(env[key]) !== undefined) {
      return true;
    }
  }

  if (runtimeProcessEnv !== undefined) {
    for (const key of keys) {
      if (normalizeEnvValue(runtimeProcessEnv[key]) !== undefined) {
        return true;
      }
    }
  }

  return false;
};
