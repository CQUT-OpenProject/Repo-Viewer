import { defineConfig, loadEnv } from "vite-plus";
import autoprefixer from "autoprefixer";
import tailwindcss from "@tailwindcss/postcss";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { VitePWA } from "vite-plugin-pwa";
import * as path from "path";
import * as http from "http";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { spawn } from "child_process";
import { ENV_MAPPING } from "./src/config/constants/index.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const iconSvgPath = path.join(rootDir, "public", "icon.svg");

/** Content hash for busting PWA icon / manifest caches when icon.svg changes. */
const getPwaIconVersion = (): string => {
  if (!existsSync(iconSvgPath)) {
    return "missing";
  }

  return createHash("sha256").update(readFileSync(iconSvgPath)).digest("hex").slice(0, 8);
};

const PWA_ICON_VERSION = getPwaIconVersion();
const pwaIconSrc = (fileName: string): string => `pwa/${fileName}?v=${PWA_ICON_VERSION}`;

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  brightWhite: "\x1b[97m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
};

const MAX_PAT_NUMBER = 10;

type Logger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
};

const getTimestamp = (): string => {
  const now = new Date();
  return now.toLocaleTimeString("zh-CN", { hour12: false });
};

const createLogger = (developerMode: boolean): Logger => ({
  log: (...args: any[]) => {
    if (developerMode) {
      console.log(
        `${colors.dim}${getTimestamp()}${colors.reset}`,
        `${colors.bright}${colors.cyan}[vite]${colors.reset}`,
        ...args,
      );
    }
  },
  warn: (...args: any[]) => {
    if (developerMode) {
      console.warn(
        `${colors.dim}${getTimestamp()}${colors.reset}`,
        `${colors.bright}${colors.yellow}[vite]${colors.reset}`,
        ...args,
      );
    }
  },
  error: (...args: any[]) => {
    if (developerMode) {
      console.error(
        `${colors.dim}${getTimestamp()}${colors.reset}`,
        `${colors.bright}${colors.red}[vite]${colors.reset}`,
        ...args,
      );
    }
  },
  info: (...args: any[]) => {
    if (developerMode) {
      console.info(
        `${colors.dim}${getTimestamp()}${colors.reset}`,
        `${colors.bright}${colors.blue}[vite]${colors.reset}`,
        ...args,
      );
    }
  },
});

const decodeUrl = (url: string | undefined): string => {
  if (!url) {
    return "";
  }
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
};

