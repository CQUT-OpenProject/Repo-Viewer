import { describe, expect, it } from "vitest";
import { isMarkdownFile, isTextFile } from "./fileHelpers";

describe("fileHelpers bug verification", () => {
  it("fails to identify .markdown and .mdx as markdown files", () => {
    expect(isMarkdownFile("README.md")).toBe(true);
    expect(isMarkdownFile("DOCUMENTATION.markdown")).toBe(true);
    expect(isMarkdownFile("component.mdx")).toBe(true);
  });

  it("fails to classify dotfiles without standard extensions as text files due to unreachable dead code on line 322", () => {
    expect(isTextFile(".bashrc")).toBe(true);
    expect(isTextFile(".clang-format")).toBe(true);
  });
});
