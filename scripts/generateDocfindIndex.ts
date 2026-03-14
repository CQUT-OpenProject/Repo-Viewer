import crypto from "crypto";
import { once } from "events";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

import {
  collectTokens,
  loadEnvFiles,
  parseBoolean,
  parseList,
  resolveEnvValue,
} from "./utils/env.js";
import { resolveRepoRoot } from "./utils/paths.js";

interface DocfindManifestBranch {
  docfindPath: string;
  hash: string;
  fileCount: number;
  generatedAt: string;
}

interface DocfindManifest {
  schemaVersion: "docfind-1";
  generatedAt: string;
  branches: Record<string, DocfindManifestBranch>;
}

// 默认文本/代码文件扩展名白名单（仅用于内容索引，路径始终进入索引）
const DEFAULT_EXTENSION_WHITELIST = [
  "md",
  "markdown",
  "mdx",
  "txt",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "jsonc",
  "css",
  "scss",
  "less",
  "html",
  "htm",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "properties",
  "sql",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "py",
  "go",
  "java",
  "kt",
  "kts",
  "cs",
  "c",
  "h",
  "cpp",
  "hpp",
  "rs",
  "rb",
  "php",
  "swift",
  "m",
  "mm",
  "scala",
  "lua",
];

// 默认最大内容索引体积，超限文件只索引路径
const DEFAULT_MAX_FILE_SIZE = 512 * 1024;
const DOCFIND_SCHEMA_VERSION = "docfind-1" as const;

// 统一处理命令输出，避免在调用处重复拼接逻辑
// 运行外部命令并返回 stdout 文本
const runCommandText = (command: string, args: string[], cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);

    child.stdout.on("data", (chunk) => {
      stdout = Buffer.concat([stdout, chunk]);
    });

    child.stderr.on("data", (chunk) => {
      stderr = Buffer.concat([stderr, chunk]);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.toString("utf8").trim());
      } else {
        const message = stderr.toString("utf8").trim();
        reject(new Error(message.length > 0 ? message : `${command} failed`));
      }
    });
  });

// 运行外部命令并返回 stdout 二进制
const runCommandBuffer = (command: string, args: string[], cwd: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);

    child.stdout.on("data", (chunk) => {
      stdout = Buffer.concat([stdout, chunk]);
    });

    child.stderr.on("data", (chunk) => {
      stderr = Buffer.concat([stderr, chunk]);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        const message = stderr.toString("utf8").trim();
        reject(new Error(message.length > 0 ? message : `${command} failed`));
      }
    });
  });

// 运行外部命令，继承 stdout/stderr
const runCommand = (command: string, args: string[], cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
      }
    });
  });

// 将路径标准化为 POSIX 风格，确保 docfind 输出稳定
const toPosixPath = (value: string): string => value.split(path.sep).join("/");

type GenerationMode = "build" | "action" | "off";

// 支持大小写与空格容错，减少误配
const normalizeGenerationMode = (value: string): GenerationMode => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "build" || normalized === "action" || normalized === "off") {
    return normalized;
  }
  return "build";
};

// 优先由 CI 环境决定上下文
const resolveGenerationContext = (): "build" | "action" => {
  const isActions = parseBoolean(resolveEnvValue(["GITHUB_ACTIONS"], "false"));
  return isActions ? "action" : "build";
};

// 仅在匹配的上下文中生成索引
const shouldGenerateIndex = (mode: GenerationMode, context: "build" | "action"): boolean => {
  if (mode === "off") {
    return false;
  }
  return mode === context;
};

// 根据运行平台选择 docfind release 产物
const computeDocfindAssetName = (): string => {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "win32") {
    if (arch === "arm64") {
      return "docfind-aarch64-pc-windows-msvc.zip";
    }
    return "docfind-x86_64-pc-windows-msvc.zip";
  }

  if (platform === "darwin") {
    if (arch === "arm64") {
      return "docfind-aarch64-apple-darwin.tar.gz";
    }
    return "docfind-x86_64-apple-darwin.tar.gz";
  }

  if (platform === "linux") {
    if (arch === "arm64") {
      return "docfind-aarch64-unknown-linux-musl.tar.gz";
    }
    return "docfind-x86_64-unknown-linux-musl.tar.gz";
  }

  throw new Error(`Unsupported platform: ${platform} (${arch})`);
};

