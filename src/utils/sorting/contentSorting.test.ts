import { describe, expect, it } from "vite-plus/test";
import type { GitHubContent } from "@/types";
import { getContentFirstLetter, getSortKey, sortContentsByPinyin } from "./contentSorting";

const createContent = (name: string, type: GitHubContent["type"]): GitHubContent => ({
  name,
  path: name,
  type,
  sha: `${type}-${name}`,
  download_url: null,
});

describe("contentSorting", () => {
  it("sorts directories before files and keeps natural ordering", () => {
    const contents: GitHubContent[] = [
      createContent("file-10.ts", "file"),
      createContent("目录", "dir"),
      createContent("file-2.ts", "file"),
      createContent("alpha", "dir"),
    ];

    expect(sortContentsByPinyin(contents).map((item) => item.name)).toEqual([
      "alpha",
      "目录",
      "file-2.ts",
      "file-10.ts",
    ]);
  });

  it("derives stable sort keys and initials for Chinese names", () => {
    expect(getSortKey("中文文件")).toBe("zhongwenwenjian");
    expect(getContentFirstLetter(createContent("中文文件", "file"))).toBe("Z");
  });
});
