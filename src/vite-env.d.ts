/**
 * Vite环境变量类型声明文件
 *
 * 定义了应用中使用的所有环境变量的TypeScript类型。
 * 这些变量可以通过import.meta.env在代码中访问。
 * 支持无前缀和VITE_前缀两种格式，以便于不同部署环境的使用。
 *
 * @file vite-env.d.ts
 */

/// <reference types="vite/client" />

/**
 * Vite环境变量接口
 *
 * 定义了所有可用的环境变量及其类型。
 * 所有变量都是可选的（readonly），符合环境变量的特性。
 */
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly SSR: boolean;

  // 无前缀变量
  readonly SITE_TITLE?: string;
  readonly SITE_DESCRIPTION?: string;
  readonly SITE_KEYWORDS?: string;
  readonly SITE_OG_IMAGE?: string;
  readonly HOMEPAGE_FILTER_ENABLED?: string;
  readonly HOMEPAGE_ALLOWED_FOLDERS?: string;
  readonly HOMEPAGE_ALLOWED_FILETYPES?: string;
  readonly HIDE_MAIN_FOLDER_DOWNLOAD?: string;
  readonly HIDE_DOWNLOAD_FOLDERS?: string;
  readonly DOWNLOAD_PROXY_URL?: string;
  readonly DOWNLOAD_PROXY_URL_BACKUP1?: string;
  readonly DOWNLOAD_PROXY_URL_BACKUP2?: string;
  readonly USE_TOKEN_MODE?: string;
  readonly DEVELOPER_MODE?: string;
  readonly CONSOLE_LOGGING?: string;

  // VITE_前缀变量（自动生成）
  readonly VITE_SITE_TITLE?: string;
  readonly VITE_SITE_DESCRIPTION?: string;
  readonly VITE_SITE_KEYWORDS?: string;
  readonly VITE_SITE_OG_IMAGE?: string;
  readonly VITE_HOMEPAGE_FILTER_ENABLED?: string;
  readonly VITE_HOMEPAGE_ALLOWED_FOLDERS?: string;
  readonly VITE_HOMEPAGE_ALLOWED_FILETYPES?: string;
  readonly VITE_HIDE_MAIN_FOLDER_DOWNLOAD?: string;
  readonly VITE_HIDE_DOWNLOAD_FOLDERS?: string;
  readonly VITE_DOWNLOAD_PROXY_URL?: string;
  readonly VITE_DOWNLOAD_PROXY_URL_BACKUP1?: string;
  readonly VITE_DOWNLOAD_PROXY_URL_BACKUP2?: string;
  readonly VITE_USE_TOKEN_MODE?: string;
  readonly VITE_DEVELOPER_MODE?: string;
  readonly VITE_CONSOLE_LOGGING?: string;
  readonly VITE_BASE_PATH?: string;

  // GitHub仓库变量（双向同步）
  readonly GITHUB_REPO_OWNER?: string;
  readonly GITHUB_REPO_NAME?: string;
  readonly GITHUB_REPO_BRANCH?: string;
  readonly VITE_GITHUB_REPO_OWNER?: string;
  readonly VITE_GITHUB_REPO_NAME?: string;
  readonly VITE_GITHUB_REPO_BRANCH?: string;

  // GitHub PAT变量（支持无前缀和有前缀）
  readonly GITHUB_PAT?: string;
  readonly GITHUB_PAT1?: string;
  readonly GITHUB_PAT2?: string;
  readonly GITHUB_PAT3?: string;
  readonly GITHUB_PAT4?: string;
  readonly GITHUB_PAT5?: string;
  readonly VITE_GITHUB_PAT?: string;
  readonly VITE_GITHUB_PAT1?: string;
  readonly VITE_GITHUB_PAT2?: string;
  readonly VITE_GITHUB_PAT3?: string;
  readonly VITE_GITHUB_PAT4?: string;
  readonly VITE_GITHUB_PAT5?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
