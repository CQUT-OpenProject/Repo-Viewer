/**
 * 格式化文件大小
 *
 * 将字节数转换为人类可读的文件大小格式。
 *
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // 确保索引在有效范围内
  const sizeUnit = sizes[i] ?? "Bytes";
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  return `${String(formattedSize)} ${sizeUnit}`;
};
