/**
 * 哈希工具模块
 *
 * 提供基于 Web Crypto API 的标准哈希算法实现。
 * 用于生成可靠的缓存键、数据指纹等。
 */

/**
 * 同步哈希函数（使用快速非加密哈希）
 *
 * 适用于不需要加密安全性的场景，如缓存键生成。
 * 使用改进的 cyrb53 算法，提供良好的分布性和低冲突率。
 *
 * @param str - 要哈希的字符串
 * @param seed - 可选的种子值，默认为0
 * @returns 十六进制格式的哈希字符串
 *
 * @example
 * const hash = hashStringSync('my-data');
 * // 返回: 'a3f2d9e8b1c4f7'
 */
export function hashStringSync(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16).padStart(14, "0");
}

/**
 * 生成缓存键
 *
 * 为给定的组件生成一个优化的缓存键。
 * 优先使用同步哈希以提高性能，仅在需要时使用加密哈希。
 *
 * @param components - 缓存键的组成部分
 * @param prefix - 可选的前缀，默认为空
 * @param useSecure - 是否使用加密安全的哈希，默认为 false
 * @returns Promise，解析为缓存键字符串
 *
 * @example
 * // 同步哈希（默认）
 * const key = await generateCacheKey(['branch', 'path'], 'c_');
 * // 返回: 'c_a3f2d9e8b1c4f7'
 *
 * // 加密哈希
 * const secureKey = await generateCacheKey(['sensitive', 'data'], 'sk_', true);
 * // 返回: 'sk_a3f2d9e8b1c4f7a0'
 */
