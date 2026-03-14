import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/utils";

/**
 * 复制成功后重置状态的默认延迟时间（毫秒）
 */
const COPY_RESET_DELAY = 2000;

/**
 * 剪贴板复制Hook的选项接口
 */
interface UseCopyToClipboardOptions {
  /** 复制成功后重置"已复制"状态的延迟时间（毫秒），默认2000ms */
  resetDelay?: number;
  /** 复制成功时的回调函数 */
  onSuccess?: () => void;
  /** 复制失败时的回调函数 */
  onError?: (error: unknown) => void;
}

/**
 * 剪贴板复制Hook的返回值接口
 */
interface UseCopyToClipboardReturn {
  /** 是否已成功复制（会在resetDelay后自动重置） */
  copied: boolean;
  /** 执行复制操作的函数 */
  copy: (text: string) => Promise<boolean>;
  /** 手动重置复制状态的函数 */
  reset: () => void;
}

/**
 * 剪贴板复制Hook
 *
 * 提供复制文本到剪贴板的功能，包含复制状态追踪和回调支持。
 * 自动检测浏览器剪贴板API支持情况，处理各种边界情况。
 *
 * @example
 * ```tsx
 * const { copied, copy, reset } = useCopyToClipboard({
 *   resetDelay: 2000,
 *   onSuccess: () => console.log('复制成功'),
 *   onError: (err) => console.error('复制失败', err)
 * });
 *
 * // 复制文本
 * await copy('要复制的文本');
 * ```
 *
 * @param options - 可选配置项
 * @returns 包含复制状态、复制函数和重置函数的对象
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
  const { resetDelay = COPY_RESET_DELAY, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCopied(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (typeof navigator === "undefined") {
          const error = new Error("navigator 未定义");
          logger.error("复制失败:", error);
          onError?.(error);
          return false;
        }

        const clipboard = navigator.clipboard as Clipboard | undefined;

        if (clipboard === undefined || typeof clipboard.writeText !== "function") {
          logger.warn("当前环境不支持 Clipboard API 自动复制");
          return false;
        }

        await clipboard.writeText(text);

        setCopied(true);
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, resetDelay);

        onSuccess?.();
        return true;
      } catch (error) {
        logger.error("复制失败:", error);
        onError?.(error);
        return false;
      }
    },
    [resetDelay, onSuccess, onError],
  );

  return { copied, copy, reset };
}
