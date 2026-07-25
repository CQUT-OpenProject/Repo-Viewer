/**
 * 防抖：在 waitFor 毫秒内重复调用时，只执行最后一次。
 */
export function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  waitFor: number,
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, waitFor);
  };
}
