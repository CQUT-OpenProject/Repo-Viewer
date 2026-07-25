import type { ErrorManager } from "./ErrorManager";

let errorThrottleTimer: ReturnType<typeof setTimeout> | null = null;
let errorThrottled = false;
const ERROR_THROTTLE_MS = 1000;

let promiseRejectionThrottleTimer: ReturnType<typeof setTimeout> | null = null;
let promiseRejectionThrottled = false;
const PROMISE_REJECTION_THROTTLE_MS = 1000;

export function setupGlobalErrorHandlers(errorManager: typeof ErrorManager): void {
  window.addEventListener("error", (event) => {
    if (errorThrottled) {
      return;
    }
    errorThrottled = true;

    const error = event.error instanceof Error ? event.error : new Error(String(event.error));
    errorManager.captureError(error, {
      component: "window",
      action: "global_error",
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    if (errorThrottleTimer !== null) {
      clearTimeout(errorThrottleTimer);
    }
    errorThrottleTimer = setTimeout(() => {
      errorThrottled = false;
      errorThrottleTimer = null;
    }, ERROR_THROTTLE_MS);
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (promiseRejectionThrottled) {
      return;
    }
    promiseRejectionThrottled = true;

    const errorMessage = typeof event.reason === "string" ? event.reason : String(event.reason);
    errorManager.captureError(new Error(errorMessage), {
      component: "window",
      action: "unhandled_promise_rejection",
    });

    if (promiseRejectionThrottleTimer !== null) {
      clearTimeout(promiseRejectionThrottleTimer);
    }
    promiseRejectionThrottleTimer = setTimeout(() => {
      promiseRejectionThrottled = false;
      promiseRejectionThrottleTimer = null;
    }, PROMISE_REJECTION_THROTTLE_MS);
  });
}
