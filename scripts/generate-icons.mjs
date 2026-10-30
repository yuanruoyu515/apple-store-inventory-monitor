import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = await mkdtemp(join(tmpdir(), "apw-icons-"));
try {
  execFileSync("pnpm", ["tauri", "icon", "assets/icon.png", "--output", output], {
    cwd: root,
    stdio: "inherit",
  });
  // Only refresh the existing desktop set; this edition does not ship mobile apps.
  const desktop = join(root, "src-tauri/icons");
  for (const entry of await readdir(desktop, { withFileTypes: true })) {
    if (entry.isFile()) await copyFile(join(output, entry.name), join(desktop, entry.name));
  }
  await copyFile(join(output, "icon.png"), join(root, "public/icon.png"));
  console.log("Updated desktop icons and frontend icon from assets/icon.png.");
} finally {
  await rm(output, { recursive: true, force: true });
}
