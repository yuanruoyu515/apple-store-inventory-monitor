import test from "node:test";
import assert from "node:assert/strict";
import { describeBrowserFailure, describeBrowserRecovery, describeCycleRows, describeCycleRow, describeCycleSummary, describeDelivery, describeMonitorStatus, describePickupDate, describePickupRecheckDate } from "../src/lib/monitorLog.ts";
const target = { storeTitle: "上海-南京东路", storeNumber: "R359", productName: "iPhone", partNumber: "MJTJ4CH/A", locale: "zh_CN" };
const row = (availability, pickupDetails) => ({ target, availability, pickupDetails });
const unavailable = {kind:"out_of_stock"};
const details = {pickupDisplay:"ineligible", pickupQuote:"目前暂不提供 Apple Store 零售店取货服务",saleReason:"NOT_FOR_SALE",saleMessage:"暂未发售"};
test("浏览器故障按原因给出可执行步骤，21 不直接认定为重复启动", () => {
  const occupied = describeBrowserRecovery("浏览器专属资料目录被占用，或无法取得目录锁。请检查其他实例和目录权限（退出码 21）").join("\n");
  assert.match(occupied, /托盘菜单.*退出/);
  assert.match(occupied, /只关主窗口.*留在后台/);
  assert.match(occupied, /重新打开一次.*开始监控/);
  assert.doesNotMatch(occupied, /你.*打开了两个|安全软件/);
  const denied = describeBrowserRecovery("无法访问资料目录：Access is denied. (os error 5)").join("\n");
  assert.match(denied, /保护历史记录.*拦截记录/);
  assert.match(denied, /联系管理员/);
  assert.doesNotMatch(denied, /重启电脑/);
  const missing = describeBrowserRecovery("未找到 Google Chrome 或 Microsoft Edge").join("\n");
  assert.match(missing, /安装 Google Chrome 或 Microsoft Edge/);
  assert.match(missing, /手动打开一次/);
});
test("共享浏览器启动故障只汇总一次，连续轮次不刷屏，正常结果继续记录", () => {
  const detail = "浏览器专属资料目录被占用，或无法取得目录锁（退出码 21）";
  const failure = row({kind:"unknown",reason:"browser_unavailable",detail});
  const rows = [failure, failure, failure, row(unavailable)];
  const lines = describeCycleRows(1, rows);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /影响 3 项监控/);
  assert.match(lines[1], /无货/);
  assert.equal(describeMonitorStatus(failure).label, "浏览器未连接");
  assert.equal(describeBrowserFailure(rows), detail);
  assert.equal(describeCycleRows(2, rows, detail).length, 1);
  assert.equal(describeBrowserFailure([row(unavailable)]), null);
});
test("缺失 SKU 与空取货节点分别解释，不误报结构错误或无货", () => {
  const missing = row({kind:"unknown",reason:"product_not_returned",part_number:target.partNumber});
  const empty = row({kind:"unknown",reason:"no_pickup_data",store_number:"R359"});
  assert.match(describeCycleRow(3,missing), /未返回型号.*R359.*MJTJ4CH\/A.*暂无库存结论/);
  assert.doesNotMatch(describeCycleRow(3,missing), /接口.*异常|停售/);
  assert.equal(describeMonitorStatus(empty).label,"暂无取货数据");
  const paused = row({kind:"unknown",reason:"store_pickup_unavailable",store_number:"R384"});
  assert.equal(describeMonitorStatus(paused).label,"暂停取货");
});
test("明确未发售与不支持取货分别显示，单凭 NOT_FOR_SALE 不推断预售", () => {
  assert.equal(describeMonitorStatus(row(unavailable,details)).label,"暂未开售");
  assert.equal(describeMonitorStatus(row(unavailable,{...details,saleMessage:null})).label,"暂不可购买");
  assert.equal(describeMonitorStatus(row(unavailable,{...details,saleReason:null})).label,"不支持取货");
  assert.match(describeCycleRow(1,row(unavailable,details)), /ineligible.*NOT_FOR_SALE.*暂未发售/);
});
test("取货有货不会被送货信息覆盖；无元数据仍兼容旧快照", () => {
  assert.equal(describeMonitorStatus(row({kind:"in_stock"},details)).label,"有货");
  assert.equal(describeMonitorStatus(row(unavailable)).label,"无货");
  assert.equal(describeMonitorStatus(row({kind:"unknown",reason:"transport",detail:"超时"},details)).label,"查询失败");
});
test("每轮汇总按业务原因计数，拦截不能算无货", () => {
  const rows = [row(unavailable,details),row({kind:"unknown",reason:"product_not_returned",part_number:"old"}),row({kind:"unknown",reason:"blocked",detail:"HTTP 541"})];
  assert.equal(describeCycleSummary(rows),"暂未开售 1 项、未返回型号 1 项、请求被拦截 1 项");
  assert.match(describeCycleRow(1,rows[2]), /HTTP 541/);
});

