import { defineConfig } from "@vscode/test-cli";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const executablePath = process.env.VSCODE_TEST_EXECUTABLE;

export default defineConfig({
  files: [
    "out/test/extension.test.js",
    "out/test/encoding.test.js",
    "out/test/encodingSelection.test.js",
    "out/test/encodingLifecycle.test.js",
    "out/test/encodingReloadRace.test.js",
    "out/test/smoke.test.js",
  ],
  extensionDevelopmentPath: path.join(root, "out/smoke-extension"),
  launchArgs: ["--disable-telemetry"],
  ...(executablePath ? { useInstallation: { fromPath: executablePath } } : {}),
});
