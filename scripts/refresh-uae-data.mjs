import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { UAE_SOURCES, parseUaeStores, parseUaeProducts, validateUaeSnapshot } from "./uae-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputs = process.argv.slice(2);
if (inputs.length !== 0 && inputs.length !== 3) {
  throw new Error("Usage: refresh-uae-data.mjs [storelist.html pro.html duo.html]");
}
const pages = [];
for (const [index, url] of Object.values(UAE_SOURCES).entries()) {
  if (inputs.length) {
    pages.push(await readFile(inputs[index], "utf8"));
  } else {
    if (index) await new Promise((resolve) => setTimeout(resolve, 2_000));
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Apple Uae returned HTTP ${response.status}`);
    pages.push(await response.text());
  }
  if (Buffer.byteLength(pages[index]) > 8 * 1024 * 1024) throw new Error("Apple page exceeds 8 MiB");
}
const snapshot = {
  locale: "en_AE",
  checkedAt: new Date().toISOString(),
  sources: Object.entries(UAE_SOURCES).map(([kind, url], index) => ({
    kind, url, sha256: createHash("sha256").update(pages[index]).digest("hex"),
  })),
  stores: parseUaeStores(pages[0]),
  products: [parseUaeProducts(pages[1], "iphone-18-pro"), parseUaeProducts(pages[2], "iphone-duo")],
};
const counts = validateUaeSnapshot(snapshot);
const destination = path.join(root, "crates/apw-core/data/ae-source");
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, "catalog.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Verified ${counts.stores} AE stores and ${counts.products} UAE iPhone SKUs.`);
