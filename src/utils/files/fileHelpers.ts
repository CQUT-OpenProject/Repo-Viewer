import {
  PictureAsPdf as PdfIcon,
  Article as MarkdownIcon,
  TextSnippet as TxtIcon,
  InsertDriveFile as DocIcon,
  Calculate as SpreadsheetIcon,
  Slideshow as PresentationIcon,
  Image as ImageIcon,
  Movie as VideoIcon,
  MusicNote as AudioIcon,
  Code as CodeIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import type { ElementType } from "react";

// 文件扩展名与图标映射
export const fileExtensionIcons: Record<string, ElementType> = {
  zip: ArchiveIcon,
  rar: ArchiveIcon,
  "7z": ArchiveIcon,
  tar: ArchiveIcon,
  gz: ArchiveIcon,
  pdf: PdfIcon,
  doc: DocIcon,
  docx: DocIcon,
  txt: TxtIcon,
  md: MarkdownIcon,
  xls: SpreadsheetIcon,
  xlsx: SpreadsheetIcon,
  csv: SpreadsheetIcon,
  ppt: PresentationIcon,
  pptx: PresentationIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  png: ImageIcon,
  gif: ImageIcon,
  bmp: ImageIcon,
  svg: ImageIcon,
  mp3: AudioIcon,
  wav: AudioIcon,
  ogg: AudioIcon,
  mp4: VideoIcon,
  avi: VideoIcon,
  mov: VideoIcon,
  mkv: VideoIcon,
  js: CodeIcon,
  ts: CodeIcon,
  jsx: CodeIcon,
  tsx: CodeIcon,
  html: CodeIcon,
  css: CodeIcon,
  mjs: CodeIcon,
  cjs: CodeIcon,
  json: CodeIcon,
  jsonc: CodeIcon,
  json5: CodeIcon,
  yml: CodeIcon,
  yaml: CodeIcon,
  xml: CodeIcon,
  py: CodeIcon,
  pyw: CodeIcon,
  rb: CodeIcon,
  php: CodeIcon,
  java: CodeIcon,
  kt: CodeIcon,
  kts: CodeIcon,
  scala: CodeIcon,
  swift: CodeIcon,
  c: CodeIcon,
  h: CodeIcon,
  cpp: CodeIcon,
  cc: CodeIcon,
  cxx: CodeIcon,
  hpp: CodeIcon,
  hh: CodeIcon,
  hxx: CodeIcon,
  m: CodeIcon,
  mm: CodeIcon,
  go: CodeIcon,
  rs: CodeIcon,
  dart: CodeIcon,
  lua: CodeIcon,
  sh: CodeIcon,
  bash: CodeIcon,
  zsh: CodeIcon,
  fish: CodeIcon,
  ps1: CodeIcon,
  bat: CodeIcon,
  cmd: CodeIcon,
  sql: CodeIcon,
  cs: CodeIcon,
  fs: CodeIcon,
  fsx: CodeIcon,
  vb: CodeIcon,
};

/**
 * 通用的文件扩展名检测函数
 *
 * 检查文件名是否具有指定的扩展名列表中的任何一个。
 *
 * @param filename - 文件名
 * @param extensions - 扩展名数组（可以带或不带前缀点）
 * @returns 如果文件扩展名匹配返回true
 */
function checkFileExtension(filename: string, extensions: string[]): boolean {
  const lowerCaseFileName = filename.toLowerCase();
  return extensions.some((ext) => {
    // 确保扩展名以点开头
    const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;
    return lowerCaseFileName.endsWith(normalizedExt);
  });
}

const TEXT_FILE_EXTENSIONS: string[] = [
  "txt",
  "text",
  "log",
  "md",
  "markdown",
  "mdx",
  "adoc",
  "asciidoc",
  "rst",
  "json",
  "json5",
  "jsonc",
  "yml",
  "yaml",
  "xml",
  "xaml",
  "ini",
  "cfg",
  "conf",
  "config",
  "properties",
  "prop",
  "toml",
  "lock",
  "csv",
  "tsv",
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "tsx",
  "css",
  "scss",
  "sass",
  "less",
  "styl",
  "pcss",
  "html",
  "htm",
  "xhtml",
  "vue",
  "svelte",
  "py",
  "pyw",
  "rb",
  "erb",
  "java",
  "kt",
  "kts",
  "scala",
  "groovy",
  "cs",
  "fs",
  "fsx",
  "vb",
  "c",
  "h",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "hh",
  "hxx",
  "m",
  "mm",
  "rs",
  "go",
  "swift",
  "dart",
  "php",
  "sql",
  "prisma",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "bat",
  "cmd",
  "lua",
  "pl",
  "pm",
  "r",
  "jl",
  "tex",
  "clj",
  "cljs",
  "edn",
  "ex",
  "exs",
  "erl",
  "dockerfile",
  "gradle",
  "cmake",
  "make",
  "mk",
  "nix",
];

const TEXT_FILE_NAMES = new Set([
  "dockerfile",
  "makefile",
  "cmakelists.txt",
  "gemfile",
  "procfile",
  "rakefile",
  "todo",
  "changelog",
  "license",
  "copying",
  "authors",
  "build.gradle",
  "gradlew",
  "gradlew.bat",
  "pom.xml",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "cargo.toml",
  "go.mod",
  "go.sum",
  "poetry.lock",
  "pyproject.toml",
  "requirements.txt",
  "tsconfig.json",
  "jsconfig.json",
  ".gitignore",
  ".gitmodules",
  ".gitattributes",
  ".npmignore",
  ".npmrc",
  ".editorconfig",
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  ".stylelintrc",
  ".babelrc",
  "browserslist",
  ".env",
  ".env.example",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "readme",
  "license",
  "copying",
]);

/**
 * 检查是否为图像文件
 *
 * @param filename - 文件名
 * @returns 如果是图像文件返回true
 */
export const isImageFile = (filename: string): boolean => {
  return checkFileExtension(filename, ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"]);
};

/**
 * 检查是否为PDF文件
 *
 * @param filename - 文件名
 * @returns 如果是PDF文件返回true
 */
export const isPdfFile = (filename: string): boolean => {
  return checkFileExtension(filename, ["pdf"]);
};

/**
 * 检查是否为Markdown文件
 *
 * @param filename - 文件名
 * @returns 如果是Markdown文件返回true
 */
export const isMarkdownFile = (filename: string): boolean => {
  return checkFileExtension(filename, ["md"]);
};

/**
 * 检查是否为文本类文件
 *
 * @param filename - 文件名
 * @returns 如果是文本文件返回true
 */
export const isTextFile = (filename: string): boolean => {
  const lowerCaseName = filename.toLowerCase();

  // 排除已知特殊处理的文件
  if (isMarkdownFile(lowerCaseName) || isPdfFile(lowerCaseName) || isImageFile(lowerCaseName)) {
    return false;
  }

  if (checkFileExtension(lowerCaseName, TEXT_FILE_EXTENSIONS)) {
    return true;
  }

  if (TEXT_FILE_NAMES.has(lowerCaseName)) {
    return true;
  }

  return lowerCaseName.startsWith(".") && TEXT_FILE_NAMES.has(lowerCaseName);
};
