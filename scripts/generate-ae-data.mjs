import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateUaeSnapshot } from "./uae-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "crates/apw-core/data");
const snapshot = JSON.parse(await readFile(path.join(dataDir, "ae-source/catalog.json"), "utf8"));
const regions = JSON.parse(await readFile(path.join(dataDir, "stores.json"), "utf8"));
const counts = validateUaeSnapshot(snapshot);
const remaining = regions.filter((region) => region.locale !== "en_AE");
const usIndex = remaining.findIndex((region) => region.locale === "en_CA");
remaining.splice(usIndex + 1, 0, snapshot.stores);
await writeFile(path.join(dataDir, "stores.json"), `${JSON.stringify(remaining, null, 2)}\n`);
await writeFile(path.join(dataDir, "products_en_AE.json"), `${JSON.stringify(snapshot.products, null, 2)}\n`);
console.log(`Generated ${counts.stores} AE stores and ${counts.products} UAE iPhone SKUs.`);
