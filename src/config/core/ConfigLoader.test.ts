import { describe, expect, it } from "vite-plus/test";
import { parseProxyUrls, resolveDeveloperLoggingConfig } from "./ConfigLoader";

describe("parseProxyUrls", () => {
  it("splits comma-separated URLs and trims whitespace", () => {
    expect(parseProxyUrls(" https://a.com , https://b.com ")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("filters empty segments", () => {
    expect(parseProxyUrls("https://a.com,, ,https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseProxyUrls("   ")).toEqual([]);
  });
});

describe("resolveDeveloperLoggingConfig", () => {
  it("enables error reporting when LOGGER_REPORT_URL is set", () => {
    const result = resolveDeveloperLoggingConfig(
      { LOGGER_REPORT_URL: "https://example.com/log" },
      false,
      false,
    );

    expect(result).toEqual({
      enableConsole: false,
      enableErrorReporting: true,
      reportUrl: "https://example.com/log",
    });
  });

  it("derives console logging from developer mode and console logging flags", () => {
    expect(resolveDeveloperLoggingConfig({}, true, false).enableConsole).toBe(true);
    expect(resolveDeveloperLoggingConfig({}, false, true).enableConsole).toBe(true);
    expect(resolveDeveloperLoggingConfig({}, false, false).enableConsole).toBe(false);
  });

  it("accepts LOGGER_LEVEL when valid and ignores invalid values", () => {
    expect(resolveDeveloperLoggingConfig({ LOGGER_LEVEL: "info" }, false, false).baseLevel).toBe(
      "info",
    );
    expect(
      resolveDeveloperLoggingConfig({ LOGGER_LEVEL: "verbose" }, false, false).baseLevel,
    ).toBeUndefined();
  });
});
