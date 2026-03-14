import type { Logger, LoggerFactory } from "./types";

class VoidLogger implements Logger {
  debug(..._args: unknown[]): void {
    return;
  }

  info(..._args: unknown[]): void {
    return;
  }

  log(..._args: unknown[]): void {
    return;
  }

  warn(..._args: unknown[]): void {
    return;
  }

  error(..._args: unknown[]): void {
    return;
  }

  group(_label: string): void {
    return;
  }

  groupEnd(): void {
    return;
  }
}

export class VoidLoggerFactory implements LoggerFactory {
  private static instance: Logger = new VoidLogger();

  loggerFor(_name: string): Logger {
    return VoidLoggerFactory.instance;
  }
}
