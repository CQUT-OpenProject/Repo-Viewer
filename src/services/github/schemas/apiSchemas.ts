/**
 * GitHub API Schema定义模块
 *
 * 使用Zod定义GitHub API响应的数据结构和验证规则。
 */

import { z } from "zod";

export const GitHubLinksSchema = z.object({
  self: z.string(),
  git: z.string(),
  html: z.string(),
});

export const GitHubContentItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number().optional(),
  url: z.string(),
  html_url: z.string(),
  git_url: z.string(),
  download_url: z.string().nullable(),
  type: z.enum(["file", "dir"]),
  _links: GitHubLinksSchema.optional(),
});

export const GitHubContentsResponseSchema = z.union([
  GitHubContentItemSchema,
  z.array(GitHubContentItemSchema),
]);

export type GitHubContentItem = z.infer<typeof GitHubContentItemSchema>;
export type GitHubContentsResponse = z.infer<typeof GitHubContentsResponseSchema>;

/**
 * 安全验证GitHub内容响应
 */
export function safeValidateGitHubContentsResponse(data: unknown):
  | {
      success: true;
      data: GitHubContentsResponse;
    }
  | {
      success: false;
      error: string;
    } {
  try {
    const validatedData = GitHubContentsResponseSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知验证错误",
    };
  }
}
