export const createAbortError = (message = "Request aborted"): Error => {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
};

export const isAbortError = (error: unknown): error is Error & { code?: string } => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "CanceledError" ||
    (typeof error.code === "string" && error.code === "ERR_CANCELED")
  );
};
