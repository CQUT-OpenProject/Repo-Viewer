import type { LogLevel, Logger, LoggerFactory, LoggerArguments } from "./types";

export interface LogRecorder {
  record: (entry: LoggerArguments & { timestamp: number }) => void;
  clear?: () => void;
}

export class InMemoryLogRecorder implements LogRecorder {
  private readonly buffer: (LoggerArguments & { timestamp: number })[] = [];

  constructor(private readonly capacity = 200) {}

  record(entry: LoggerArguments & { timestamp: number }): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
  }

  clear(): void {
    this.buffer.length = 0;
  }
}

class RecorderLogger implements Logger {
  constructor(
    private readonly name: string,
    private readonly recorder: LogRecorder,
  ) {}

  debug(...args: unknown[]): void {
    this.record("debug", args);
  }

  info(...args: unknown[]): void {
    this.record("info", args);
  }

  log(...args: unknown[]): void {
    this.record("log", args);
  }

  warn(...args: unknown[]): void {
    this.record("warn", args);
  }

  error(...args: unknown[]): void {
    this.record("error", args);
  }

  group(label: string): void {
    this.record("group", [label]);
  }

  groupEnd(): void {
    this.record("groupEnd", []);
  }

  private record(level: LogLevel, args: unknown[]): void {
    this.recorder.record({
      name: this.name,
      level,
      args,
      timestamp: Date.now(),
    });
  }
}

export class RecorderLoggerFactory implements LoggerFactory {
  constructor(private readonly recorder: LogRecorder) {}

  loggerFor(name: string): Logger {
    return new RecorderLogger(name, this.recorder);
  }
}
