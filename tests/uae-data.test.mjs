import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractSelection, parseUaeStores, parseUaeProducts, validateUaeSnapshot } from "../scripts/uae-data.mjs";

const fixture = JSON.parse(await readFile(new URL("../crates/apw-core/data/ae-source/catalog.json", import.meta.url)));
const stores = fixture.stores.state.flatMap((state) => state.store);
const products = fixture.products.flatMap((page) => page.data.products);
const page = (data) => `window.PRODUCT_SELECTION_BOOTSTRAP = {productSelectionData: ${JSON.stringify(data)}}`;

test("Uae snapshot contains 5 stores, two emirates and 40 UAE SKUs", () => {
  assert.deepEqual(validateUaeSnapshot(fixture), { stores: 5, products: 40 });
  assert.equal(fixture.stores.state.length, 2);
  assert(stores.find((store) => store.id === "R706").address.stateName.includes("Abu Dhabi · Abu Dhabi"));
  assert(stores.find((store) => store.id === "R597").address.stateName.includes("Dubai"));
  assert(products.every((product) => product.partNumber.endsWith("AH/A")));
  for (const model of ["iphone18pro", "iphone18promax", "iphoneduo"]) {
    const items = products.filter((product) => product.familyType === model);
    assert.equal(items.length, model === "iphoneduo" ? 8 : 16);
    assert.deepEqual([...new Set(items.map((p) => p.dimensionCapacity))].sort(), ["1tb", "256gb", "2tb", "512gb"]);
  }
});

test("UAE generation is deterministic and uses UAE catalog pages", async () => {
  const embedded = JSON.parse(await readFile(new URL("../crates/apw-core/data/products_en_AE.json", import.meta.url)));
  assert.deepEqual(embedded, fixture.products);
  const regions = JSON.parse(await readFile(new URL("../crates/apw-core/data/stores.json", import.meta.url)));
  assert.deepEqual(regions.find((region) => region.locale === "en_AE"), fixture.stores);
  assert.equal(regions.find((region) => region.locale === "en_US").state.flatMap((state) => state.store).length, 269);
  assert(fixture.sources.every((source) => source.url.startsWith("https://www.apple.com/ae/")));
});

test("public Apple JSON is parsed without executing scripts; nested braces and quotes are safe", () => {
  const data = { products: [], label: 'quoted " and braces { }', nested: { value: "\\" } };
  assert.deepEqual(extractSelection(page(data)), data);
  assert.throws(() => extractSelection("productSelectionData: {broken"));
  assert.throws(() => extractSelection("productSelectionData: window.executeMe()"));
});

test("store import selects en_AE, never another country or duplicate store IDs", () => {
  const next = (list) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { storeList: list } } })}</script>`;
  const region = { ...fixture.stores, state: [{ name: "Abu Dhabi", store: [{ ...stores.find((store) => store.id === "R706"), address: { city: "Abu Dhabi" } }] }] };
  const parsed = parseUaeStores(next([{ ...region, locale: "en_US" }, region]));
  assert.equal(parsed.locale, "en_AE");
  assert.equal(parsed.state[0].store[0].address.stateName, "Abu Dhabi · Abu Dhabi");
  assert.throws(() => parseUaeStores(next([{ ...region, locale: "en_US" }])));
  region.state[0].store.push(region.state[0].store[0]);
  assert.throws(() => parseUaeStores(next([region])), /duplicate/);
});

test("product import rejects US substitutions, carrier variants, empty and duplicate data", () => {
  const source = structuredClone(fixture.products[1].data);
  const parsed = parseUaeProducts(page(source), "iphone-duo");
  assert.deepEqual(parsed, fixture.products[1]);
  const badUs = structuredClone(source);
  badUs.products[0].partNumber = "MK1F4LL/A";
  assert.throws(() => parseUaeProducts(page(badUs), "iphone-duo"), /AE SKU/);
  const carrier = structuredClone(source);
  carrier.products[0].carrierPolicyPart = "UNLOCKED/US";
  assert.throws(() => parseUaeProducts(page(carrier), "iphone-duo"), /AE SKU/);
  assert.throws(() => parseUaeProducts(page({ ...source, products: [] }), "iphone-duo"), /empty/);
  source.products.push(source.products[0]);
  assert.throws(() => parseUaeProducts(page(source), "iphone-duo"), /duplicate/);
});
