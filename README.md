# 果到雷达 · 美加阿版 🇺🇸 🇨🇦 🇦🇪

由 [yuanruoyu515](https://github.com/yuanruoyu515) 维护，基于 [suversal/apple-store-inventory-monitor v1.0.26](https://github.com/suversal/apple-store-inventory-monitor/tree/v1.0.26) 修改，继续按 GPL-3.0-or-later 发布。

[下载最新修改版](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases/latest) · [Threads @realtimyry](https://www.threads.com/@realtimyry) · [来源与修改声明](NOTICE)

当前源码和应用版本为 **1.0.27**，发布标签为 **v1.0.27-us.1**。同一个 macOS 安装包支持美国、加拿大和阿联酋。为兼容旧版升级，应用仍叫 `Apple Store Inventory Monitor US.app`，应用标识与原有配置目录不变。请从本仓库下载，不能用上游安装包覆盖修改版。

## 这一版更新了什么

- 从旧的上游 v1.0.6 基础更新到 v1.0.26，采用当前的 `shop/retail/pickup-message` 取货接口。
- 查询浏览器使用应用专属的持久资料目录，复用会话；修正真实浏览器版本、UA 与 Client Hints，HTTP 541 不再直接销毁整个会话。
- 合并同城门店的取货查询；每次最多 20 个零件号，响应缺少目标门店或型号时补查。每个门店仍独立判定库存。
- 保留上游的查询线路设置：跟随系统代理、指定 Clash 节点、Clash 节点轮换。轮换需要自己配置正在运行的 Clash 和节点；软件不提供代理服务。
- 新增阿联酋官方门店和独立 `AH/A` 型号。三国各用自己的门店、料号、查询与购买入口，美国以外不会携带 `UNLOCKED/US` 参数。
- 界面增加维护者 GitHub 与 Threads 小标签，保留上游源码入口。
- 保留声音、Bark、型号专属推送、购物袋与商品页跳转；加入上游 Bark 通知参数、后台发送和到货后暂停监控等改进。

**这些改动不能保证消除 Apple HTTP 541。** 查询失败显示未知，不当成无货。跟随系统代理和指定节点模式遇到拦截后会停止当轮同地区的其他请求，下一轮按设置的间隔重试；Clash 轮换模式会冷却被拒节点并尝试其他可用节点。所有节点不可用时等待恢复。

## 下载与安装

| Mac | 下载 v1.0.27 |
| --- | --- |
| Apple 芯片（M 系列） | [macOS-arm64 ZIP](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases/download/v1.0.27-us.1/Apple-Store-Inventory-Monitor-US-macOS-arm64-1.0.27.zip) |
| Intel | [macOS-Intel ZIP](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases/download/v1.0.27-us.1/Apple-Store-Inventory-Monitor-US-macOS-Intel-1.0.27.zip) |

1. 完全退出旧应用，包括菜单栏里的实例。
2. 解压 ZIP，把 `Apple Store Inventory Monitor US.app` 拖进“应用程序”，替换同名应用。旧版美国与加拿大监控、Bark 和声音设置会保留。
3. 安装 Google Chrome 或 Microsoft Edge 到 `/Applications`。Mac 需要保持唤醒。
4. 安装包采用 ad-hoc 签名，没有 Developer ID 签名或 Apple 公证。首次打开被拦截时，在“系统设置 → 隐私与安全性”确认本应用后选择“仍要打开”。

确认 ZIP 来自本仓库且校验一致后，仍提示已损坏或无法打开时，可只移除此应用的下载隔离标记：

```sh
xattr -dr com.apple.quarantine "/Applications/Apple Store Inventory Monitor US.app"
```

发布页提供安装包、对应源码、说明和 SHA-256 校验文件。普通用户不需要 Rust、Node.js 或 pnpm。本修改版当前只发布 macOS 安装包。

## 开始监控

1. 地区选择 **United States / Canada / United Arab Emirates**，品类选择 iPhone。
2. 按州、省、酋长国、城市或店名搜索并多选门店；选择型号、容量和颜色，点击“添加监控”。三国的监控可以共存。
3. 配置提示音、Bark，以及到货后是否打开当地购物袋或商品页；先点击“测试提醒与跳转”。
4. 点击“开始监控”。新安装默认间隔为 **60 秒**；旧设置原样保留。监控门店多或持续遇到 541 时，进一步延长间隔或暂停后再试。
5. 只想提醒一次，可开启“到货后暂停监控”。关闭窗口后留在菜单栏仍可监控；彻底退出、Mac 休眠、关机或断网会停止查询。

Bark 推送地址形如 `https://api.day.app/你的BarkKey`。Key 属于凭证，不要放入公开日志或截图。Bark 只负责接收提醒，不能代替 Mac 运行监控。

## 地区目录与边界

| 地区 | 内置门店 | iPhone 型号 | 料号 |
| --- | ---: | ---: | --- |
| 美国 | 269 | 40 | `LL/A` |
| 加拿大 | 28 | 40 | `VC/A` |
| 阿联酋 | 5 | 40 | `AH/A` |

各国均包含 iPhone Duo、18 Pro、18 Pro Max 的颜色与容量组合。目录快照只代表可选择的型号，不代表当前库存。美国门店的地址与 ZIP code、阿联酋目录于 2026-10-29 从 Apple 官方页面核对；加拿大及美加型号保留先前核对的独立快照；详情见 [美国技术说明](README_US.md)、[加拿大说明](README_CA.md)、[阿联酋说明](README_AE.md)。

“取货待公布”或“待开放取货”不是有货，也不是无货，不触发到货提醒；Apple 给出的“再查”日期不是承诺可取货日期。预计送货信息只展示 Apple 实际返回的内容；本版未增加美加阿联酋的收货地址或邮编查询，不能据此判断送达某地址的时间。

本修改版提供取货监控、提醒和页面跳转，不向三国开放上游仅验证过中国大陆页面的自动结账功能。软件不预留库存、不自动付款。库存和最终购买结果以 Apple 官网为准。

## 从源码构建

```sh
git clone --branch us-edition https://github.com/yuanruoyu515/apple-store-inventory-monitor.git
cd apple-store-inventory-monitor
pnpm install --frozen-lockfile
pnpm generate:regions
pnpm test
cargo test --workspace
pnpm tauri build --bundles app
```

需要 Rust 1.90+、Node.js 24、pnpm 和 Xcode Command Line Tools。应用输出到 `target/release/bundle/macos/Apple Store Inventory Monitor US.app`。发布流水线分别构建 Apple Silicon 与 Intel，校验签名后打包，两个架构均成功才发布。

## 来源与反馈

修改版维护：[GitHub @yuanruoyu515](https://github.com/yuanruoyu515) · [Threads @realtimyry](https://www.threads.com/@realtimyry)。反馈请附应用版本、Mac 芯片、国家、门店编号、型号和相关日志，隐去通知凭证及个人信息。

上游原作者及贡献者署名、GPL 许可与历史修改声明继续保留。上游原文档归档在 [README_UPSTREAM.md](README_UPSTREAM.md)，不作为本修改版安装说明。更早的来源包括 [ENCHIGO/apple-pickup-watcher](https://github.com/ENCHIGO/apple-pickup-watcher) 与 [hteen/apple-store-helper](https://github.com/hteen/apple-store-helper)。本项目与 Apple Inc. 无隶属或授权关系。
