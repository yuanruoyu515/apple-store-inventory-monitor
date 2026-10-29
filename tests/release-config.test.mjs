import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fork identity is upgrade compatible and cannot install upstream updates", async () => {
  const config = JSON.parse(await read("src-tauri/tauri.conf.json"));
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(config.productName, "Apple Store Inventory Monitor US");
  assert.equal(config.identifier, "com.suversal.apple-store-inventory-monitor.us");
  assert.equal(config.version, pkg.version);
  assert.equal(config.bundle.createUpdaterArtifacts, false);
  assert.equal(config.plugins?.updater, undefined);
  assert.match(await read("crates/apw-core/src/config.rs"), /APP_DIR: &str = "apple-store-inventory-monitor-us"/);
});

test("both macOS architectures must pass before a complete release is published", async () => {
  const workflow = await read(".github/workflows/release.yml");
  assert.match(workflow, /macos-latest/);
  assert.match(workflow, /macos-15-intel/);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /codesign --verify --deep --strict/);
  assert.match(workflow, /shasum -a 256/);
  assert.match(workflow, /--draft=false --latest/);
  const readme = await read("README.md");
  const { version } = JSON.parse(await read("package.json"));
  assert(readme.includes(`Apple-Store-Inventory-Monitor-US-macOS-universal-${version}.dmg`));
  const packager = await read("scripts/package-universal-dmg.py");
  assert.match(packager, /"Applications": "\/Applications"/);
  assert.match(packager, /set\(arches\) != \{"arm64", "x86_64"\}/);
  assert.match(packager, /icon_locations/);
});
