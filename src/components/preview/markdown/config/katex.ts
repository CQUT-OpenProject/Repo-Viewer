import { logger } from "@/utils";

/**
 * KaTeX错误处理函数
 *
 * @param message - 错误消息
 * @returns void
 */
export const handleKatexError = (message: string): void => {
  logger.warn("[KaTeX] 公式渲染错误:", message);
};

/**
 * KaTeX配置选项
 */
export const katexOptions = {
  throwOnError: false, // 不因渲染错误而中断
  strict: false, // 非严格模式，更宽容地处理语法
  output: "html", // 使用HTML输出
  trust: true, // 允许一些额外的命令
  errorCallback: handleKatexError, // 错误处理
  macros: {
    // 定义一些常用的宏
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\C": "\\mathbb{C}",
    "\\Q": "\\mathbb{Q}",
  },
  fleqn: false, // 公式左对齐
  leqno: false, // 等式编号在左侧
  colorIsTextColor: true,
} as const;
