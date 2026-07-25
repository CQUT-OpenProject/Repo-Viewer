import type { CoreLogLevel } from "./types";
import type { Config } from "@/config";

const LEVEL_PRIORITY: Record<CoreLogLevel, number> = {
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const resolveBaseLevel = (config: Config["developer"]): number => {
  if (config.mode) {
    return LEVEL_PRIORITY.debug;
  }
  if (config.consoleLogging) {
    return LEVEL_PRIORITY.warn;
  }
  const base = config.logging?.baseLevel;
  if (base === "debug" || base === "info" || base === "warn" || base === "error") {
    return LEVEL_PRIORITY[base];
  }
  return LEVEL_PRIORITY.error;
};

/** Single-app logger: level gate only (no multi-name DSL). */
export const shouldLog = (level: CoreLogLevel, config: Config["developer"]): boolean =>
  LEVEL_PRIORITY[level] <= resolveBaseLevel(config);
