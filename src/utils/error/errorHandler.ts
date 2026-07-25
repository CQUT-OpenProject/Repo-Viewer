import { ErrorManager } from "./ErrorManager";
import { logger } from "../logging/logger";

export interface ErrorHandlerOptions {
  silent?: boolean;
}

/** Capture + log. UI notify is done by call sites via snackbar. */
export function handleError(
  error: unknown,
  context: string,
  options: ErrorHandlerOptions = {},
): void {
  const appError = ErrorManager.captureError(
    error instanceof Error ? error : new Error(String(error)),
    { component: context },
  );

  if (options.silent !== true) {
    logger.error(`[${context}] 错误:`, appError);
  }
}
