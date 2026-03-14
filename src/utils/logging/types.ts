export type CoreLogLevel = "debug" | "info" | "warn" | "error" | "log";

export type GroupLogLevel = "group" | "groupEnd";

export type LogLevel = CoreLogLevel | GroupLogLevel;

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log?: (...args: unknown[]) => void;
  group?: (label: string) => void;
  groupEnd?: () => void;
}

export interface LoggerFactory {
  loggerFor: (name: string) => Logger;
}

export interface LoggerArguments {
  name: string;
  level: LogLevel;
  args: unknown[];
}
