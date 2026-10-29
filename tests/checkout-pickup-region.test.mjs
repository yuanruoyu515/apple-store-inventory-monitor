import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// 执行 Rust include_str! 使用的同一份生产脚本，页面替身模拟省市区级联的异步重画。
const source = readFileSync(new URL("../src-tauri/src/checkout_pickup_region.js", import.meta.url), "utf8");
const guangzhou = { state: "广东", city: "广州", address: "广州市天河区天河路 218 号" };
const target = (region = guangzhou) => ({ store: "R577", region, acceptNearest: false, monitoredStores: [] });

function page({ current = "选择地区", stores = [], region = guangzhou, states = ["北京", "广东", "上海"], cities = ["广州", "深圳"], districts = ["荔湾区", "天河区"], requireDistrict = true } = {}) {
  const clicks = [];
  let active = null;
  let pending = null;
  const button = (value, onClick, shown = () => true) => ({
    innerText: value, disabled: false,
    getClientRects: () => shown() ? [{}] : [],
    click: () => { clicks.push(value); onClick(); },
  });
  const after = (action) => { pending = { action, polls: 3 }; };
  const finish = () => { current = `${region.state} ${region.city}`; active = null; stores = [{ value: "R577", checked: false, disabled: false }]; };
  const picker = button("", () => { active = "state"; });
  Object.defineProperty(picker, "innerText", { get: () => current });
  const values = {
    state: states, city: cities, district: districts,
  };
  const panels = Object.fromEntries(Object.entries(values).map(([part, names]) => [part, {
    // 隐藏的旧面板可能仍在淡出动画中占位置，以 aria-hidden 为准。
    getClientRects: () => active ? [{}] : [],
    getAttribute: (name) => name === "aria-hidden" && active !== part ? "true" : null,
    querySelectorAll: () => names.map((value) => button(value, () => after(() => {
      if (part === "state" && region.state !== region.city) active = "city";
      else if (part !== "district" && requireDistrict) active = "district";
      else finish();
    }), () => active === part)),
  }]));
  const context = vm.createContext({
    window: {}, performance: { clearResourceTimings() {}, setResourceTimingBufferSize() {} },
    document: {
      querySelectorAll(selector) {
        if (selector === 'input[name="store-locator-result"]') return stores;
        if (selector === 'button[data-autom="fulfillment-pickup-store-search-button"]') return [picker];
        const part = selector.match(/provinceselector-(state|city|district)-panel/)?.[1];
        assert.ok(part, `意料之外的选择器：${selector}`);
        return [panels[part]];
      },
    },
  });
  const step = vm.compileFunction(`return (${source})(target);`, ["target"], { parsingContext: context });
  return {
    clicks,
    step(plan = target(region)) {
      if (pending && --pending.polls === 0) { const action = pending.action; pending = null; action(); }
      return JSON.parse(JSON.stringify(step(plan)));
    },
    run(plan = target(region)) {
      for (let i = 0; i < 60; i++) {
        const state = this.step(plan);
        if (state.ready || state.error) return state;
      }
      throw new Error("地区选择没有结束");
    },
  };
}

test("#25：未选地区、门店列表为空时，按天环广场依次选择广东、广州、天河区", () => {
  const fixture = page();
  assert.deepEqual(fixture.run(), { ready: true, error: null });
  assert.deepEqual(fixture.clicks, ["", "广东", "广州", "天河区"]);
});

test("级联请求未返回时不重复点击，也支持只要求省市的选择器", () => {
  const fixture = page({ requireDistrict: false });
  assert.equal(fixture.run().ready, true);
  assert.deepEqual(fixture.clicks, ["", "广东", "广州"]);
});

test("直辖市直接进入区县时，按门店地址选区县", () => {
  const region = { state: "上海", city: "上海", address: "上海市普陀区中山北路 3300 号" };
  const fixture = page({ region, districts: ["黄浦区", "普陀区"] });
  assert.equal(fixture.run().ready, true);
  assert.deepEqual(fixture.clicks, ["", "上海", "普陀区"]);
});

test("已设置目标城市、门店列表仍在加载时不重新打开地区选择器", () => {
  const fixture = page({ current: "广东 广州 天河区" });
  assert.equal(fixture.step().ready, true);
  assert.deepEqual(fixture.clicks, []);
});

test("已有列表包含目标门店时保留现有流程，即使旧目标暂时没有地区元数据", () => {
  const fixture = page({ stores: [{ value: "R577", checked: false, disabled: false }] });
  assert.equal(fixture.step(target(null)).ready, true);
  assert.deepEqual(fixture.clicks, []);
});

test("已有可接受默认门店继续沿用，禁用门店则不能借此跳过地区选择", () => {
  const stores = [{ value: "R639", checked: true, disabled: false }];
  for (const override of [{ acceptNearest: true }, { monitoredStores: ["R639"] }]) {
    const fixture = page({ stores });
    assert.equal(fixture.step({ ...target(), ...override }).ready, true);
    assert.deepEqual(fixture.clicks, []);
  }
  const fixture = page({ stores: [{ ...stores[0], disabled: true }] });
  assert.equal(fixture.step({ ...target(), acceptNearest: true }).ready, false);
  assert.equal(fixture.clicks.length, 1);
});

test("已记住另一城市且列表不含目标门店时，切换到目标门店所在地区", () => {
  const fixture = page({ current: "上海 静安区", stores: [{ value: "R678", checked: true, disabled: false }] });
  assert.equal(fixture.run().ready, true);
  assert.deepEqual(fixture.clicks, ["", "广东", "广州", "天河区"]);
});

test("目标城市未出现在官网选项时明确停止，不随便选第一个城市", () => {
  const fixture = page({ cities: ["深圳", "珠海"] });
  const state = fixture.run();
  assert.equal(state.ready, false);
  assert.match(state.error, /无法.*唯一确定城市/);
  assert.deepEqual(fixture.clicks, ["", "广东"]);
});

test("门店地址不能唯一匹配区县时明确停止，不随便选第一个区县", () => {
  const fixture = page({ region: { ...guangzhou, address: "" } });
  assert.match(fixture.run().error, /无法.*唯一确定区县/);
  assert.deepEqual(fixture.clicks, ["", "广东", "广州"]);
});

test("空列表且缺少门店地区时明确提示补齐信息", () => {
  const fixture = page();
  assert.match(fixture.step(target(null)).error, /目标门店缺少省市信息/);
  assert.deepEqual(fixture.clicks, []);
});