// Windows 使用 PowerShell 解压 zip 其他平台使用 tar
// 解压下载的 docfind 归档
const extractDocfindArchive = async (
  archivePath: string,
  destDir: string,
  rootDir: string,
): Promise<void> => {
  if (archivePath.endsWith(".zip")) {
    const archiveArg = toPosixPath(archivePath);
    const destArg = toPosixPath(destDir);
    const command = `Expand-Archive -Path "${archiveArg}" -DestinationPath "${destArg}" -Force`;
    await runCommand("powershell", ["-NoProfile", "-Command", command], rootDir);
    return;
  }

  await runCommand("tar", ["-xzf", archivePath, "-C", destDir], rootDir);
};

// 在解压目录中查找 docfind 可执行文件
const findDocfindBinary = async (rootDir: string): Promise<string | null> => {
  const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isFile()) {
      if (process.platform === "win32") {
        if (name.startsWith("docfind") && name.endsWith(".exe")) {
          return fullPath;
        }
      } else if (name === "docfind" || name.startsWith("docfind-")) {
        return fullPath;
      }
      continue;
    }

    if (entry.isDirectory()) {
      const nested = await findDocfindBinary(fullPath);
      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
};

// 确保 docfind 可执行文件存在，缺失则下载官方 release
const ensureDocfindBinary = async (rootDir: string, explicitPath?: string): Promise<string> => {
  if (explicitPath && explicitPath.trim().length > 0) {
    return explicitPath.trim();
  }

  const assetName = computeDocfindAssetName();
  const targetName = process.platform === "win32" ? "docfind.exe" : "docfind";
  const binDir = path.join(rootDir, ".docfind", "bin");
  const binPath = path.join(binDir, targetName);

  if (fs.existsSync(binPath)) {
    return binPath;
  }

  const downloadDir = path.join(rootDir, ".docfind", "downloads");
  await fs.promises.mkdir(downloadDir, { recursive: true });
  await fs.promises.mkdir(binDir, { recursive: true });

  const downloadUrl = `https://github.com/microsoft/docfind/releases/latest/download/${assetName}`;
  console.log(`[docfind] Downloading ${assetName}...`);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`docfind download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const archivePath = path.join(downloadDir, assetName);
  await fs.promises.writeFile(archivePath, buffer);

  await extractDocfindArchive(archivePath, binDir, rootDir);

  const extractedPath = await findDocfindBinary(binDir);
  if (extractedPath === null) {
    throw new Error("docfind binary not found after extraction");
  }

  if (extractedPath !== binPath) {
    await fs.promises.copyFile(extractedPath, binPath);
  }

  if (process.platform !== "win32") {
    await fs.promises.chmod(binPath, 0o755);
  }

  return binPath;
};

// 按扩展名与大小限制决定是否读取内容
// 仅按扩展名判定文本类型，内容仍需做二进制探测
const resolveExtension = (filePath: string): string => {
  const ext = path.posix.extname(filePath);
  return ext.startsWith(".") ? ext.slice(1).toLowerCase() : ext.toLowerCase();
};

// 以 NUL 字节探测二进制文件
const isBinaryBuffer = (buffer: Buffer): boolean => {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  return sample.includes(0);
};

// 为 wasm 文件生成 hash 作为缓存版本
const hashFile = async (filePath: string): Promise<string> => {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
};

// 构建带或不带 token 的仓库远端地址
const buildRemoteUrl = (repoOwner: string, repoName: string, token?: string): string => {
  const safeOwner = encodeURIComponent(repoOwner);
  const safeName = encodeURIComponent(repoName);
  if (token && token.trim().length > 0) {
    return `https://${encodeURIComponent("x-access-token")}:${encodeURIComponent(token)}@github.com/${safeOwner}/${safeName}.git`;
  }
  return `https://github.com/${safeOwner}/${safeName}.git`;
};

// 生成远端地址候选列表 依次尝试不同 token
const buildRemoteCandidates = (repoOwner: string, repoName: string, tokens: string[]): string[] => {
  const uniqueTokens = Array.from(
    new Set(tokens.map((token) => token.trim()).filter((token) => token.length > 0)),
  );
  const candidates = uniqueTokens.map((token) => buildRemoteUrl(repoOwner, repoName, token));
  const fallback = buildRemoteUrl(repoOwner, repoName);
  if (!candidates.includes(fallback)) {
    candidates.push(fallback);
  }
  return candidates;
};

