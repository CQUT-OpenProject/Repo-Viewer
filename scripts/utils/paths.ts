import path from "path";
import { fileURLToPath } from "url";

export const resolveRepoRoot = (metaUrl: string): string => {
  const filename = fileURLToPath(metaUrl);
  const dir = path.dirname(filename);
  return path.basename(dir) === "dist" ? path.resolve(dir, "..", "..") : path.resolve(dir, "..");
};
