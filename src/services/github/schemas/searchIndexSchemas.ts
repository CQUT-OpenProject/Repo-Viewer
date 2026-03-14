/**
 * 搜索索引Schema定义模块
 *
 * 使用Zod定义搜索索引清单的数据结构和验证规则，
 * 确保索引文件的格式正确性和类型安全。
 */

import { z } from "zod";

/** ISO日期字符串验证Schema - 确保日期格式有效 */
const IsoDateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ISO date string",
});

/** 非空字符串验证Schema */
const NonEmptyStringSchema = z.string().min(1);

/**
 * 搜索索引分支条目Schema
 *
 * 定义单个分支的索引信息结构，包括路径、哈希、文件数量和生成时间。
 */
export const SearchIndexBranchEntrySchema = z.object({
  docfindPath: NonEmptyStringSchema,
  hash: NonEmptyStringSchema,
  fileCount: z.number().int().nonnegative().optional(),
  generatedAt: IsoDateStringSchema.optional(),
});

/**
 * 搜索索引清单Schema
 *
 * 定义完整的索引清单结构，包含schema版本、生成时间和所有分支的索引映射。
 */
export const SearchIndexManifestSchema = z.object({
  schemaVersion: z.literal("docfind-1"),
  generatedAt: IsoDateStringSchema,
  branches: z.record(z.string(), SearchIndexBranchEntrySchema),
});

/** 搜索索引清单类型 - 从Schema推断 */
export type SearchIndexManifest = z.infer<typeof SearchIndexManifestSchema>;

/** 搜索索引分支条目类型 - 从Schema推断 */
export type SearchIndexBranchEntry = z.infer<typeof SearchIndexBranchEntrySchema>;

/**
 * 安全验证搜索索引清单
 *
 * 验证数据是否符合搜索索引清单Schema，不抛出异常。
 *
 * @param data - 待验证的原始数据
 * @returns 验证成功返回数据和成功标志，失败返回错误信息
 */
export function safeValidateSearchIndexManifest(data: unknown):
  | {
      success: true;
      data: SearchIndexManifest;
    }
  | {
      success: false;
      error: string;
    } {
  try {
    const manifest = SearchIndexManifestSchema.parse(data);
    return { success: true, data: manifest };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown manifest validation error";
    return { success: false, error: message };
  }
}
