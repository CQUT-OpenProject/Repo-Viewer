import type { Logger, LoggerFactory } from "./types";

class CompositeLogger implements Logger {
  constructor(private readonly loggers: Logger[]) {}

  debug(...args: unknown[]): void {
    this.invoke("debug", args);
  }

  info(...args: unknown[]): void {
    this.invoke("info", args);
  }

  log(...args: unknown[]): void {
    this.invoke("log", args);
  }

  warn(...args: unknown[]): void {
    this.invoke("warn", args);
  }

  error(...args: unknown[]): void {
    this.invoke("error", args);
  }

  group(label: string): void {
    for (const logger of this.loggers) {
      const handler = logger.group;
      if (typeof handler === "function") {
        handler.call(logger, label);
      }
    }
  }

  groupEnd(): void {
    for (const logger of this.loggers) {
      const handler = logger.groupEnd;
      if (typeof handler === "function") {
        handler.call(logger);
      }
    }
  }

  private invoke(method: keyof Logger, args: unknown[]): void {
    for (const logger of this.loggers) {
      const handler = logger[method];
      if (typeof handler === "function") {
        (handler as (...handlerArgs: unknown[]) => void).apply(logger, args);
      }
    }
  }
}

export class CompositeLoggerFactory implements LoggerFactory {
  constructor(private readonly factories: LoggerFactory[]) {}

  loggerFor(name: string): Logger {
    return new CompositeLogger(this.factories.map((factory) => factory.loggerFor(name)));
  }
}
