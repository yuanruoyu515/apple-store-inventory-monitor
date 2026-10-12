import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "crates", "apw-core", "data");
const sourceDir = path.join(dataDir, "us-source");

const [storesSource, skuSource, currentRegions] = await Promise.all([
  readFile(path.join(sourceDir, "us-apple-stores.json"), "utf8").then(JSON.parse),
  readFile(path.join(sourceDir, "iphone-18-skus.json"), "utf8").then(JSON.parse),
  readFile(path.join(dataDir, "stores.json"), "utf8").then(JSON.parse),
]);

const stateGroups = new Map();
for (const source of storesSource) {
  if (!stateGroups.has(source.state)) stateGroups.set(source.state, []);
  const slug = new URL(source.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  stateGroups.get(source.state).push({
    id: source.storeNumber,
    name: source.storeName,
    slug,
    telephone: "",
    address: {
      address1: "",
      address2: "",
      city: source.city,
      postalCode: "",
      __typename: "PostalAddress",
      // 核心解析器会把 stateName 放进门店标题。这里同时包含州与城市，
      // 让现有的一个搜索框可以按州、城市或店名筛选。
      stateName: `${source.state} · ${source.city}`,
      stateCode: null,
    },
    __typename: "RgdsStore",
  });
}

const usRegion = {
  locale: "en_US",
  calledLocale: "en_US",
  state: [...stateGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, store]) => ({ __typename: "RgdsState", name, store })),
  store: [],
  hasStates: true,
  __typename: "RgdsStoreSearchResult",
};

await writeFile(
  path.join(dataDir, "stores.json"),
  `${JSON.stringify([usRegion, ...currentRegions.filter((item) => item.locale !== "en_US")], null, 2)}\n`,
);

const normalized = (value) => value.toLowerCase().replaceAll(" ", "");
const products = skuSource.map((sku) => ({
  partNumber: sku.partNumber,
  familyType: sku.model.endsWith("Pro Max") ? "iphone18promax" : "iphone18pro",
  dimensionCapacity: normalized(sku.storage),
  dimensionScreensize: sku.model.endsWith("Pro Max") ? "6_9inch" : "6_3inch",
  dimensionColor: normalized(sku.color),
}));

const displayValues = {
  dimensionCapacity: Object.fromEntries(
    [...new Set(skuSource.map((sku) => sku.storage))]
      .map((capacity) => [normalized(capacity), { value: capacity }]),
  ),
  dimensionColor: Object.fromEntries(
    [...new Set(skuSource.map((sku) => sku.color))]
      .map((color) => [normalized(color), { value: color }]),
  ),
  dimensionScreensize: {
    "6_3inch": { value: "iPhone 18 Pro" },
    "6_9inch": { value: "iPhone 18 Pro Max" },
  },
};

const productSnapshot = [{
  category: "iphone",
  family: "iphone-18-pro",
  data: { products, displayValues },
}];

await writeFile(
  path.join(dataDir, "products_en_US.json"),
  `${JSON.stringify(productSnapshot, null, 2)}\n`,
);

console.log(`Generated ${storesSource.length} US stores and ${skuSource.length} iPhone SKUs.`);
