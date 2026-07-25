/**
 * 转义正则特殊字符，使字符串可作为字面量参与 RegExp。
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