const normalizeBaseUrl = (value: string | undefined): string => {
  const trimmed = value?.trim() ?? "";

  if (trimmed === "" || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

const createRequestLoggerMiddleware = (logger: Logger) => ({
  onProxyReq(_proxyReq: http.ClientRequest, req: http.IncomingMessage) {
    const method = req.method || "UNKNOWN";
    const methodColor =
      method === "GET" ? colors.green : method === "POST" ? colors.blue : colors.cyan;
    const decoded = decodeUrl(req.url);
    logger.log(`${methodColor}${method}${colors.reset}`, `${colors.gray}${decoded}${colors.reset}`);
  },
  onProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage) {
    const statusCode = proxyRes.statusCode || 0;
    let statusColor = colors.green;
    if (statusCode >= 400) {
      statusColor = colors.red;
    } else if (statusCode >= 300) {
      statusColor = colors.yellow;
    }
    const decoded = decodeUrl(req.url);
    logger.log(
      `${statusColor}${statusCode}${colors.reset}`,
      `${colors.gray}${decoded}${colors.reset}`,
    );
  },
  onError(err: Error) {
    logger.error("proxy error", err);
  },
});

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isValidToken = (token: unknown): token is string => {
  const normalized = normalizeEnvValue(token);
  if (normalized === undefined) {
    return false;
  }

  return normalized !== "your_token_here" && !normalized.includes("placeholder");
};

const applyEnvMappingForVite = (
  env: Record<string, string | undefined>,
  isProdLike: boolean,
): void => {
  Object.entries(ENV_MAPPING).forEach(([plainKey, viteKey]) => {
    const viteValue = normalizeEnvValue(env[viteKey] ?? process.env[viteKey]);
    const plainValue = normalizeEnvValue(env[plainKey] ?? process.env[plainKey]);
    if (viteValue === undefined && plainValue !== undefined) {
      env[viteKey] = plainValue;
      process.env[viteKey] = plainValue;
    }
  });

  if (isProdLike) {
    return;
  }

  const syncPat = (plainKey: string, viteKey: string) => {
    const plainValue = normalizeEnvValue(env[plainKey] ?? process.env[plainKey]);
    const viteValue = normalizeEnvValue(env[viteKey] ?? process.env[viteKey]);
    if (plainValue !== undefined && viteValue === undefined) {
      env[viteKey] = plainValue;
      process.env[viteKey] = plainValue;
    }
  };

  syncPat("GITHUB_PAT", "VITE_GITHUB_PAT");
  for (let index = 1; index <= MAX_PAT_NUMBER; index += 1) {
    syncPat(`GITHUB_PAT${index}`, `VITE_GITHUB_PAT${index}`);
  }
};

function getAllGithubPATs() {
  const patEnvVars: Record<string, string> = {};
  const prefixes = ["GITHUB_PAT", "VITE_GITHUB_PAT"];

  for (const prefix of prefixes) {
    const baseToken = process.env[prefix];
    if (isValidToken(baseToken)) {
      patEnvVars[`process.env.${prefix}`] = JSON.stringify(baseToken.trim());
    }

    for (let index = 1; index <= MAX_PAT_NUMBER; index += 1) {
      const key = `${prefix}${index}`;
      const token = process.env[key];
      if (isValidToken(token)) {
        patEnvVars[`process.env.${key}`] = JSON.stringify(token.trim());
      }
    }
  }

  return patEnvVars;
}
function getPackageVersion() {
  try {
    const packagePath = path.resolve(rootDir, "package.json");
    const packageContent = readFileSync(packagePath, "utf-8");
    const packageJson = JSON.parse(packageContent);
    return packageJson.version;
  } catch (error) {
    console.warn("Failed to read package.json version:", error);
    return "1.0.0";
  }
}

const runNodeCommand = (args: string[], label: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? "unknown"}`));
    });
  });

const generateBuildArtifacts = async (logger: Logger): Promise<void> => {
  logger.info("Generating build-time artifacts");
  await runNodeCommand(
    [path.resolve(rootDir, "node_modules/typescript/bin/tsc"), "-p", "scripts/tsconfig.json"],
    "TypeScript prebuild",
  );
  await runNodeCommand([path.resolve(rootDir, "scripts/generateIcons.mjs")], "generateIcons");
  await runNodeCommand(
    [path.resolve(rootDir, "scripts/dist/generateInitialContent.js")],
    "generateInitialContent",
  );
};

const createPwaPlugin = (siteTitle: string, siteDescription: string, baseUrl: string) =>
  VitePWA({
    registerType: "prompt",
    injectRegister: false,
    includeAssets: [
      "icon.svg",
      "pwa/apple-touch-icon.png",
      "pwa/pwa-192x192.png",
      "pwa/pwa-512x512.png",
    ],
    manifest: {
      name: siteTitle,
      short_name: siteTitle.length > 12 ? siteTitle.slice(0, 12) : siteTitle,
      description: siteDescription,
      theme_color: "#055088",
      background_color: "#F7FAFC",
      display: "standalone",
      start_url: baseUrl,
      scope: baseUrl,
      icons: [
        {
          src: pwaIconSrc("pwa-192x192.png"),
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: pwaIconSrc("pwa-512x512.png"),
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: pwaIconSrc("pwa-512x512.png"),
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json,webmanifest}"],
      globIgnores: ["**/initial-content/manifest.json"],
      navigateFallback: "index.html",
      navigateFallbackDenylist: [/^\/api\//],
      runtimeCaching: [
        {
          urlPattern: /^\/api\//,
          handler: "NetworkOnly",
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "google-fonts-stylesheets",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-webfonts",
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
    },
  });

const createProxyConfig = (requestLogger: ReturnType<typeof createRequestLoggerMiddleware>) => ({
  "/github-api": {
    target: "https://api.github.com",
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/github-api/, ""),
    configure: (proxy: any) => {
      proxy.on("error", requestLogger.onError.bind(requestLogger));
      proxy.on("proxyReq", requestLogger.onProxyReq.bind(requestLogger));
      proxy.on("proxyRes", requestLogger.onProxyRes.bind(requestLogger));
    },
  },
  "/github-raw": {
    target: "https://raw.githubusercontent.com",
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/github-raw/, ""),
    configure: (proxy: any) => {
      proxy.on("error", requestLogger.onError.bind(requestLogger));
      proxy.on("proxyReq", requestLogger.onProxyReq.bind(requestLogger));
      proxy.on("proxyRes", requestLogger.onProxyRes.bind(requestLogger));
    },
  },
  "/github-proxy": {
    target: "https://mirror.ghproxy.com",
    changeOrigin: true,
    rewrite: (proxyPath: string) => proxyPath.replace(/^\/github-proxy/, ""),
    configure: (proxy: any) => {
      proxy.on("error", requestLogger.onError.bind(requestLogger));
      proxy.on("proxyReq", requestLogger.onProxyReq.bind(requestLogger));
      proxy.on("proxyRes", requestLogger.onProxyRes.bind(requestLogger));
    },
  },
  "/static-data": {
    target: "https://raw.githubusercontent.com",
    changeOrigin: true,
    configure: (proxy: any) => {
      proxy.on("error", requestLogger.onError.bind(requestLogger));
      proxy.on("proxyReq", requestLogger.onProxyReq.bind(requestLogger));
      proxy.on("proxyRes", requestLogger.onProxyRes.bind(requestLogger));
    },
  },
});

const createRuntimeConfigPlugin = (
  requestLogger: ReturnType<typeof createRequestLoggerMiddleware>,
) => ({
  name: "repo-runtime-config",
  config() {
    return {
      build: {
        rolldownOptions: {
          output: {
            manualChunks: (id: string) => {
              if (!id.includes("node_modules")) {
                return undefined;
              }

              const chunkGroups: Record<string, string[]> = {
                "react-vendor": ["react", "react-dom"],
                "mui-core": ["@mui/material", "@emotion/react", "@emotion/styled"],
                "mui-icons": ["@mui/icons-material"],
                "markdown-core": [
                  "react-markdown",
                  "remark-gfm",
                  "remark-github-blockquote-alert",
                  "rehype-raw",
                ],
                "markdown-math": ["katex", "rehype-katex", "remark-math"],
                "animation-vendor": ["framer-motion"],
                "interaction-vendor": ["react-zoom-pan-pinch"],
                "http-vendor": ["axios"],
                "file-vendor": ["file-saver"],
                "react-utils": ["notistack"],
                virtualization: ["react-virtualized-auto-sizer", "react-window"],
                validation: ["zod"],
              };

              for (const [chunkName, packages] of Object.entries(chunkGroups)) {
                if (
                  packages.some(
                    (pkg) =>
                      id.includes(`/node_modules/${pkg}/`) ||
                      id.includes(`\\node_modules\\${pkg}\\`),
                  )
                ) {
                  return chunkName;
                }
              }

              return undefined;
            },
            chunkFileNames: (chunkInfo: { name?: string | null }) => {
              if (chunkInfo.name?.includes("preview")) {
                return "assets/preview/[name]-[hash].js";
              }
              if (chunkInfo.name?.includes("vendor")) {
                return "assets/vendor/[name]-[hash].js";
              }
              return "assets/js/[name]-[hash].js";
            },
            assetFileNames: (assetInfo: { name?: string | undefined }) => {
              if (assetInfo.name?.endsWith(".css")) {
                if (assetInfo.name.includes("katex")) {
                  return "assets/css/vendor/katex-[hash][extname]";
                }
                return "assets/css/[name]-[hash][extname]";
              }
              return "assets/[ext]/[name]-[hash][extname]";
            },
          },
        },
      },
      server: {
        proxy: createProxyConfig(requestLogger),
      },
    };
  },
});

const createGithubApiMiddleware = (logger: Logger) => {
  return async (req: any, res: any, next: () => void): Promise<void> => {
    if (!req.url?.startsWith("/api/github")) {
      next();
      return;
    }

    try {
      logger.log(
        `${colors.brightWhite}Processing API request:${colors.reset}`,
        `${colors.gray}${decodeURIComponent(req.url)}${colors.reset}`,
      );

      const module = await import("./api/github");
      const handler = module.default;

      const urlParts = req.url.split("?");
      const query: Record<string, string | string[]> = {};

      if (urlParts.length > 1) {
        const params = new URLSearchParams(urlParts[1]);
        params.forEach((value, key) => {
          const existing = query[key];
          if (existing) {
            query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
          } else {
            query[key] = value;
          }
        });
      }

      const vercelReq = {
        query,
        body: undefined,
        headers: req.headers,
        method: req.method,
      } as any;

      const vercelRes = {
        status: (code: number) => {
          res.statusCode = code;
          return vercelRes;
        },
        json: (data: any) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
          return vercelRes;
        },
        send: (data: any) => {
          if (Buffer.isBuffer(data)) {
            res.end(data);
          } else {
            res.end(data);
          }
          return vercelRes;
        },
        setHeader: (name: string, value: string | number) => {
          res.setHeader(name, value);
          return vercelRes;
        },
      } as any;

      await handler(vercelReq, vercelRes);
      logger.log(`${colors.green}API request completed${colors.reset}`);
    } catch (error) {
      logger.error(`${colors.red}API handler error:${colors.reset}`, error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }
    }
  };
};

const createVercelApiHandlerPlugin = (logger: Logger) => ({
  name: "vercel-api-handler",
  configureServer(server: any) {
    server.middlewares.use(createGithubApiMiddleware(logger));
  },
  configurePreviewServer(server: any) {
    server.middlewares.use(createGithubApiMiddleware(logger));
  },
});

const createPwaIconVersionHtmlPlugin = () => ({
  name: "inject-pwa-icon-version",
  transformIndexHtml: {
    order: "pre" as const,
    handler(html: string) {
      return html.replaceAll("__PWA_ICON_VERSION__", PWA_ICON_VERSION);
    },
  },
});

const createBuildArtifactsPlugin = (logger: Logger) => {
  let artifactTask: Promise<void> | null = null;

  const ensureBuildArtifacts = (): Promise<void> => {
    artifactTask ??= generateBuildArtifacts(logger).finally(() => {
      artifactTask = null;
    });
    return artifactTask;
  };

  return {
    name: "repo-build-artifacts",
    async buildStart() {
      await ensureBuildArtifacts();
    },
    async configureServer() {
      await ensureBuildArtifacts();
    },
    async configurePreviewServer() {
      await ensureBuildArtifacts();
    },
  };
};

const mode = process.env.MODE ?? process.env.NODE_ENV ?? "development";
const env = loadEnv(mode, process.cwd(), "");
const isProdLike = mode === "production" || process.env.NODE_ENV === "production";

applyEnvMappingForVite(env, isProdLike);

const DEVELOPER_MODE = (env.VITE_DEVELOPER_MODE || env.DEVELOPER_MODE) === "true";
const APP_BASE_URL = normalizeBaseUrl(env.VITE_BASE_PATH ?? process.env.VITE_BASE_PATH);
const PWA_SITE_TITLE = normalizeEnvValue(env.VITE_SITE_TITLE ?? env.SITE_TITLE) ?? "Repo-Viewer";
const PWA_SITE_DESCRIPTION =
  normalizeEnvValue(env.VITE_SITE_DESCRIPTION ?? env.SITE_DESCRIPTION) ??
  "基于MD3设计语言的GitHub仓库浏览应用";
const logger = createLogger(DEVELOPER_MODE);
const requestLogger = createRequestLoggerMiddleware(logger);
export default defineConfig({
  base: APP_BASE_URL,
  lint: {
    plugins: ["typescript", "unicorn", "react"],
    ignorePatterns: [".vite/**", "dist/**", "node_modules/**", "scripts/**", "vite.config.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["memo", "useCallback"],
              message:
                "React Compiler is enabled for this project. Prefer plain functions and component declarations; use React.useCallback only for documented semantic identity requirements.",
            },
          ],
        },
      ],
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unassigned-vars": "off",
      "no-debugger": "error",
    },
    overrides: [
      {
        files: ["**/*.{js,jsx}"],
        rules: {
          "@typescript-eslint/no-explicit-any": "warn",
        },
      },
    ],
    options: {
      typeAware: true,
    },
  },
  test: {
    include: ["src/**/*.test.ts", "api/**/*.test.ts"],
    environment: "node",
  },
  staged: {
    "*": "vp check --fix",
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    createPwaIconVersionHtmlPlugin(),
    createBuildArtifactsPlugin(logger),
    createRuntimeConfigPlugin(requestLogger),
    createVercelApiHandlerPlugin(logger),
    createPwaPlugin(PWA_SITE_TITLE, PWA_SITE_DESCRIPTION, APP_BASE_URL),
  ],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 3000,
    open: true,
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(rootDir, "src") }],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@mui/material",
      "@emotion/react",
      "@emotion/styled",
      "axios",
      "framer-motion",
      "style-to-js",
      "style-to-object",
      "react-markdown",
      "remark-gfm",
      "remark-math",
      "rehype-katex",
      "prismjs",
    ],
    exclude: ["katex"],
  },
  define: {
    ...getAllGithubPATs(),
    __APP_VERSION__: JSON.stringify(getPackageVersion()),
  },
});
