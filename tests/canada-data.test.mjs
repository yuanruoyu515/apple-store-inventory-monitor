import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractSelection, parseCanadaStores, parseCanadaProducts, validateCanadaSnapshot } from "../scripts/canada-data.mjs";

const fixture = JSON.parse(await readFile(new URL("../crates/apw-core/data/ca-source/catalog.json", import.meta.url)));
const stores = fixture.stores.state.flatMap((state) => state.store);
const products = fixture.products.flatMap((page) => page.data.products);
const page = (data) => `window.PRODUCT_SELECTION_BOOTSTRAP = {productSelectionData: ${JSON.stringify(data)}}`;

test("Canada snapshot contains 28 stores, six provinces and 40 Canadian SKUs", () => {
  assert.deepEqual(validateCanadaSnapshot(fixture), { stores: 28, products: 40 });
  assert.equal(fixture.stores.state.length, 6);
  assert(stores.find((store) => store.id === "R121").address.stateName.includes("Ontario · Toronto"));
  assert(stores.find((store) => store.id === "R280").address.stateName.includes("Vancouver"));
  assert(products.every((product) => product.partNumber.endsWith("VC/A")));
  for (const model of ["iphone18pro", "iphone18promax", "iphoneduo"]) {
    const items = products.filter((product) => product.familyType === model);
    assert.equal(items.length, model === "iphoneduo" ? 8 : 16);
    assert.deepEqual([...new Set(items.map((p) => p.dimensionCapacity))].sort(), ["1tb", "256gb", "2tb", "512gb"]);
  }
});

test("Canadian generation is deterministic and uses Canadian catalog pages", async () => {
  const embedded = JSON.parse(await readFile(new URL("../crates/apw-core/data/products_en_CA.json", import.meta.url)));
  assert.deepEqual(embedded, fixture.products);
  const regions = JSON.parse(await readFile(new URL("../crates/apw-core/data/stores.json", import.meta.url)));
  assert.deepEqual(regions.find((region) => region.locale === "en_CA"), fixture.stores);
  assert.equal(regions.find((region) => region.locale === "en_US").state.flatMap((state) => state.store).length, 269);
  assert(fixture.sources.every((source) => source.url.startsWith("https://www.apple.com/ca/")));
});

test("public Apple JSON is parsed without executing scripts; nested braces and quotes are safe", () => {
  const data = { products: [], label: 'quoted " and braces { }', nested: { value: "\\" } };
  assert.deepEqual(extractSelection(page(data)), data);
  assert.throws(() => extractSelection("productSelectionData: {broken"));
  assert.throws(() => extractSelection("productSelectionData: window.executeMe()"));
});

test("store import selects en_CA, never another country or duplicate store IDs", () => {
  const next = (list) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { storeList: list } } })}</script>`;
  const region = { ...fixture.stores, state: [{ name: "Ontario", store: [{ ...stores.find((store) => store.id === "R121"), address: { city: "Toronto" } }] }] };
  const parsed = parseCanadaStores(next([{ ...region, locale: "en_US" }, region]));
  assert.equal(parsed.locale, "en_CA");
  assert.equal(parsed.state[0].store[0].address.stateName, "Ontario · Toronto");
  assert.throws(() => parseCanadaStores(next([{ ...region, locale: "en_US" }])));
  region.state[0].store.push(region.state[0].store[0]);
  assert.throws(() => parseCanadaStores(next([region])), /duplicate/);
});

test("product import rejects US substitutions, carrier variants, empty and duplicate data", () => {
  const source = structuredClone(fixture.products[1].data);
  const parsed = parseCanadaProducts(page(source), "iphone-duo");
  assert.deepEqual(parsed, fixture.products[1]);
  const badUs = structuredClone(source);
  badUs.products[0].partNumber = "MK1F4LL/A";
  assert.throws(() => parseCanadaProducts(page(badUs), "iphone-duo"), /CA SKU/);
  const carrier = structuredClone(source);
  carrier.products[0].carrierPolicyPart = "UNLOCKED/US";
  assert.throws(() => parseCanadaProducts(page(carrier), "iphone-duo"), /CA SKU/);
  assert.throws(() => parseCanadaProducts(page({ ...source, products: [] }), "iphone-duo"), /empty/);
  source.products.push(source.products[0]);
  assert.throws(() => parseCanadaProducts(page(source), "iphone-duo"), /duplicate/);
});
