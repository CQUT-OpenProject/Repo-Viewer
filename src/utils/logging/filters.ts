import type { CoreLogLevel } from "./types";
import type { Config } from "@/config";

const LOG_FILTER_STORAGE_KEY = "repoViewerLog";

const LEVEL_PRIORITY: Record<CoreLogLevel, number> = {
  error: 1,
  warn: 2,
  info: 3,
  log: 3,
  debug: 4,
};

interface Rules {
  named: Record<string, number>;
  defaultLevel: number;
}

const DEFAULT_RULES: Rules = {
  named: {},
  defaultLevel: LEVEL_PRIORITY.error,
};

const parseDirectives = (ruleString: string, fallback: Rules): Rules => {
  if (ruleString.trim().length === 0) {
    return fallback;
  }

  return ruleString.split(",").reduce<Rules>((rules, directiveRaw) => {
    const directive = directiveRaw.trim();
    if (directive.length === 0) {
      return rules;
    }

    const [name = "", levelName = ""] = directive.split("=");
    const normalizedName = name.trim();
    const normalizedLevel = levelName.trim();

    if (normalizedName.length === 0) {
      return rules;
    }

    const resolvedLevel = ((): number | undefined => {
      switch (normalizedLevel) {
        case "*":
        case "debug":
          return LEVEL_PRIORITY.debug;
        case "info":
        case "log":
          return LEVEL_PRIORITY.info;
        case "warn":
          return LEVEL_PRIORITY.warn;
        case "error":
          return LEVEL_PRIORITY.error;
        case "off":
        case "":
          return 0;
        default:
          return undefined;
      }
    })();

    if (resolvedLevel === undefined) {
      return rules;
    }

    if (normalizedName === "*") {
      return {
        ...rules,
        defaultLevel: resolvedLevel,
      };
    }

    return {
      ...rules,
      named: {
        ...rules.named,
        [normalizedName]: resolvedLevel,
      },
    };
  }, fallback);
};

const readLocalStorageRules = (): string => {
  try {
    if (typeof window === "undefined") {
      return "";
    }
    const value = window.localStorage.getItem(LOG_FILTER_STORAGE_KEY);
    return value ?? "";
  } catch {
    // localStorage 可能在隐私模式下不可用或被禁用
    return "";
  }
};

const resolveBaseLevel = (config: Config["developer"]): number => {
  if (config.mode) {
    return LEVEL_PRIORITY.debug;
  }

  if (config.consoleLogging) {
    return LEVEL_PRIORITY.warn;
  }

  const loggingConfig = config.logging;
  if (loggingConfig?.baseLevel !== undefined) {
    return LEVEL_PRIORITY[loggingConfig.baseLevel];
  }

  return LEVEL_PRIORITY.error;
};

const ensureRuleDefaults = (rules: Rules, baseLevel: number): Rules => ({
  named: rules.named,
  defaultLevel: Number.isFinite(rules.defaultLevel) ? rules.defaultLevel : baseLevel,
});

export const shouldLog = (
  loggerName: string,
  level: CoreLogLevel,
  config: Config["developer"],
): boolean => {
  const baseLevel = resolveBaseLevel(config);
  const fallbackRules: Rules = {
    ...DEFAULT_RULES,
    defaultLevel: baseLevel,
  };

  const localRules = parseDirectives(readLocalStorageRules(), fallbackRules);
  const rules = ensureRuleDefaults(localRules, baseLevel);
  const targetLevel = LEVEL_PRIORITY[level];
  const maxLevel = rules.named[loggerName] ?? rules.defaultLevel;

  return targetLevel <= maxLevel;
};
