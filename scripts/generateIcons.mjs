import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const muiFolderOutlinedPath = path.join(
  rootDir,
  "node_modules",
  "@mui/icons-material",
  "esm",
  "FolderOutlined.js",
);
const iconSvgPath = path.join(rootDir, "public", "icon.svg");
const pwaOutputDir = path.join(rootDir, "public", "pwa");

/** @see https://cqut-openproject.github.io/.github/brand/color/ */
const FOLDER_FILL = "#055088";
const POCKET_FILL = "#DCEEF5";

/** Icon occupies ~70% of canvas — leaves safe-zone padding for OS squircle/maskable crops. */
const ICON_SCALE = 0.7;

const pwaSizes = [
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

function readMaterialFolderPaths(sourcePath) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const match = source.match(/d:\s*"([^"]+)"/);
  if (match === null) {
    throw new Error("Unable to read FolderOutlined icon path from @mui/icons-material");
  }

  const fullPath = match[1];
  const bodyStart = fullPath.indexOf("M10");
  if (bodyStart <= 0) {
    throw new Error("FolderOutlined path does not contain expected pocket and body subpaths");
  }

  return {
    pocketPath: fullPath.slice(0, bodyStart).trim(),
    bodyPath: fullPath.slice(bodyStart).trim(),
  };
}

const { pocketPath, bodyPath } = readMaterialFolderPaths(muiFolderOutlinedPath);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <!-- @mui/icons-material/FolderOutlined · CQUT brand colors -->
  <path d="${bodyPath}" fill="${FOLDER_FILL}"/>
  <path d="${pocketPath}" fill="${POCKET_FILL}"/>
</svg>
`;

fs.writeFileSync(iconSvgPath, svg);
console.log(`Generated ${iconSvgPath}`);

fs.mkdirSync(pwaOutputDir, { recursive: true });

const svgBuffer = fs.readFileSync(iconSvgPath);

await Promise.all(
  pwaSizes.map(async ({ name, size }) => {
    const outputPath = path.join(pwaOutputDir, name);
    const iconSize = Math.round(size * ICON_SCALE);
    const offset = Math.round((size - iconSize) / 2);

    const iconBuffer = await sharp(svgBuffer).resize(iconSize, iconSize).png().toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: iconBuffer, left: offset, top: offset }])
      .png()
      .toFile(outputPath);

    console.log(`Generated ${outputPath}`);
  }),
);
