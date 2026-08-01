import { describe, expect, it } from "vite-plus/test";
import type { Config } from "@/config";
import { shouldLog } from "./filters";

const createDeveloperConfig = (
  overrides: Partial<Config["developer"]> = {},
): Config["developer"] => ({
  mode: false,
  consoleLogging: false,
  ...overrides,
});

describe("shouldLog", () => {
  it("allows debug logs when developer mode is enabled", () => {
    const config = createDeveloperConfig({ mode: true });
    expect(shouldLog("debug", config)).toBe(true);
    expect(shouldLog("info", config)).toBe(true);
    expect(shouldLog("warn", config)).toBe(true);
    expect(shouldLog("error", config)).toBe(true);
  });

  it("allows warn and error logs when console logging is enabled", () => {
    const config = createDeveloperConfig({ consoleLogging: true });
    expect(shouldLog("debug", config)).toBe(false);
    expect(shouldLog("info", config)).toBe(false);
    expect(shouldLog("warn", config)).toBe(true);
    expect(shouldLog("error", config)).toBe(true);
  });

  it("allows only error logs in the default production profile", () => {
    const config = createDeveloperConfig();
    expect(shouldLog("debug", config)).toBe(false);
    expect(shouldLog("info", config)).toBe(false);
    expect(shouldLog("warn", config)).toBe(false);
    expect(shouldLog("error", config)).toBe(true);
  });
});
