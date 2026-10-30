> 当前版本为 **v1.0.28-us.1**，已基于上游 v1.0.26 更新，支持美国、加拿大和阿联酋。安装与当前查询行为以 [README.md](README.md) 为准。下文保留先前版本的地区数据来源及实现记录；旧的 fulfillment 取货路径已换成 `shop/retail/pickup-message`，请求调度与 541 处理已更新。

# 果到雷达 · 加拿大支持 🇨🇦

从 **v1.0.9-us.1** 开始，同一个 macOS 安装包可监控美国与加拿大。下载请用 [yuanruoyu515 的 Releases](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases/latest)，不要下载上游原版。保留 `US` 文件名是为了兼容升级，新版窗口标题为「果到雷达 · 美加版」。

## 加拿大怎么用

1. 完全退出旧应用，打开通用 DMG，拖到 Applications 快捷图标并覆盖“应用程序”中的 `Apple Store Inventory Monitor US.app`。原有美国监控、Bark 和提醒设置会保留。
2. Mac 需安装 Google Chrome 或 Microsoft Edge，并保持唤醒。
3. 在地区选择 **Canada**，品类选择 iPhone。
4. 门店搜索可输入省、城市或店名，例如 `Ontario`、`Toronto`、`British Columbia`、`Vancouver`、`Quebec`。
5. 选择 Duo／18 Pro／Pro Max 的容量、颜色，添加监控。已有美国监控不会因切换地区被删除。
6. 按需配置声音、Bark 与打开购物袋，先测试提醒再开始监控。

加拿大到货提醒打开的是 **加拿大 Apple 购物袋或商品页**，不会跳到美国站。它不会自动付款或预留库存。

## 官方数据与地区边界

2026-10-16 核对的加拿大官方门店快照包含 **28 家门店、6 个省**：

| 省 | 门店数 |
| --- | ---: |
| Alberta | 4 |
| British Columbia | 5 |
| Manitoba | 1 |
| Nova Scotia | 1 |
| Ontario | 12 |
| Quebec | 5 |

来源：[Apple 加拿大门店列表](https://www.apple.com/ca/retail/storelist/)。门店标题保留省与城市，支持现有搜索框筛选。

商品快照来自 [iPhone 18 Pro／Pro Max 加拿大购买页](https://www.apple.com/ca/shop/buy-iphone/iphone-18-pro) 与 [iPhone Duo 加拿大购买页](https://www.apple.com/ca/shop/buy-iphone/iphone-duo) 的公开 `productSelectionData`。共 **40 个加拿大 `VC/A` 料号**：Pro 与 Pro Max 各 16 个，Duo 8 个。不是把美国料号的后缀替换成加拿大后缀。

| Duo 容量 | Night Sky | Star White |
| --- | --- | --- |
| 256GB | `MK254VC/A` | `MK244VC/A` |
| 512GB | `MK274VC/A` | `MK264VC/A` |
| 1TB | `MK294VC/A` | `MK284VC/A` |
| 2TB | `MK2C4VC/A` | `MK2A4VC/A` |

加拿大地区使用 `en_CA`、`en-CA`、`https://www.apple.com/ca/shop/fulfillment-messages`。官方加拿大购买页未使用美国的 `cppart=UNLOCKED/US` 参数，本版也不会携带该参数。浏览器与普通 HTTP 查询共享同一套参数生成规则。

美国仍使用自己的 `en_US`、`LL/A` 料号、美国门店与美国购物袋。切换目录时会丢弃旧请求的迟到结果，避免把两国门店或型号串在一起。

## 限制

离线快照表示可选择的目录，不代表当前库存。Apple 返回“取货待公布”时不会发有货提醒；查询失败仍是未知，不能当成无货。HTTP 541 风控、网络失败、官网改动与库存瞬时变化仍可能影响结果，应用会限速，系统或指定节点模式按设定间隔重试，Clash 轮换模式会对被拒节点冷却并换线。

加拿大的省／市／区送货地址联动目前不支持；该设置原本仅用于中国大陆接口，不应拿来填加拿大地址。加拿大版主要查询门店取货，送货时间仅在 Apple 实际提供时显示，不保证是某个收货邮编的报价。本版没有新增加拿大邮编送货查询。

关闭窗口但留在菜单栏可以继续监控；彻底退出、Mac 休眠或关机会停止。Bark 不是云端监控服务。

## 刷新和生成离线数据

源码快照位于 `crates/apw-core/data/ca-source/catalog.json`，记录官方来源、核对时间和页面 SHA-256。构建时只读取已提交的快照，不需要访问 Apple：

```bash
pnpm generate:regions
pnpm test
cargo test --workspace
pnpm tauri build --bundles app
```

维护者需要重新核对官方数据时运行 `pnpm refresh:ca`，随后运行 `pnpm generate:ca` 并检查 diff、测试及真实查询。刷新脚本只解析公开 JSON，不执行网页脚本；生成脚本拒绝空目录、重复料号及非加拿大 SKU。

来源与许可见 [NOTICE](NOTICE)、[LICENSE](LICENSE)。本修改版由 [yuanruoyu515](https://github.com/yuanruoyu515) 维护，反馈可联系 [Threads @realtimyry](https://www.threads.com/@realtimyry)。
