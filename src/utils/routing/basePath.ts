const ROOT_PATH = "/";

export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();

  if (trimmed === "" || trimmed === ROOT_PATH) {
    return ROOT_PATH;
  }

  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/gu, ROOT_PATH);

  return collapsed.endsWith(ROOT_PATH) ? collapsed : `${collapsed}${ROOT_PATH}`;
}

export function getAppBaseUrl(baseUrl: string = import.meta.env.BASE_URL): string {
  return normalizeBaseUrl(baseUrl);
}

export function getAppBasePath(baseUrl: string = import.meta.env.BASE_URL): string {
  const normalizedBaseUrl = getAppBaseUrl(baseUrl);
  return normalizedBaseUrl === ROOT_PATH ? "" : normalizedBaseUrl.slice(0, -1);
}

export function stripBasePath(
  pathname: string,
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  const basePath = getAppBasePath(baseUrl);

  if (basePath === "") {
    return pathname;
  }

  if (pathname === basePath) {
    return ROOT_PATH;
  }

  if (pathname.startsWith(`${basePath}${ROOT_PATH}`)) {
    return pathname.slice(basePath.length);
  }

  return pathname;
}

export function buildAppPath(path = "", baseUrl: string = import.meta.env.BASE_URL): string {
  const basePath = getAppBasePath(baseUrl);
  const normalizedPath = path.replace(/^\/+/u, "");

  if (normalizedPath === "") {
    return basePath === "" ? ROOT_PATH : `${basePath}${ROOT_PATH}`;
  }

  return `${basePath}${ROOT_PATH}${normalizedPath}`;
}

export function buildAbsoluteAppUrl(
  path = "",
  options?: {
    baseUrl?: string;
    origin?: string;
  },
): string {
  const appPath = buildAppPath(path, options?.baseUrl);
  const origin = options?.origin;

  if (typeof origin === "string" && origin.trim().length > 0) {
    return new URL(appPath, origin).toString();
  }

  if (typeof window === "undefined") {
    return appPath;
  }

  return new URL(appPath, window.location.origin).toString();
}
