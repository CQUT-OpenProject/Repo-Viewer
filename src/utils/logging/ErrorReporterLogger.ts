import type { Logger, LoggerFactory } from "./types";

export interface ErrorReporter {
  captureException: (
    error: Error,
    context: { logger: string; args: unknown[] },
  ) => void | Promise<void>;
  captureMessage?: (
    message: string,
    context: { logger: string; level: "warn" | "error"; args: unknown[] },
  ) => void | Promise<void>;
}

export interface ErrorReporterLoggerOptions {
  reporter: ErrorReporter;
  includeWarn?: boolean;
}

class ErrorReporterLogger implements Logger {
  constructor(
    private readonly name: string,
    private readonly options: ErrorReporterLoggerOptions,
  ) {}

  debug(..._args: unknown[]): void {
    return;
  }

  info(..._args: unknown[]): void {
    return;
  }

  log(..._args: unknown[]): void {
    return;
  }

  warn(...args: unknown[]): void {
    if (this.options.includeWarn !== true) {
      return;
    }

    const reporter = this.options.reporter;
    if (typeof reporter.captureMessage === "function") {
      const message = this.stringifyArgs(args);
      void reporter.captureMessage(message, {
        logger: this.name,
        level: "warn",
        args,
      });
    }
  }

  error(...args: unknown[]): void {
    const reporter = this.options.reporter;
    const error = this.extractError(args);
    const payload = error ?? new Error(this.stringifyArgs(args));

    payload.message = this.stringifyArgs(args, payload.message);

    void reporter.captureException(payload, {
      logger: this.name,
      args,
    });
  }

  private extractError(args: unknown[]): Error | null {
    for (const arg of args) {
      if (arg instanceof Error) {
        return arg;
      }
    }
    return null;
  }

  private stringifyArgs(args: unknown[], fallback?: string): string {
    const prefix = `[${this.name}]`;
    if (args.length === 0) {
      return fallback ?? prefix;
    }

    return args
      .map((arg) => {
        if (arg instanceof Error) {
          return arg.message;
        }

        if (typeof arg === "string") {
          return arg;
        }

        try {
          return JSON.stringify(arg);
        } catch (error) {
          return `unserializable(${String(error)})`;
        }
      })
      .reduce((message, part) => `${message} ${part}`, prefix)
      .trim();
  }
}

export class ErrorReporterLoggerFactory implements LoggerFactory {
  constructor(private readonly options: ErrorReporterLoggerOptions) {}

  loggerFor(name: string): Logger {
    return new ErrorReporterLogger(name, this.options);
  }
}
