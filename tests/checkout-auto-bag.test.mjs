import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const addSource = readFileSync(new URL("../src-tauri/src/checkout_add_to_bag.js", import.meta.url), "utf8");
const removeSource = readFileSync(new URL("../src-tauri/src/checkout_remove_from_bag.js", import.meta.url), "utf8");
const linesSource = readFileSync(new URL("../src-tauri/src/checkout_line_items.js", import.meta.url), "utf8");
const expected = { partNumber: "MK2Q4CH/A", productName: "iPhone Duo 512GB 夜空色", removeId: "owned-item.delete", quantity: "1" };
const location = { protocol: "https:", hostname: "www.apple.com.cn", pathname: "/shop/buy-iphone/iphone-duo/mk2q4ch/a", search: "" };

function run(source, document, page, ...args) {
  return JSON.parse(vm.runInNewContext(`JSON.stringify((${source})(...args))`, { document, location: page, URLSearchParams, args }));
}

test("只在到货 SKU 与商品页名称一致时，选择无折抵和无 AppleCare，然后只加购一次", () => {
  let additions = 0;
  const noTrade = { checked: false, disabled: false, click() { this.checked = true; } };
  const noCare = { checked: false, disabled: false, click() { this.checked = true; } };
  const button = { get disabled() { return !noTrade.checked || !noCare.checked; }, click() { additions++; }, scrollIntoView() {}, getBoundingClientRect: () => ({x:10,y:20,width:100,height:40}) };
  const document = { querySelector(selector) {
    return ({
      '[data-autom="summary-productName"]': { innerText: expected.productName },
      'button[data-autom="add-to-cart"]': button,
      'input[data-autom="choose-noTradeIn"]': noTrade,
      'input[data-autom="noapplecare"]': noCare,
    })[selector] ?? null;
  } };
  assert.equal(run(addSource, document, location, expected).ready, false);
  assert.equal(noTrade.checked, true);
  assert.equal(noCare.checked, false);
  assert.equal(run(addSource, document, location, expected).ready, false);
  assert.equal(run(addSource, document, location, expected).ready, true);
  assert.equal(additions, 0, "轮询准备按钮时不能加购");
  assert.deepEqual(run(addSource, document, location, expected, "add").point, {x:60,y:40});
  assert.equal(additions, 0, "脚本只定位按钮，实际点击由浏览器输入事件执行");
});

test("相同名称但 SKU、域名或页面实际型号不符时不能加购", () => {
  for (const [page, name] of [
    [{ ...location, pathname: "/shop/buy-iphone/iphone-duo/mk2u4ch/a" }, expected.productName],
    [{ ...location, hostname: "example.com" }, expected.productName],
    [location, "iPhone Duo 1TB 夜空色"],
  ]) {
    let additions = 0;
    const document = { querySelector(selector) {
      if (selector === '[data-autom="summary-productName"]') return { innerText: name };
      if (selector === 'button[data-autom="add-to-cart"]') return { disabled: false, click() { additions++; } };
      return null;
    } };
    const result = run(addSource, document, page, expected, "add");
    assert.equal(result.clicked, false);
    assert.equal(additions, 0);
  }
});

