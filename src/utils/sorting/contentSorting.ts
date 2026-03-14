import { pinyin } from "pinyin-pro";
import type { GitHubContent } from "@/types";

/**
 * 获取文件名的排序键
 *
 * 对于中文文件名，转换为拼音进行排序；
 * 对于英文和其他字符，保持原样。
 *
 * @param name - 文件名
 * @returns 用于排序的键
 */
export function getSortKey(name: string): string {
  if (name.length === 0) {
    return name;
  }

  // 检查是否包含中文字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(name);

  if (hasChinese) {
    try {
      // 转换为拼音，去除音调，用于排序
      return pinyin(name, {
        toneType: "none",
        type: "array",
      })
        .join("")
        .toLowerCase();
    } catch (error) {
      console.warn("Failed to convert to pinyin:", name, error);
      return name.toLowerCase();
    }
  }

  // 非中文直接转小写
  return name.toLowerCase();
}

/**
 * 对 GitHub 内容进行排序
 *
 * 排序规则：
 * 1. 目录优先于文件
 * 2. 同类型按拼音字母顺序排序（中文转拼音）
 * 3. 支持数字的自然排序
 *
 * @param contents - 待排序的内容数组
 * @returns 排序后的新数组
 */
export function sortContentsByPinyin(contents: GitHubContent[]): GitHubContent[] {
  return [...contents].sort((a, b) => {
    // 目录优先
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }

    // 获取排序键
    const aKey = getSortKey(a.name);
    const bKey = getSortKey(b.name);

    // 按拼音字母顺序排序，支持数字自然排序
    return aKey.localeCompare(bKey, "en", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

/**
 * 获取内容的首字母（用于索引）
 *
 * @param content - GitHub 内容项
 * @returns 首字母（A-Z 或 #）
 */
export function getContentFirstLetter(content: GitHubContent): string {
  const name = content.name;
  if (name.length === 0) {
    return "#";
  }

  const firstCharRaw = name.charAt(0);
  if (firstCharRaw.length === 0) {
    return "#";
  }

  const firstChar = firstCharRaw.toUpperCase();

  // 检查是否为字母
  if (/[A-Z]/.test(firstChar)) {
    return firstChar;
  }

  // 检查是否为数字
  if (/[0-9]/.test(firstChar)) {
    return "#";
  }

  // 中文或其他字符，使用 pinyin-pro 获取拼音首字母
  const code = firstChar.charCodeAt(0);
  if (code >= 0x4e00 && code <= 0x9fa5) {
    try {
      // 获取拼音首字母
      const pinyinFirst = pinyin(firstCharRaw, {
        pattern: "first",
        toneType: "none",
      }).toUpperCase();

      // 确保返回的是单个字母
      if (pinyinFirst.length > 0 && /[A-Z]/.test(pinyinFirst.charAt(0))) {
        return pinyinFirst.charAt(0);
      }
    } catch (error) {
      console.warn("Failed to convert Chinese character to pinyin:", firstCharRaw, error);
    }
  }

  return "#";
}
