/**
 * 类型定义统一导出
 *
 * 将所有类型定义按功能域拆分到不同文件中，并在此统一导出。
 */

// 导出错误相关类型
export * from "./errors";

// 导出预览相关类型
export type * from "./preview";

// 导出下载相关类型
export type * from "./download";

/**
 * GitHub仓库内容项接口
 */
export interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  size?: number;
  download_url: string | null;
  url?: string;
  html_url?: string;
  git_url?: string;
  _links?: {
    self: string;
    git: string;
    html: string;
  };
}

/**
 * 面包屑导航段接口
 */
export interface BreadcrumbSegment {
  /** 显示名称 */
  name: string;
  /** 路径 */
  path: string;
}

/**
 * 首屏注水的目录条目
 */
export interface InitialContentDirectoryEntry {
  /** 目录路径，根目录使用空字符串 */
  path: string;
  /** 目录下的内容列表 */
  contents: GitHubContent[];
}

/**
 * 首屏注水的文件条目
 */
export interface InitialContentFileEntry {
  /** 文件在仓库中的路径 */
  path: string;
  /** 文件对应的下载地址 */
  downloadUrl?: string | null;
  /** Git 对象的 SHA */
  sha?: string;
  /** 文件内容（UTF-8 文本或 Base64） */
  content: string;
  /** 内容编码类型，默认为 utf-8 */
  encoding?: "utf-8" | "base64";
}

/**
 * 构建期注入的首屏内容载荷
 */
export interface InitialContentHydrationPayload {
  /** 载荷版本，便于后续演进 */
  version: number;
  /** 生成时间戳（ISO 字符串） */
  generatedAt: string;
  /** 对应的分支名称 */
  branch: string;
  /** 仓库信息 */
  repo: {
    owner: string;
    name: string;
  };
  /** 目录数据列表 */
  directories: InitialContentDirectoryEntry[];
  /** 文件内容列表 */
  files: InitialContentFileEntry[];
  /** 额外元数据（可选） */
  metadata?: Record<string, unknown>;
}
