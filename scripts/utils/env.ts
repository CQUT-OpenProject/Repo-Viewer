import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

const DEFAULT_ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local"];

export const loadEnvFiles = (rootDir: string, files: string[] = DEFAULT_ENV_FILES): void => {
  files.forEach((fileName) => {
    const fullPath = path.join(rootDir, fileName);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: true });
    }
  });
};

export const resolveEnvValue = (
  keys: string[],
  fallback = "",
  env: NodeJS.ProcessEnv = process.env,
): string => {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
};

export const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return fallback;
};

export const parseList = (value: string | undefined): string[] => {
  if (value === undefined || value.trim().length === 0) {
    return [];
  }
  const items = value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(items));
};

export const collectTokens = (
  prefixes: string[] = ["GITHUB_PAT", "VITE_GITHUB_PAT", "GITHUB_TOKEN"],
  env: NodeJS.ProcessEnv = process.env,
): string[] => {
  const tokens: string[] = [];
  const keys = Object.keys(env)
    .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
    .sort((a, b) => a.localeCompare(b, "en"));

  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      tokens.push(value.trim());
    }
  }

  return tokens;
};