test("Duo 即将发售与18 Pro暂未开售分别显示，日志保留原始区别", () => {
  const duo = row(unavailable,{...details,saleReason:"COMING_SOON",saleMessage:"暂无供应"});
  const status = describeMonitorStatus(duo);
  assert.equal(status.label,"即将发售");
  assert.equal(status.tone,"comingSoon");
  const pro = describeMonitorStatus(row(unavailable,details));
  assert.equal(pro.label,"暂未开售");
  assert.equal(pro.tone,"presale");
  assert.match(describeCycleRow(1,duo), /COMING_SOON.*暂无供应/);
  assert.equal(describeMonitorStatus(row({kind:"in_stock"},duo.pickupDetails)).label,"有货");
});

test("送货日期按速度分色，并同时给出非颜色文字提示", () => {
  const checkedAt = new Date(2026, 8, 14, 19, 1, 20).getTime();
  assert.deepEqual(describeDelivery({saleMessage:"2026/10/14 — 免费"},checkedAt),{
    label:"10/14",timing:"30 天后",tone:"later",detail:"2026/10/14 — 免费"
  });
  assert.deepEqual(describeDelivery({saleMessage:"2026/09/16 – 2026/09/18 — 免费"},checkedAt),{
    label:"9/16 – 9/18",timing:"2 天后",tone:"soon",detail:"2026/09/16 – 2026/09/18 — 免费"
  });
  assert.equal(describeDelivery({saleMessage:"2026/09/20 — 免费"},checkedAt).tone,"standard");
  assert.equal(describeDelivery({saleMessage:"明天 — 免费"},checkedAt).tone,"fast");
  assert.deepEqual(describeDelivery({saleMessage:"2-3 周 — 免费"},checkedAt),{
    label:"2-3 周",timing:"以 Apple 返回的送货说明为准",tone:"unknown",detail:"2-3 周 — 免费"
  });
  assert.equal(describePickupDate("星期六 2026/09/19；Apple 香港广场"),"9/19");
});

test("送货文案缺失、暂无供应与未知地区格式不会互相误判", () => {
  assert.equal(describeDelivery({saleMessage:null}),null);
  assert.equal(describeDelivery({saleMessage:"暂无供应 — 免费"}).tone,"unavailable");
  assert.deepEqual(describeDelivery({saleMessage:"Arrives 14 Oct — Free"},0),{
    label:"Arrives 14 Oct",timing:"以 Apple 返回的送货说明为准",tone:"unknown",detail:"Arrives 14 Oct — Free"
  });
});

test("Watch 日志明确标出送货查询使用的目录默认表带", () => {
  const watch = {
    ...target,
    productName: "Apple Watch Ultra 4 49 毫米 黑色",
    companionPart: "MKDY4FE/A",
  };
  const text = describeCycleRow(1, { target: watch, availability: { kind: "in_stock" } });
  assert.match(text, /送货搭配表带=MKDY4FE\/A/);
});

test("Watch default 取货状态保留 Apple 待开放说明", () => {
  const pending = row(
    { kind: "unknown", reason: "pickup_pending" },
    { pickupDisplay: "default", pickupQuote: "请于 9 月 18 日查看具体供应状况", saleReason: "SELL_IN_KIT_ONLY_RESTRICTION", saleMessage: "2-3 周" },
  );
  const status = describeMonitorStatus(pending);
  assert.equal(status.label, "待开放取货");
  assert.equal(status.tone, "comingSoon");
  assert.match(status.detail, /default.*9 月 18 日/);
});

test("Duo default 显示待公布与 Apple 再查日期，不冒充有货或解析失败", () => {
  const pending = row({kind:"unknown",reason:"pickup_pending"}, {
    pickupDisplay:"default",pickupQuote:"Check back for availability on 10.24",
    saleReason:"OK",saleMessage:"Mon, Jan 25 — Free",deliveryDate:"20270125"
  });
  assert.equal(describeMonitorStatus(pending).label,"待开放取货");
  assert.equal(describeMonitorStatus(pending).tone,"comingSoon");
  assert.match(describeCycleRow(1,pending),/待开放取货.*default.*Check back.*10\.24/);
  assert.equal(describePickupRecheckDate(pending.pickupDetails.pickupQuote),"10/24 再查");
  assert.equal(describePickupRecheckDate("Available tomorrow"),null);
  assert.equal(describePickupRecheckDate("Check back for availability on 99.99"),null);
});

test("美式跨年日期使用 Apple 编码日期，不误报未选地址", () => {
  const checkedAt = new Date(2026,9,16,10,20).getTime();
  assert.deepEqual(describeDelivery({saleMessage:"Mon, Jan 25 — Free",deliveryDate:"20270125"},checkedAt), {
    label:"1/25",timing:"101 天后",tone:"later",detail:"Mon, Jan 25 — Free"
  });
  assert.equal(describeDelivery({saleMessage:"Mon, Jan 25 — Free",deliveryDate:"20270231"},checkedAt).tone,"unknown");
  assert.equal(describeDelivery({saleMessage:"2026/10/24 – 2026/10/26 — 免费",deliveryDate:"20261026"},checkedAt).label,"10/24 – 10/26");
});
