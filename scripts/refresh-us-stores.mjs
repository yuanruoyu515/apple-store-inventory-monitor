import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const source = "https://www.apple.com/retail/storelist/";
const input = process.argv[2];
let html;
if (input) html = await readFile(input, "utf8");
else {
  const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Apple US stores returned HTTP ${response.status}`);
  html = await response.text();
}
if (Buffer.byteLength(html) > 8 * 1024 * 1024) throw new Error("Store page exceeds 8 MiB");
const script = html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
if (!script) throw new Error("Apple store list has no public JSON");
const region = JSON.parse(script[1]).props?.pageProps?.storeList?.find(r => r.locale === "en_US");
const seen = new Set();
const stores = region?.state?.flatMap(state => state.store.map(store => {
  if (!/^R\d{3,}$/.test(store.id) || seen.has(store.id) || !store.address?.city || !store.address?.postalCode || !store.address?.stateCode || !store.slug) throw new Error(`Invalid US store ${store.id}`);
  seen.add(store.id);
  return {storeNumber:store.id, storeName:store.name, city:store.address.city, state:state.name,
    url:`https://www.apple.com/retail/${store.slug}/`, postalCode:store.address.postalCode,
    stateCode:store.address.stateCode, address1:store.address.address1, address2:store.address.address2 ?? "", telephone:store.telephone};
}));
if (!stores?.length) throw new Error("US store list is empty");
const dir = new URL("../crates/apw-core/data/us-source/", import.meta.url);
const existing = JSON.parse(await readFile(new URL("us-apple-stores.json", dir), "utf8"));
if (stores.length < existing.length / 2) throw new Error("US store count unexpectedly halved");
stores.sort((a,b) => a.storeNumber.localeCompare(b.storeNumber));
await writeFile(new URL("us-apple-stores.json", dir), `${JSON.stringify(stores,null,2)}\n`);
await writeFile(new URL("storelist-verification.json", dir), `${JSON.stringify({source, checkedAt:new Date().toISOString(), sha256:createHash("sha256").update(html).digest("hex"), stores:stores.length},null,2)}\n`);
console.log(`Verified ${stores.length} US stores with official ZIP codes.`);
