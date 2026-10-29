import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const errorsSource = readFileSync(new URL("../src-tauri/src/checkout_page_errors.js", import.meta.url), "utf8");
const linesSource = readFileSync(new URL("../src-tauri/src/checkout_line_items.js", import.meta.url), "utf8");

const errorNode = (text, { visible = true, hidden = false, visibility = "visible" } = {}) => ({
  innerText: text,
  offsetParent: null, // 固定定位的售罄弹层也必须能识别。
  getClientRects: () => visible ? [{}] : [],
  closest: () => hidden ? {} : null,
  visibility,
});

function readPage({ alerts = [], checkout = null, placeOrder = null } = {}) {
  const context = vm.createContext({
    location: { pathname: '/shop/bag' },
    getComputedStyle: (e) => ({ visibility: e.visibility }),
    document: {
      querySelectorAll: (selector) => selector === '[data-autom^="bag-item-"]' ? [] : alerts,
      querySelector(selector) {
        if (selector === 'button[data-autom="checkout"]') return checkout;
        if (selector === 'button[data-autom="continue-button-placeOrder"]') return placeOrder;
        if (selector === '[data-autom="bagtotalvalue"]') return null;
        if (selector === '[data-autom="bag-header"]' || selector === '[data-autom="bag-empty-continueshopping-button"]') return null;
        throw new Error(`意料之外的选择器：${selector}`);
      },
    },
  });
  return JSON.parse(vm.runInContext(`JSON.stringify((${linesSource})((${errorsSource})()))`, context));
}

test("售罄弹层即使没有 offsetParent、购物袋为空也能读到失败原因", () => {
  const page = readPage({ alerts: [errorNode("  商品已售罄，\n请稍后重试  ")] });
  assert.deepEqual(page.errors, ["商品已售罄， 请稍后重试"]);
  assert.deepEqual(page.items, []);
});

test("禁用的下单或结账按钮不能当作流程已准备好", () => {
  const page = readPage({ checkout: { disabled: true }, placeOrder: { disabled: true } });
  assert.equal(page.canCheckout, false);
  assert.equal(page.canPlaceOrder, false);
  const ready = readPage({ checkout: { disabled: false }, placeOrder: { disabled: false } });
  assert.equal(ready.canCheckout, true);
  assert.equal(ready.canPlaceOrder, true);
});

test("隐藏的旧错误和不可见弹层不触发本次失败", () => {
  const page = readPage({ alerts: [
    errorNode("旧售罄提示", { hidden: true }),
    errorNode("未显示的弹层", { visible: false }),
    errorNode("隐藏的文字", { visibility: "hidden" }),
    errorNode(""),
  ] });
  assert.deepEqual(page.errors, []);
});

test("重复错误合并并保留当前可见原因", () => {
  const page = readPage({ alerts: [errorNode("库存不足"), errorNode("库存不足"), errorNode("请选择其他门店")] });
  assert.deepEqual(page.errors, ["库存不足", "请选择其他门店"]);
});
