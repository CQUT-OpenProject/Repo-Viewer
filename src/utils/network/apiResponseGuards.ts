/**
 * Detects common non-JSON API failure payloads before schema validation runs.
 */
export function assertGitHubContentsPayload(data: unknown): void {
  if (typeof data === "string") {
    const trimmed = data.trimStart();
    if (
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.startsWith("<!doctype")
    ) {
      throw new Error("服务端返回了 HTML 页面而非 API 数据");
    }

    throw new Error("服务端返回了非 JSON 数据");
  }

  if (data === null || data === undefined || typeof data !== "object") {
    throw new Error("服务端返回了空的或无效的响应");
  }

  if (Array.isArray(data)) {
    return;
  }

  if ("error" in data) {
    const record = data;
    const message =
      typeof record.message === "string"
        ? record.message
        : typeof record.error === "string"
          ? record.error
          : "API 请求失败";
    throw new Error(message);
  }
}

export function isOfflineEnvironment(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function createOfflineContentError(action: string): Error {
  return new Error(`${action}：当前处于离线状态，无法获取新内容。`);
}

export function isMisroutedApiResponseError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("api响应格式错误") ||
    normalized.includes("html 页面而非 api 数据") ||
    normalized.includes("非 json 数据") ||
    normalized.includes("无效的响应")
  );
}

const isFetchNetworkFailure = (error: Error): boolean => {
  const normalizedMessage = error.message.toLowerCase();
  return (
    normalizedMessage.includes("network error") ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("network request failed") ||
    error.name === "AxiosError"
  );
};

/** Returns a user-facing error message that accounts for offline and network failures. */
export function getNetworkAwareErrorMessage(error: unknown, action: string): string {
  if (isOfflineEnvironment()) {
    return `${action}：当前处于离线状态，请检查网络连接后重试。`;
  }

  if (error instanceof Error) {
    if (isFetchNetworkFailure(error) || isMisroutedApiResponseError(error.message)) {
      return `${action}：网络或服务响应异常，请检查连接后重试。`;
    }

    return `${action}: ${error.message}`;
  }

  return `${action}: 未知错误`;
}
