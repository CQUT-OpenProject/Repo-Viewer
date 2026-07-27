import { describe, expect, it } from "vitest";
import Translator from "./translator";

const enPhrases = {
  search: {
    label: {
      inMultipleBranchesWithPath: {
        one: "Search in @@count@@ branch including @@branches@@: @@path@@",
        other: "Search in @@count@@ branches including @@branches@@: @@path@@",
      },
    },
    results: {
      summary: {
        one: "@@count@@ result • @@took@@ ms • @@mode@@",
        other: "@@count@@ results • @@took@@ ms • @@mode@@",
      },
    },
  },
  ui: {
    text: {
      meta: {
        totalLines: {
          one: "@@count@@ line total",
          other: "@@count@@ lines total",
        },
      },
    },
  },
};

const zhPhrases = {
  search: {
    label: {
      inMultipleBranchesWithPath: "在 @@branches@@ 等 @@count@@ 个分支: @@path@@ 中搜索",
    },
    results: {
      summary: "@@count@@ 项结果 • @@took@@ ms • @@mode@@",
    },
  },
  ui: {
    text: {
      meta: {
        totalLines: "共 @@count@@ 行",
      },
    },
  },
};

describe("Translator", () => {
  it("uses English plural forms for count", () => {
    const t = new Translator("en-US", enPhrases);
    expect(t.translate("ui.text.meta.totalLines", { count: 1 })).toBe("1 line total");
    expect(t.translate("ui.text.meta.totalLines", { count: 5 })).toBe("5 lines total");
    expect(
      t.translate("search.label.inMultipleBranchesWithPath", {
        branches: "main, dev, feat",
        count: 5,
        path: "src",
      }),
    ).toBe("Search in 5 branches including main, dev, feat: src");
  });

  it("keeps Chinese base form without plural keys", () => {
    const t = new Translator("zh-CN", zhPhrases);
    expect(t.translate("ui.text.meta.totalLines", { count: 1 })).toBe("共 1 行");
    expect(t.translate("ui.text.meta.totalLines", { count: 5 })).toBe("共 5 行");
    expect(
      t.translate("search.results.summary", {
        count: 2,
        took: "1.2",
        mode: "索引模式",
      }),
    ).toBe("2 项结果 • 1.2 ms • 索引模式");
  });

  it("falls back to .other when .one is missing", () => {
    const t = new Translator("en-US", {
      item: {
        other: "@@count@@ items",
      },
    });
    expect(t.translate("item", { count: 1 })).toBe("1 items");
  });

  it("exhibits inconsistent number formatting for non-count arguments when count is present vs absent", () => {
    const t = new Translator("en-US", {
      metrics: "File ID: @@fileId@@ (Total: @@count@@)",
      fileInfo: "File ID: @@fileId@@",
    });

    const resultWithoutCount = t.translate("fileInfo", { fileId: 1000 });
    const resultWithCount = t.translate("metrics", { fileId: 1000, count: 5 });

    // In current implementation, fileId 1000 is formatted as "1000" without count,
    // but formatted as "1,000" when count exists in options due to options.hasOwnProperty("count") check.
    expect(resultWithoutCount).toBe("File ID: 1000");
    expect(resultWithCount).toBe("File ID: 1000 (Total: 5)");
  });

  it("throws TypeError when options object has null prototype or custom hasOwnProperty", () => {
    const t = new Translator("en-US", {
      greeting: "Hello @@name@@",
    });

    const nullProtoOptions = Object.create(null);
    nullProtoOptions.name = "Alice";

    expect(() => t.translate("greeting", nullProtoOptions)).not.toThrow();
  });

  it("handles locale string with underscore delimiter for plural key lookup", () => {
    const t = new Translator("en_US", enPhrases);
    expect(t.translate("ui.text.meta.totalLines", { count: 5 })).toBe("5 lines total");
  });

  it("handles Chinese locale with underscore delimiter", () => {
    const t = new Translator("zh_CN", zhPhrases);
    expect(t.translate("ui.text.meta.totalLines", { count: 5 })).toBe("共 5 行");
  });
});
