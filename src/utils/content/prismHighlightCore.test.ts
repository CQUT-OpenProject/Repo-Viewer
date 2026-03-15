import { describe, expect, it } from "vitest";
import { highlightContent } from "./prismHighlightCore";
import { encodeLines, normalizeContentLines } from "./textPreviewLines";

describe("prismHighlightCore", () => {
  it("normalizes CRLF content into preview lines", () => {
    expect(normalizeContentLines("a\r\nb\r\n")).toEqual(["a", "b", ""]);
  });

  it("escapes plain text lines and preserves empty rows", () => {
    expect(encodeLines(["", "<tag>"])).toEqual(["\u00A0", "&lt;tag&gt;"]);
  });

  it("highlights supported languages line by line", () => {
    const highlighted = highlightContent("const value = 1;\nreturn value;", "typescript");

    expect(highlighted).toHaveLength(2);
    expect(highlighted[0]).toContain('class="token keyword"');
    expect(highlighted[0]).toContain("const");
  });

  it("falls back to escaped text when no language is available", () => {
    expect(highlightContent("<div>", null)).toEqual(["&lt;div&gt;"]);
  });
});
