import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const smokeDirectory = path.join(root, "out", "smoke-extension");

// 将製品のマニフェストを引き継ぎ、開発用の設定だけを除外する。
const {
  scripts: _scripts,
  devDependencies: _devDependencies,
  private: _private,
  ...smokeManifest
} = manifest;

await mkdir(smokeDirectory, { recursive: true });
await writeFile(
  path.join(smokeDirectory, "package.json"),
  `${JSON.stringify(smokeManifest, null, 2)}\n`,
);
