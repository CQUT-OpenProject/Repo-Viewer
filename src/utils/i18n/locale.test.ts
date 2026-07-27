import { describe, expect, it } from "vite-plus/test";
import { getLanguageCode, getLocAttributes, normalizeLocale } from "./locale";

describe("locale", () => {
  it("normalizes underscore locales to supported BCP47 codes", () => {
    expect(normalizeLocale("en_US")).toBe("en-US");
    expect(normalizeLocale("zh_CN")).toBe("zh-CN");
    expect(normalizeLocale("ja_JP")).toBe("ja-JP");
  });

  it("extracts language code from underscore locales", () => {
    expect(getLanguageCode("zh_CN")).toBe("zh");
    expect(getLanguageCode("en_US")).toBe("en");
    expect(getLanguageCode("ja-JP")).toBe("ja");
  });

  it("returns html attributes for underscore locales", () => {
    expect(getLocAttributes("zh_CN")).toEqual({
      dir: "ltr",
      lang: "zh-cn",
    });
  });
});
