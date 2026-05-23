// Copy static front-end assets into ./dist for the Tauri bundler.
// Tauri's frontendDist points to this folder, so we exclude everything that is
// either irrelevant for the desktop app (CI metadata, tests, SEO files) or
// would bloat the installer (node_modules, .git, src-tauri/target, snapshots).
import { rm, mkdir, copyFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

// Top-level entries that get fully copied into dist (recursively).
const INCLUDE_DIRS = ["apps", "css", "images", "js"];
const INCLUDE_FILES = ["index.html", "manifest.webmanifest", "LICENSE"];

// Files anywhere in the tree we never want to ship in the desktop bundle.
const EXCLUDE_FILE_PATTERNS = [/\.test\.js$/i, /sonar-report\.xml$/i, /\.DS_Store$/i];

// Directories anywhere in the tree we never want to traverse.
const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".github",
  ".vscode",
  ".kiro",
  ".claude",
  ".gitnexus",
  "src-tauri",
  "dist",
  "coverage",
  "tmp",
]);

function isExcludedFile(name) {
  return EXCLUDE_FILE_PATTERNS.some((re) => re.test(name));
}

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      if (isExcludedFile(entry.name)) continue;
      await copyFile(srcPath, destPath);
    }
  }
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // Always start from a clean dist so removed source files don't linger.
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  for (const dir of INCLUDE_DIRS) {
    const src = path.join(projectRoot, dir);
    if (!(await exists(src))) continue;
    await copyDir(src, path.join(distDir, dir));
  }

  for (const file of INCLUDE_FILES) {
    const src = path.join(projectRoot, file);
    if (!(await exists(src))) continue;
    await copyFile(src, path.join(distDir, file));
  }

  console.log(`[build-dist] Front-end assets copied to ${path.relative(projectRoot, distDir)}`);
}

main().catch((err) => {
  console.error("[build-dist] failed:", err);
  process.exit(1);
});
