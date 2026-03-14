import { CompositeLoggerFactory } from "./CompositeLogger";
import { ConsoleLoggerFactory } from "./ConsoleLogger";
import { ErrorReporterLoggerFactory, type ErrorReporter } from "./ErrorReporterLogger";
import { InMemoryLogRecorder, RecorderLoggerFactory } from "./RecorderLogger";
import { VoidLoggerFactory } from "./VoidLogger";
import type { Logger, LoggerFactory } from "./types";
import { configManager, getDeveloperConfig, type Config } from "@/config";

const APP_LOGGER_NAME = "App";

type DeveloperConfig = Config["developer"];

const recorder = new InMemoryLogRecorder(300);

let developerConfigSnapshot: DeveloperConfig = getDeveloperConfig();
let currentFactory: LoggerFactory = buildFactory(developerConfigSnapshot);
const scopedLoggers = new Map<string, Logger>();

function buildFactory(config: DeveloperConfig): LoggerFactory {
  const logging = config.logging ?? {};
  const factories: LoggerFactory[] = [];

  const shouldEnableConsole = logging.enableConsole ?? (config.mode || config.consoleLogging);
  if (shouldEnableConsole) {
    factories.push(
      new ConsoleLoggerFactory({
        getDeveloperConfig: () => developerConfigSnapshot,
      }),
    );
  }

  if (logging.enableRecorder === true) {
    factories.push(new RecorderLoggerFactory(recorder));
  }

  const reporter = resolveErrorReporter(logging);
  if (reporter !== undefined && logging.enableErrorReporting === true) {
    factories.push(
      new ErrorReporterLoggerFactory({
        reporter,
        includeWarn: logging.includeWarnInReporting === true,
      }),
    );
  }

  if (factories.length === 0) {
    return new VoidLoggerFactory();
  }

  if (factories.length === 1) {
    const singleFactory = factories[0];
    if (singleFactory !== undefined) {
      return singleFactory;
    }
  }

  return new CompositeLoggerFactory(factories);
}

function resolveErrorReporter(
  logging: DeveloperConfig["logging"] | undefined,
): ErrorReporter | undefined {
  const reportUrl = logging?.reportUrl;
  if (typeof reportUrl !== "string" || reportUrl.trim().length === 0) {
    return undefined;
  }

  return new BeaconErrorReporter(reportUrl.trim());
}

class BeaconErrorReporter implements ErrorReporter {
  constructor(private readonly endpoint: string) {}

  captureException(error: Error, context: { logger: string; args: unknown[] }): void {
    this.send({
      level: "error",
      logger: context.logger,
      message: error.message,
      stack: error.stack,
      args: context.args,
    });
  }

  captureMessage(
    message: string,
    context: { logger: string; level: "warn" | "error"; args: unknown[] },
  ): void {
    this.send({
      level: context.level,
      logger: context.logger,
      message,
      args: context.args,
    });
  }

  private send(payload: Record<string, unknown>): void {
    const body = JSON.stringify({ ...payload, timestamp: Date.now() });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        navigator.sendBeacon(this.endpoint, body);
        return;
      } catch {
        // sendBeacon 失败时回退到 fetch
      }
    }

    if (typeof fetch === "function") {
      void fetch(this.endpoint, {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: true,
        mode: "cors",
      }).catch(() => {
        return;
      });
    }
  }
}

function getLoggerInstance(name: string): Logger {
  let logger = scopedLoggers.get(name);
  if (logger === undefined) {
    const created = currentFactory.loggerFor(name);
    scopedLoggers.set(name, created);
    logger = created;
  }
  return logger;
}

function rebuildFactory(config: DeveloperConfig): void {
  developerConfigSnapshot = config;
  currentFactory = buildFactory(config);
  scopedLoggers.clear();
}

configManager.onConfigChange((nextConfig) => {
  rebuildFactory(nextConfig.developer);
});

const createFacade = (name: string): Logger => ({
  debug: (...args: unknown[]): void => {
    getLoggerInstance(name).debug(...args);
  },
  info: (...args: unknown[]): void => {
    getLoggerInstance(name).info(...args);
  },
  warn: (...args: unknown[]): void => {
    getLoggerInstance(name).warn(...args);
  },
  error: (...args: unknown[]): void => {
    getLoggerInstance(name).error(...args);
  },
  log: (...args: unknown[]): void => {
    const instance = getLoggerInstance(name);
    if (typeof instance.log === "function") {
      instance.log(...args);
    } else {
      instance.info(...args);
    }
  },
  group: (label: string): void => {
    const instance = getLoggerInstance(name);
    if (typeof instance.group === "function") {
      instance.group(label);
    }
  },
  groupEnd: (): void => {
    const instance = getLoggerInstance(name);
    if (typeof instance.groupEnd === "function") {
      instance.groupEnd();
    }
  },
});

export const logger = createFacade(APP_LOGGER_NAME);

export const createScopedLogger = (name: string): ReturnType<typeof createFacade> =>
  createFacade(name);
