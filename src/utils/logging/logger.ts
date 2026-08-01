import { track } from "@vercel/analytics";
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

const MAX_ERROR_MESSAGE_LENGTH = 255;
const MAX_STACK_LENGTH = 500;

function isConsoleEnabled(config: DeveloperConfig): boolean {
  return config.mode || config.consoleLogging;
}

function resolveErrorMessage(args: unknown[], error?: Error): string {
  const message =
    error?.message ??
    (typeof args[0] === "string" ? args[0] : args[0] === undefined ? "" : JSON.stringify(args[0]));
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function reportErrorToVercel(args: unknown[], error?: Error): void {
  if (!import.meta.env.PROD) {
    return;
  }

  const message = resolveErrorMessage(args, error);
  if (message.length === 0) {
    return;
  }

  track("app_error", {
    message,
    ...(error?.stack !== undefined ? { stack: error.stack.slice(0, MAX_STACK_LENGTH) } : {}),
  });
}

function emit(level: CoreLogLevel, args: unknown[]): void {
  if (level === "error") {
    const firstError = args.find((arg): arg is Error => arg instanceof Error);
    reportErrorToVercel(args, firstError);
  }

  if (!isConsoleEnabled(developerConfig)) {
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
