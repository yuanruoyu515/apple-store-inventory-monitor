// Read only the public UAE catalog fields needed by the application.
// Apple page scripts are treated as data; nothing from a page is evaluated.
export const UAE_SOURCES = {
  stores: "https://www.apple.com/ae/retail/storelist/",
  pro: "https://www.apple.com/ae/shop/buy-iphone/iphone-18-pro",
  duo: "https://www.apple.com/ae/shop/buy-iphone/iphone-duo",
};

export function parseUaeStores(html) {
  const script = html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  if (!script) throw new Error("Apple store list has no __NEXT_DATA__ JSON");
  const regions = JSON.parse(script[1]).props?.pageProps?.storeList;
  const region = regions?.find((item) => item.locale === "en_AE");
  if (!region?.state?.length) throw new Error("Apple store list has no en_AE region");
  const seen = new Set();
  const states = region.state.map((state) => ({
    name: state.name,
    __typename: "RgdsState",
    store: state.store.map((store) => {
      if (!/^R\d{3,}$/.test(store.id) || seen.has(store.id)
        || !store.name || !store.slug || !store.address?.city || !state.name) {
        throw new Error(`Invalid or duplicate UAE store: ${store.id}`);
      }
      seen.add(store.id);
      return {
        ...store,
        address: {
          ...store.address,
          // The existing search matches the full title: province, city and name.
          stateName: `${state.name} · ${store.address.city}`,
        },
      };
    }),
  }));
  if (seen.size === 0) throw new Error("UAE store list is empty");
  return { locale: "en_AE", calledLocale: "en_AE", state: states, store: [], hasStates: true };
}

export function extractSelection(html) {
  const marker = html.indexOf("PRODUCT_SELECTION_BOOTSTRAP");
  const match = /["']?productSelectionData["']?\s*:\s*\{/.exec(html.slice(Math.max(0, marker)));
  if (!match) throw new Error("Apple purchase page has no productSelectionData");
  const start = Math.max(0, marker) + match.index + match[0].lastIndexOf("{");
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return JSON.parse(html.slice(start, index + 1));
  }
  throw new Error("Unterminated productSelectionData JSON");
}

export function parseUaeProducts(html, family) {
  const selection = extractSelection(html);
  const allowed = family === "iphone-duo" ? ["iphoneduo"] : ["iphone18pro", "iphone18promax"];
  const seen = new Set();
  const products = (selection.products ?? []).map((product) => {
    if (!/^[A-Z0-9]{5}AH\/A$/.test(product.partNumber)
      || !allowed.includes(product.familyType) || seen.has(product.partNumber)
      || !/^(256gb|512gb|1tb|2tb)$/.test(product.dimensionCapacity)
      || !selection.displayValues?.dimensionColor?.[product.dimensionColor]?.value
      || product.carrierPolicyPart || product.isCarrierDevice) {
      throw new Error(`Invalid, carrier-specific or duplicate AE SKU: ${product.partNumber}`);
    }
    seen.add(product.partNumber);
    return {
      partNumber: product.partNumber,
      familyType: product.familyType,
      dimensionCapacity: product.dimensionCapacity,
      dimensionColor: product.dimensionColor,
      ...(product.dimensionScreensize ? { dimensionScreensize: product.dimensionScreensize } : {}),
    };
  });
  if (products.length === 0) throw new Error(`UAE ${family} catalog is empty`);
  const colors = [...new Set(products.map((product) => product.dimensionColor))];
  return {
    category: "iphone",
    family,
    data: {
      products,
      displayValues: {
        dimensionCapacity: Object.fromEntries([...new Set(products.map((p) => p.dimensionCapacity))]
          .map((capacity) => [capacity, { value: capacity.toUpperCase() }])),
        dimensionColor: Object.fromEntries(colors.map((color) => [color, {
          value: selection.displayValues.dimensionColor[color].value,
        }])),
      },
    },
  };
}

export function validateUaeSnapshot(snapshot) {
  if (snapshot.locale !== "en_AE" || snapshot.stores?.locale !== "en_AE"
    || snapshot.products?.length !== 2) throw new Error("Invalid UAE snapshot metadata");
  const stores = snapshot.stores.state.flatMap((state) => state.store);
  const products = snapshot.products.flatMap((page) => page.data.products);
  if (!stores.length || !products.length || new Set(stores.map((s) => s.id)).size !== stores.length
    || new Set(products.map((p) => p.partNumber)).size !== products.length
    || products.some((p) => !/^[A-Z0-9]{5}AH\/A$/.test(p.partNumber))) {
    throw new Error("Invalid UAE store or product snapshot");
  }
  return { stores: stores.length, products: products.length };
}
