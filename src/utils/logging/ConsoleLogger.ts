import { shouldLog } from "./filters";
import type { CoreLogLevel, Logger, LoggerFactory } from "./types";
import type { Config } from "@/config";

export interface ConsoleLoggerOptions {
  getDeveloperConfig: () => Config["developer"];
  useCollapsedGroup?: boolean;
}

const MAP_TO_CONSOLE_METHOD: Record<CoreLogLevel, keyof Console> = {
  debug: "debug",
  info: "info",
  log: "log",
  warn: "warn",
  error: "error",
};

const nativeConsole: Console | undefined =
  typeof globalThis.console === "object" ? globalThis.console : undefined;

class ConsoleLogger implements Logger {
  constructor(
    private readonly name: string,
    private readonly options: ConsoleLoggerOptions,
  ) {}

  debug(...args: unknown[]): void {
    this.logInternal("debug", args);
  }

  info(...args: unknown[]): void {
    this.logInternal("info", args);
  }

  log(...args: unknown[]): void {
    this.logInternal("log", args);
  }

  warn(...args: unknown[]): void {
    this.logInternal("warn", args);
  }

  error(...args: unknown[]): void {
    this.logInternal("error", args);
  }

  group(label: string): void {
    const config = this.options.getDeveloperConfig();
    if (!shouldLog(this.name, "debug", config)) {
      return;
    }

    if (nativeConsole === undefined) {
      return;
    }

    const method: keyof Console =
      this.options.useCollapsedGroup === true ? "groupCollapsed" : "group";
    const groupMethod = nativeConsole[method];

    if (typeof groupMethod === "function") {
      groupMethod.call(nativeConsole, `[${this.name}] ${label}`);
      return;
    }

    if (typeof nativeConsole.group === "function") {
      nativeConsole.group(`[${this.name}] ${label}`);
    }
  }

  groupEnd(): void {
    const config = this.options.getDeveloperConfig();
    if (!shouldLog(this.name, "debug", config)) {
      return;
    }
    if (nativeConsole !== undefined && typeof nativeConsole.groupEnd === "function") {
      nativeConsole.groupEnd();
    }
  }

  private logInternal(level: CoreLogLevel, args: unknown[]): void {
    const config = this.options.getDeveloperConfig();
    if (!shouldLog(this.name, level, config)) {
      return;
    }

    if (nativeConsole === undefined) {
      return;
    }

    const consoleMethod = MAP_TO_CONSOLE_METHOD[level];
    const logFn = nativeConsole[consoleMethod];
    if (typeof logFn !== "function") {
      return;
    }
    const invoke = logFn as (...consoleArgs: unknown[]) => void;
    const prefix = `[${this.name}]`;

    if (args.length === 0) {
      invoke.call(nativeConsole, prefix);
      return;
    }

    const [first, ...rest] = args;
    if (typeof first === "string") {
      invoke.call(nativeConsole, `${prefix} ${first}`, ...rest);
    } else {
      invoke.call(nativeConsole, prefix, ...args);
    }
  }
}

export class ConsoleLoggerFactory implements LoggerFactory {
  constructor(private readonly options: ConsoleLoggerOptions) {}

  loggerFor(name: string): Logger {
    return new ConsoleLogger(name, this.options);
  }
}