// 更新远端地址 用于在不同 token 间切换
const updateRemoteUrl = async (repoPath: string, remoteUrl: string): Promise<void> => {
  await runCommandText("git", ["remote", "set-url", "origin", remoteUrl], repoPath);
};

// 准备临时仓库目录并初始化远端
const ensureTempRepo = async (
  rootDir: string,
  repoOwner: string,
  repoName: string,
): Promise<string> => {
  const tempRoot = path.join(rootDir, ".docfind", "tmp");
  await fs.promises.mkdir(tempRoot, { recursive: true });
  const repoPath = await fs.promises.mkdtemp(path.join(tempRoot, "repo-"));

  const remoteUrl = buildRemoteUrl(repoOwner, repoName);

  await runCommandText("git", ["init", repoPath], rootDir);
  await runCommandText("git", ["remote", "add", "origin", remoteUrl], repoPath);

  return repoPath;
};

// 远端分支缺失时返回 null 继续后续分支
// 只拉取单个分支，用于多分支索引生成
const fetchBranch = async (
  repoPath: string,
  branch: string,
  remoteUrls: string[],
): Promise<string | null> => {
  const remoteRef = `refs/remotes/origin/${branch}`;
  let lastError: unknown = null;

  for (const remoteUrl of remoteUrls) {
    try {
      await updateRemoteUrl(repoPath, remoteUrl);
      console.log(`[docfind] Fetching ${branch}...`);
      await runCommand(
        "git",
        ["fetch", "--depth", "1", "--no-tags", "--progress", "origin", `${branch}:${remoteRef}`],
        repoPath,
      );
      console.log(`[docfind] Fetched ${branch}`);
      return remoteRef;
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(`[docfind] Failed to fetch branch ${branch}:`, lastError);
  return null;
};

// 解析可用的分支引用（本地/远端）
const resolveBranchRef = async (repoPath: string, branch: string): Promise<string | null> => {
  const candidates = [branch, `refs/heads/${branch}`, `refs/remotes/origin/${branch}`];
  for (const candidate of candidates) {
    try {
      await runCommandText("git", ["rev-parse", "--verify", candidate], repoPath);
      return candidate;
    } catch {}
  }
  return null;
};

// 使用 detach 模式切换分支，避免工作区污染
const checkoutBranch = async (repoPath: string, branchRef: string): Promise<void> => {
  await runCommand("git", ["checkout", "--force", "--detach", branchRef], repoPath);
};

// 仅收集 git 跟踪的文件，避免索引临时文件
const listTrackedFiles = async (repoPath: string): Promise<string[]> => {
  const output = await runCommandBuffer("git", ["ls-files", "-z"], repoPath);
  return output
    .toString("utf8")
    .split("\0")
    .filter((entry: string) => entry.length > 0);
};

const buildDocumentsForBranch = async (
  repoPath: string,
  branchRef: string,
  branchName: string,
  extensionWhitelist: Set<string>,
  maxFileSize: number,
  payloadPath: string,
): Promise<{ documentCount: number; skipped: number }> => {
  console.log(`[docfind] Checking out ${branchName}...`);
  await checkoutBranch(repoPath, branchRef);

  console.log(`[docfind] Collecting files for ${branchName}...`);
  const filePaths = await listTrackedFiles(repoPath);
  console.log(`[docfind] ${branchName}: ${filePaths.length} tracked files`);

  const stream = fs.createWriteStream(payloadPath, { encoding: "utf8" });
  const writeChunk = async (chunk: string): Promise<void> => {
    if (!stream.write(chunk)) {
      await once(stream, "drain");
    }
  };

  let documentCount = 0;
  let skipped = 0;

  await writeChunk("[\n");

  // 路径永远进入索引 内容根据白名单与大小判断
  // 所有已跟踪文件都会建立“路径索引”，内容仅白名单内写入
  try {
    for (const filePath of filePaths) {
      const normalizedPath = toPosixPath(filePath);
      const extension = resolveExtension(normalizedPath);

      const absolutePath = path.join(repoPath, filePath);
      let stats: fs.Stats;
      try {
        stats = await fs.promises.stat(absolutePath);
      } catch (error) {
        console.warn(`[docfind] Failed to stat ${branchName}:${normalizedPath}`, error);
        skipped += 1;
        continue;
      }
      if (!stats.isFile()) {
        skipped += 1;
        continue;
      }

      const fileName = path.posix.basename(normalizedPath);
      let body = normalizedPath;

      // 白名单内且体积符合时才读取内容，避免大文件拖慢索引
      if (extensionWhitelist.has(extension) && stats.size <= maxFileSize) {
        let contentBuffer: Buffer;
        try {
          contentBuffer = await fs.promises.readFile(absolutePath);
        } catch (error) {
          console.warn(`[docfind] Failed to read ${branchName}:${normalizedPath}`, error);
          const doc = {
            title: fileName,
            category: extension,
            href: normalizedPath,
            path: normalizedPath,
            branch: branchName,
            extension,
            body,
          };
          await writeChunk(`${documentCount > 0 ? ",\n" : ""}${JSON.stringify(doc)}`);
          documentCount += 1;
          continue;
        }

        if (!isBinaryBuffer(contentBuffer)) {
          const contentText = contentBuffer.toString("utf8");
          body = `${normalizedPath}\n${contentText}`;
        }
      }

      const doc = {
        title: fileName,
        category: extension,
        href: normalizedPath,
        path: normalizedPath,
        branch: branchName,
        extension,
        body,
      };
      await writeChunk(`${documentCount > 0 ? ",\n" : ""}${JSON.stringify(doc)}`);
      documentCount += 1;
    }

    await writeChunk("\n]\n");
    await new Promise<void>((resolve, reject) => {
      stream.on("error", reject);
      stream.on("finish", () => resolve());
      stream.end();
    });
  } catch (error) {
    stream.destroy();
    throw error;
  }

  return { documentCount, skipped };
};

// 生成分支索引前清空目录
const ensureEmptyDir = async (targetDir: string): Promise<void> => {
  await fs.promises.rm(targetDir, { recursive: true, force: true });
  await fs.promises.mkdir(targetDir, { recursive: true });
};

// docfind.js 需要补丁以支持自定义 wasm URL
// 修补 docfind.js 的 init 签名，确保可传入 wasm URL
const patchDocfindInit = async (branchDir: string): Promise<void> => {
  const docfindJsPath = path.join(branchDir, "docfind.js");
  if (!fs.existsSync(docfindJsPath)) {
    return;
  }

  const content = await fs.promises.readFile(docfindJsPath, "utf8");
  const patched = content.replace("function U(){return y()}", "function U(e){return y(e)}");
  if (patched === content) {
    console.warn("[docfind] Failed to patch init signature in docfind.js");
    return;
  }
  await fs.promises.writeFile(docfindJsPath, patched, "utf8");
};

// 主流程：拉取分支 → 生成 payload → 运行 docfind → 输出 manifest
const run = async (): Promise<void> => {
  const rootDir = resolveRepoRoot(import.meta.url);
  loadEnvFiles(rootDir);

  const generationMode = normalizeGenerationMode(
    resolveEnvValue(["SEARCH_INDEX_GENERATION_MODE"], "build"),
  );
  const generationContext = resolveGenerationContext();
  if (!shouldGenerateIndex(generationMode, generationContext)) {
    console.log(
      `[docfind] Generation mode is ${generationMode}, skip in ${generationContext} context.`,
    );
    return;
  }

  const enabled = parseBoolean(
    resolveEnvValue(["ENABLED_SEARCH_INDEX", "VITE_ENABLED_SEARCH_INDEX"], "false"),
  );
  if (!enabled) {
    console.log("[docfind] Search index disabled, skip generation.");
    return;
  }

  const repoOwner = resolveEnvValue(["GITHUB_REPO_OWNER", "VITE_GITHUB_REPO_OWNER"]);
  const repoName = resolveEnvValue(["GITHUB_REPO_NAME", "VITE_GITHUB_REPO_NAME"]);
  if (repoOwner.length === 0 || repoName.length === 0) {
    console.warn("[docfind] Missing repo owner/name, skip generation.");
    return;
  }

  const defaultBranch = resolveEnvValue(["GITHUB_REPO_BRANCH", "VITE_GITHUB_REPO_BRANCH"], "main");
  const branchList = parseList(resolveEnvValue(["SEARCH_INDEX_BRANCHES"], ""));
  const branches = branchList.length > 0 ? branchList : [defaultBranch];

  // 产物路径固定在 public/search-index
  const basePath = "/search-index";
  const manifestUrlPath = `${basePath}/manifest.json`;

  // 内容索引大小限制独立于路径索引
  const safeMaxFileSize = DEFAULT_MAX_FILE_SIZE;

  const extensionOverride = parseList(resolveEnvValue(["SEARCH_INDEX_EXTENSIONS"], ""));
  const extensionWhitelist = new Set<string>(
    (extensionOverride.length > 0 ? extensionOverride : DEFAULT_EXTENSION_WHITELIST)
      .map((ext: string) => ext.trim().toLowerCase().replace(/^\./, ""))
      .filter((ext: string) => ext.length > 0),
  );

  const outputRoot = path.join(rootDir, "public", basePath.replace(/^\//, ""));
  const manifestOutputPath = path.join(rootDir, "public", manifestUrlPath.replace(/^\//, ""));

  // 支持显式指定二进制路径
  const docfindBin = await ensureDocfindBinary(rootDir, resolveEnvValue(["DOCFIND_BIN"], ""));

  // 本地路径优先 否则拉取远端
  const repoPath = resolveEnvValue(["DOCFIND_REPO_PATH"], "");
  const tokens = collectTokens();
  const remoteCandidates = buildRemoteCandidates(repoOwner, repoName, tokens);
  const tempRepoPath =
    repoPath.length > 0
      ? path.resolve(rootDir, repoPath)
      : await ensureTempRepo(rootDir, repoOwner, repoName);

  if (repoPath.length === 0) {
    console.log(`[docfind] Temporary repo at ${tempRepoPath}`);
  }

  const manifest: DocfindManifest = {
    schemaVersion: DOCFIND_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    branches: {},
  };

  for (const branch of branches) {
    // action 模式使用 fetch 本地模式走 ref 解析
    const branchRef =
      repoPath.length > 0
        ? await resolveBranchRef(tempRepoPath, branch)
        : await fetchBranch(tempRepoPath, branch, remoteCandidates);

    if (!branchRef) {
      console.warn(`[docfind] Skip missing branch: ${branch}`);
      continue;
    }

    // docfind 输入为结构化 JSON
    const tempDir = path.join(rootDir, ".docfind", "payloads");
    await fs.promises.mkdir(tempDir, { recursive: true });
    const branchSegments = branch.split("/").filter((segment: string) => segment.length > 0);
    const payloadPath = path.join(tempDir, `${branchSegments.join("-") || "default"}.json`);

    const { documentCount, skipped } = await buildDocumentsForBranch(
      tempRepoPath,
      branchRef,
      branch,
      extensionWhitelist,
      safeMaxFileSize,
      payloadPath,
    );

    if (documentCount === 0) {
      console.warn(`[docfind] Skip branch with no documents: ${branch} (skipped ${skipped})`);
      continue;
    }

    const branchDir = path.join(outputRoot, ...branchSegments);
    await ensureEmptyDir(branchDir);

    console.log(`[docfind] Running docfind for ${branch}...`);
    await runCommand(docfindBin, [payloadPath, branchDir], rootDir);
    await patchDocfindInit(branchDir);

    const wasmPath = path.join(branchDir, "docfind_bg.wasm");
    const hash = await hashFile(wasmPath);
    const branchUrlPath = branchSegments
      .map((segment: string) => encodeURIComponent(segment))
      .join("/");
    const docfindPath = `${basePath}/${branchUrlPath}/docfind.js`;

    manifest.branches[branch] = {
      docfindPath,
      hash,
      fileCount: documentCount,
      generatedAt: new Date().toISOString(),
    };

    console.log(`[docfind] Built ${branch}: ${documentCount} documents (${skipped} skipped)`);
  }

  await fs.promises.mkdir(path.dirname(manifestOutputPath), { recursive: true });
  await fs.promises.writeFile(manifestOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[docfind] Manifest written to ${toPosixPath(manifestOutputPath)}`);
};

void run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[docfind] Generation failed: ${message}`);
  process.exitCode = 1;
});
