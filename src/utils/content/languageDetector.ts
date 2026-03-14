/**
 * 文件扩展名到 Prism 语言标识符的映射
 *
 * 将常见的文件扩展名映射到 Prism.js 支持的语言标识符
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",

  // Web
  html: "markup",
  htm: "markup",
  xhtml: "markup",
  xml: "markup",
  xaml: "markup",
  svg: "markup",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  styl: "stylus",

  // Data formats
  json: "json",
  json5: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",

  // Python
  py: "python",
  pyw: "python",

  // Java ecosystem
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  groovy: "groovy",

  // .NET
  cs: "csharp",
  fs: "fsharp",
  fsx: "fsharp",
  vb: "vbnet",

  // C/C++
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",

  // Objective-C/Swift
  m: "objectivec",
  mm: "objectivec",
  swift: "swift",

  // Systems programming
  rs: "rust",
  go: "go",

  // Scripting
  rb: "ruby",
  erb: "erb",
  php: "php",
  lua: "lua",
  pl: "perl",
  pm: "perl",
  r: "r",
  jl: "julia",

  // Shell
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",
  ps1: "powershell",
  bat: "batch",
  cmd: "batch",

  // SQL
  sql: "sql",
  prisma: "prisma",

  // Configuration
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  config: "ini",
  properties: "properties",
  prop: "properties",
  toml: "toml",

  // Functional
  clj: "clojure",
  cljs: "clojure",
  edn: "clojure",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  elm: "elm",

  // Markup/Documentation
  md: "markdown",
  markdown: "markdown",
  mdx: "mdx",
  tex: "latex",
  latex: "latex",

  // Build tools
  dockerfile: "docker",
  gradle: "gradle",
  cmake: "cmake",
  make: "makefile",
  mk: "makefile",
  nix: "nix",

  // Other
  dart: "dart",
  vue: "markup", // Vue 文件使用 markup 语法高亮
  svelte: "markup", // Svelte 文件使用 markup 语法高亮
  log: "log",
  csv: "text",
  tsv: "text",
  txt: "text",
  text: "text",
};

/**
 * 根据文件名获取对应的 Prism 语言标识符
 *
 * @param filename - 文件名（可以包含路径）
 * @returns Prism 语言标识符，如果无法识别则返回 null
 */
export function detectLanguage(filename: string): string | null {
  if (filename.length === 0) {
    return null;
  }

  // 处理无扩展名的特殊文件名
  const lowerName = filename.toLowerCase();
  const basename = lowerName.split("/").pop() ?? lowerName;

  // 检查特殊文件名（无扩展名）
  const specialFiles: Record<string, string> = {
    dockerfile: "docker",
    makefile: "makefile",
    "cmakelists.txt": "cmake",
    rakefile: "ruby",
    gemfile: "ruby",
    procfile: "text",
    readme: "markdown",
    license: "text",
    copying: "text",
    authors: "text",
    todo: "text",
    changelog: "text",
    "package.json": "json",
    "package-lock.json": "json",
    "tsconfig.json": "json",
    "jsconfig.json": "json",
    ".gitignore": "git",
    ".gitattributes": "git",
    ".gitmodules": "git",
    ".env": "bash",
    ".env.example": "bash",
    "build.gradle": "gradle",
    gradlew: "bash",
    "gradlew.bat": "batch",
  };

  const specialLanguage = specialFiles[basename];
  if (specialLanguage !== undefined && specialLanguage !== "") {
    return specialLanguage;
  }

  // 提取扩展名
  const parts = basename.split(".");
  if (parts.length < 2) {
    return null;
  }

  const lastPart = parts[parts.length - 1];
  const extension = lastPart !== undefined ? lastPart.toLowerCase() : "";
  if (extension === "") {
    return null;
  }

  return EXTENSION_TO_LANGUAGE[extension] ?? null;
}
