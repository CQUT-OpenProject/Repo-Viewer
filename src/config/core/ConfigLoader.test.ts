import { describe, expect, it } from "vite-plus/test";
import { parseProxyUrls } from "./ConfigLoader";

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