test("开启 AppleCare+ 时选 AppleCare+ 并点浮层里的「添加」，不选不加 AppleCare+", () => {
  const noTrade = { checked: false, disabled: false, click() { this.checked = true; } };
  const noCare = { checked: false, disabled: false, click() { this.checked = true; } };
  const confirm = { disabled: false, width: 0, click() { acp.checked = true; this.width = 0; }, getBoundingClientRect() { return { width: this.width }; } };
  const acp = { checked: false, disabled: false, clicks: 0, click() { this.clicks++; confirm.width = 80; } };
  const acpart = { name: "acpart", value: "none" };
  const button = { disabled: false, form: { elements: [acpart] }, scrollIntoView() {}, getBoundingClientRect: () => ({x:10,y:20,width:100,height:40}) };
  const document = { querySelector(selector) {
    return ({
      '[data-autom="summary-productName"]': { innerText: expected.productName },
      'button[data-autom="add-to-cart"]': button,
      'input[data-autom="choose-noTradeIn"]': noTrade,
      'input[data-autom="noapplecare"]': noCare,
      'input[data-autom="acp"]': acp,
      'button[data-autom="inlineapplecare_overlay_add"]': confirm,
    })[selector] ?? null;
  } };
  const page = { document, location, URLSearchParams, Date };
  const step = (action) => JSON.parse(vm.runInContext(`JSON.stringify((${addSource})(${JSON.stringify({ ...expected, appleCare: true })}, ${JSON.stringify(action)}))`, page));
  page.window = page;
  vm.createContext(page);
  assert.equal(step("add").ready, false, "AppleCare+ 未选中前不能加购");
  assert.equal(step("prepare").ready, false);
  assert.equal(noTrade.checked, true);
  assert.equal(step("prepare").ready, false);
  assert.equal(acp.clicks, 1);
  assert.equal(acp.checked, false, "浮层未确认前单选框还没选中");
  assert.equal(step("prepare").ready, false);
  assert.equal(acp.checked, true);
  assert.equal(step("prepare").ready, false, "表单里的 acpart 还没更新时不能加购");
  assert.equal(step("add").point, undefined);
  acpart.value = "SHK93CH/A";
  assert.equal(step("prepare").ready, true);
  assert.equal(acp.clicks, 1);
  assert.equal(noCare.checked, false);
  assert.deepEqual(step("add").point, {x:60,y:40});
});

test("开启 AppleCare+ 但商品页只有不加 AppleCare+ 时停下", () => {
  const document = { querySelector(selector) {
    return ({
      '[data-autom="summary-productName"]': { innerText: expected.productName },
      'button[data-autom="add-to-cart"]': { disabled: false },
      'input[data-autom="noapplecare"]': { checked: false, disabled: false, click() {} },
    })[selector] ?? null;
  } };
  assert.match(run(addSource, document, location, { ...expected, appleCare: true }).error, /AppleCare/);
});

test("购物袋商品行带 AppleCare+ 子项时标出来", () => {
  const page = { ...location, pathname: "/shop/bag" };
  assert.equal(run(linesSource, bagFixture().document, page, []).items[0].appleCare, false);
  const withCare = bagFixture({ careName: "AppleCare+ 服务计划 (适用于 iPhone 16)" });
  assert.equal(run(linesSource, withCare.document, page, []).items[0].appleCare, true);
});

function bagFixture({ count = 1, part = expected.partNumber, quantity = "1", id = expected.removeId, name = expected.productName, empty = false, careName = "" } = {}) {
  let removals = 0;
  const title = { innerText: name, getAttribute: () => `/shop/product/${part.toLowerCase()}` };
  const remove = { id, disabled: false, click() { removals++; } };
  const row = {
    innerText: `${name} 数量 ${quantity}`,
    getAttribute: () => "bag-item-1",
    querySelectorAll: (selector) => selector === 'button[data-autom^="bag-item-remove-button-"]' && careName
      ? [{ getAttribute: () => `bag-item-remove-button-${careName}` }]
      : [],
    querySelector(selector) {
      if (selector === '[data-autom="bag-item-name"], h2, h3' || selector === 'a[data-autom="bag-item-name"]') return title;
      if (selector === 'select[data-autom="item-quantity-dropdown"]') return { value: quantity };
      if (selector === 'button[data-autom="bag-item-remove-button"]') return remove;
      return null;
    },
  };
  return { document: {
    querySelectorAll: () => Array(count).fill(row),
    querySelector(selector) {
      if (selector === '[data-autom="bag-empty-continueshopping-button"]') return empty ? {} : null;
      if (selector === '[data-autom="bag-header"]') return count > 0 ? {} : null;
      return null;
    },
  }, removals: () => removals };
}

test("失败清理只移除原来的一个 SKU，其他商品、数量或条目 ID 变化时停止", () => {
  for (const options of [{}, { count: 2 }, { part: "MK2U4CH/A" }, { quantity: "2" }, { id: "user-added-item.delete" }, { name: "另一件商品" }]) {
    const bag = bagFixture(options);
    const allowed = Object.keys(options).length === 0;
    assert.equal(run(removeSource, bag.document, { ...location, pathname: "/shop/bag" }, expected, "remove"), allowed);
    assert.equal(bag.removals(), Number(allowed));
  }
});

