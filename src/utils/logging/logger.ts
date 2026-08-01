import { shouldLog } from "./filters";
import type { CoreLogLevel, Logger } from "./types";
import { configManager, getDeveloperConfig, type Config } from "@/config";

type DeveloperConfig = Config["developer"];

let developerConfig: DeveloperConfig = getDeveloperConfig();

const nativeConsole: Console | undefined =
  typeof globalThis.console === "object" ? globalThis.console : undefined;

const MAP: Record<CoreLogLevel, keyof Console> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

function isConsoleEnabled(config: DeveloperConfig): boolean {
  const logging = config.logging ?? {};
  return logging.enableConsole ?? (config.mode || config.consoleLogging);
}

function reportIfConfigured(level: "warn" | "error", args: unknown[], error?: Error): void {
  const logging = developerConfig.logging ?? {};
  if (logging.enableErrorReporting !== true || level !== "error") {
    return;
  }
  const reportUrl = logging.reportUrl;
  if (typeof reportUrl !== "string" || reportUrl.trim().length === 0) {
    return;
  }

  const payload = JSON.stringify({
    level,
    logger: "App",
    message:
      error?.message ??
      (typeof args[0] === "string"
        ? args[0]
        : args[0] === undefined
          ? ""
          : JSON.stringify(args[0])),
    stack: error?.stack,
    args,
    timestamp: Date.now(),
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      navigator.sendBeacon(reportUrl.trim(), payload);
      return;
    } catch {
      // fall through
    }
  }

  if (typeof fetch === "function") {
    void fetch(reportUrl.trim(), {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      mode: "cors",
    }).catch(() => undefined);
  }
}

function emit(level: CoreLogLevel, args: unknown[]): void {
  if (!isConsoleEnabled(developerConfig)) {
    if (level === "error" || level === "warn") {
      const firstError = args.find((arg): arg is Error => arg instanceof Error);
      reportIfConfigured(level, args, firstError);
    }
    return;
  }

  if (!shouldLog(level, developerConfig)) {
    return;
  }

  if (nativeConsole !== undefined) {
    const logFn = nativeConsole[MAP[level]];
    if (typeof logFn === "function") {
      const invoke = logFn as (...consoleArgs: unknown[]) => void;
      if (args.length === 0) {
        invoke.call(nativeConsole, "[App]");
      } else {
        const [first, ...rest] = args;
        if (typeof first === "string") {
          invoke.call(nativeConsole, `[App] ${first}`, ...rest);
        } else {
          invoke.call(nativeConsole, "[App]", ...args);
        }
      }
    }
  }

  if (level === "error" || level === "warn") {
    const firstError = args.find((arg): arg is Error => arg instanceof Error);
    reportIfConfigured(level, args, firstError);
  }
}

configManager.onConfigChange((next) => {
  developerConfig = next.developer;
});

export const logger: Logger = {
  debug: (...args) => {
    emit("debug", args);
  },
  info: (...args) => {
    emit("info", args);
  },
  warn: (...args) => {
    emit("warn", args);
  },
  error: (...args) => {
    emit("error", args);
  },
};
