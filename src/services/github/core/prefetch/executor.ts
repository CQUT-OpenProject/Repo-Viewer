import type { GitHubContent } from "@/types";

import { RequestBatcher } from "../../RequestBatcher";
import { getAuthHeaders } from "../Auth";
import { getFileContent } from "../content";

const batcher = new RequestBatcher();

/**
 * 按优先级预加载文件内容。
 *
 * @param files - 待预加载文件列表
 * @param priority - 请求批次优先级
 * @returns Promise<void>
 */
export async function prefetchFilesWithPriority(
  files: GitHubContent[],
  priority: "high" | "medium" | "low",
): Promise<void> {
  const fileUrls = files
    .map((file) => file.download_url)
    .filter((url): url is string => Boolean(url));

  if (fileUrls.length === 0) {
    return;
  }

  const prefetchPromises = fileUrls.map((url) =>
    batcher
      .enqueue(
        `prefetch:${url}`,
        async () => {
          await getFileContent(url);
          return null;
        },
        {
          priority,
          method: "GET",
          headers: getAuthHeaders() as Record<string, string>,
          fingerprintCache: "use",
        },
      )
      .catch(() => null),
  );

  await Promise.allSettled(prefetchPromises);
}