test("页面加载中没有商品行不能误判空袋，必须读到 Apple 的空袋状态", () => {
  const loading = bagFixture({ count: 0 });
  const empty = bagFixture({ count: 0, empty: true });
  const page = { ...location, pathname: "/shop/bag" };
  assert.equal(run(linesSource, loading.document, page, []).bagReady, false);
  assert.equal(run(linesSource, loading.document, page, []).bagEmpty, false);
  assert.equal(run(linesSource, empty.document, page, []).bagReady, true);
  assert.equal(run(linesSource, empty.document, page, []).bagEmpty, true);
  const full = run(linesSource, bagFixture().document, page, []);
  assert.equal(full.items[0].partNumber, expected.partNumber);
  assert.equal(full.items[0].removeId, expected.removeId);
});

function multiBag(items) {
  const rows = [];
  const removed = [];
  for (const item of items) {
    const title = { innerText: item.name, getAttribute: () => item.part ? `/shop/product/${item.part}` : '' };
    const remove = { id: item.id, disabled: !!item.disabled, click() { removed.push(item.id); rows.splice(rows.indexOf(row), 1); } };
    const row = {
      innerText: `${item.name}${item.quantity ? ' 数量 ' + item.quantity : ''}`,
      getAttribute: () => `bag-item-${rows.indexOf(row) + 1}`,
      querySelectorAll: () => [],
      querySelector(selector) {
        if (selector === '[data-autom="bag-item-name"], h2, h3' || selector === 'a[data-autom="bag-item-name"]') return title;
        if (selector === 'select[data-autom="item-quantity-dropdown"]') return item.quantity ? { value: item.quantity } : null;
        if (selector === 'button[data-autom="bag-item-remove-button"]') return remove;
        return null;
      },
    };
    rows.push(row);
  }
  return { removed, document: {
    querySelectorAll: () => rows,
    querySelector(selector) {
      if (selector === '[data-autom="bag-header"]') return rows.length ? {} : null;
      if (selector === '[data-autom="bag-empty-continueshopping-button"]') return rows.length ? null : {};
      return null;
    },
  } };
}
const bagPage = { ...location, pathname: '/shop/bag' };

test("失败购物袋按当前条目逐个删除其他型号和数量不符的商品，准备轮询不点击", () => {
  const entries = [
    { name: '其他型号', part: 'OLDCH/A', quantity: '2', id: 'old.delete' },
    { name: expected.productName, part: expected.partNumber, quantity: '1', id: 'target.delete' },
    { name: '附加服务', part: '', quantity: '', id: 'service.delete' },
  ];
  const bag = multiBag(entries);
  for (const entry of entries) {
    const snapshot = { partNumber: entry.part, productName: entry.name, quantity: entry.quantity, removeId: entry.id };
    assert.equal(run(removeSource, bag.document, bagPage, snapshot, 'ready'), true);
    assert.equal(bag.removed.length, entries.indexOf(entry));
    assert.equal(run(removeSource, bag.document, bagPage, snapshot, 'remove'), true);
  }
  assert.deepEqual(bag.removed, entries.map(e => e.id));
  assert.equal(run(linesSource, bag.document, bagPage, []).bagEmpty, true);
});

test("失败清理仍核对快照，条目变化、按钮禁用或非官方购物袋均不删除", () => {
  const entry = { name: expected.productName, part: expected.partNumber, quantity: '1', id: expected.removeId };
  for (const [item, page] of [
    [{ ...entry, quantity: '2' }, bagPage],
    [{ ...entry, disabled: true }, bagPage],
    [entry, { ...bagPage, protocol: 'http:' }],
    [entry, { ...bagPage, hostname: 'example.test' }],
    [entry, { ...bagPage, pathname: '/shop/checkout' }],
  ]) {
    const bag = multiBag([item]);
    assert.equal(run(removeSource, bag.document, page, expected, 'remove'), false);
    assert.deepEqual(bag.removed, []);
  }
});
const targetItem = { part: expected.partNumber, name: expected.productName, quantity: '1', id: expected.removeId };
const otherItem = { part: 'MJTA4CH/A', name: 'iPhone 18 Pro 256GB 冰川蓝色', quantity: '1', id: 'old-pro.delete' };
const snapshot = item => ({ partNumber: item.part, productName: item.name, quantity: item.quantity, removeId: item.id });
