import { ENV_MAPPING } from "../constants";

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

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * 查找环境变量
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
