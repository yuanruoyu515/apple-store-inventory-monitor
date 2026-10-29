import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src-tauri/src/checkout_contact.js", import.meta.url), "utf8");

class HTMLInputElement {
  constructor(value) { this.raw = value; }
  get value() { return this.raw; }
  set value(value) { this.raw = value; }
  focus() {}
  blur() {}
  dispatchEvent() {}
}

// fields 只列出页面上实际有的栏目，没列出的栏目表示页面上没有这一栏。
// stuck 里的栏目模拟页面不接受写入。
function contactPage(fields, values = {}, stuck = []) {
  const inputs = Object.fromEntries(Object.entries(fields).map(([name, value]) => {
    const input = new HTMLInputElement(value);
    if (stuck.includes(name)) Object.defineProperty(input, "raw", { get: () => value, set() {} });
    return [name, input];
  }));
  const context = vm.createContext({
    HTMLInputElement,
    Event: class {},
    document: {
      querySelector(selector) {
        const name = selector.match(/^input\[data-autom="form-field-(\w+)"\]$/)?.[1];
        if (!name) throw new Error(`意料之外的选择器：${selector}`);
        return inputs[name] || null;
      },
    },
  });
  const state = JSON.parse(vm.runInContext(`JSON.stringify((${source})(${JSON.stringify(values)}))`, context));
  return { state, inputs };
}

test("登录状态下表单没有邮箱栏时不算缺项", () => {
  const { state } = contactPage({ lastName: "张", firstName: "三", fullDaytimePhone: "13800000000" });
  assert.equal(state.ready, true);
  assert.deepEqual(state.missing, []);
});

test("页面上出现的栏目为空时仍然算缺项", () => {
  const { state } = contactPage({ lastName: "张", firstName: "", emailAddress: " ", fullDaytimePhone: "13800000000" });
  assert.deepEqual(state.missing, ["名字", "电子邮件地址"]);
});

test("设置里填了邮箱但页面上没有邮箱栏时只填其余栏目", () => {
  const { state, inputs } = contactPage(
    { lastName: "", firstName: "", fullDaytimePhone: "" },
    { lastName: "张", firstName: "三", emailAddress: "a@example.com", fullDaytimePhone: "13800000000" },
  );
  assert.deepEqual(state.failed, []);
  assert.deepEqual(state.missing, []);
  assert.equal(inputs.firstName.value, "三");
});

test("页面上有的栏目写不进去时报填写失败", () => {
  const { state } = contactPage({ lastName: "", firstName: "" }, { lastName: "张", firstName: "三" }, ["firstName"]);
  assert.deepEqual(state.failed, ["firstName"]);
  assert.deepEqual(state.missing, ["名字"]);
});
