# 果到雷达 · 美国版技术说明

完整介绍、界面截图与下载安装入口见 **[美加修改版首页](README.md)**。v1.0.9 起同一应用增加加拿大支持，详见 [加拿大说明](README_CA.md)。本版由 [yuanruoyu515](https://github.com/yuanruoyu515) 维护，联系与反馈：[Threads @realtimyry](https://www.threads.com/@realtimyry)。下文保留美国适配细节、SKU 与构建说明。

当前美加版为 **v1.0.9-us.1**，基于上游 `Apple Store Inventory Monitor` v1.0.6，美国部分继续支持 iPhone Duo、iPhone 18 Pro 与 iPhone 18 Pro Max 到店取货库存监控。保留 `US` 文件名、Bundle ID 与配置目录，兼容旧版覆盖升级。

从 [GitHub Release](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases/latest) 下载：Apple 芯片 Mac 选择 `macOS-arm64`，Intel Mac 选择 `macOS-Intel`，解压后把应用放进“应用程序”。

## 使用

1. Mac 需已安装 Google Chrome 或 Microsoft Edge，并保持电脑唤醒。
2. 双击 `Apple Store Inventory Monitor US.app`。这是没有 Developer ID 签名及 Apple 公证的构建；若 macOS 拦截，可在“系统设置 → 隐私与安全性”确认本应用后选择“仍要打开”，或在系统允许时从 Finder 按住 Control 点击应用并选择“打开”。确认安装包来自本仓库 Release 后，仍被拦截时可在终端执行：

   ```bash
   xattr -dr com.apple.quarantine "/Applications/Apple Store Inventory Monitor US.app"
   ```

3. 地区默认是 `United States`。门店搜索支持州、城市、店名或门店编号。
4. 选择一个或多个门店，再选择 iPhone Duo / 18 Pro / Pro Max 的容量与颜色，点击“添加监控”。可在型号搜索框输入 `Duo` 筛选新机型。
5. 可填写 Bark 地址（例如 `https://api.day.app/你的密钥`），再点“测试提醒与跳转”。
6. 点击“开始监控”。关闭主窗口后应用会留在菜单栏继续监控；彻底退出、电脑休眠或关机后会停止。

应用查询时会启动一个隔离的临时 Chromium 会话完成 Apple 的浏览器验证，不读取日常浏览器资料。库存变化和 Apple 的风控策略都可能很快变化，最终能否取货以 Apple 官网下单结果为准。

## 美国版变更

- 美国站点 `https://www.apple.com` 与 `en_US` 地区支持。
- 内置 269 家美国 Apple Store，门店标题同时包含州与城市。
- 内置 40 个美国 `LL/A` SKU：32 个 iPhone 18 Pro / Pro Max 配置，以及 8 个 iPhone Duo 配置。
- iPhone Duo 支持 256GB、512GB、1TB、2TB，颜色为 Night Sky 与 Star White；“刷新型号”也包含 Duo 购买页。
- 美国查询携带 Apple 的 `UNLOCKED/US` 配置参数。
- 使用独立配置目录和 Bundle ID，不覆盖原版配置。
- 禁用上游自动更新检查，避免美国支持被正式版覆盖。

数据快照生成脚本为 `scripts/generate-us-data.mjs`，原始快照位于 `crates/apw-core/data/us-source/`。Pro 系列配置于 2026-09-15 核对，Duo 配置于 2026-10-15 从 [Apple 美国官方购买页](https://www.apple.com/shop/buy-iphone/iphone-duo) 的 `productSelectionData` 核对，仅使用 `UNLOCKED/US` 的美国料号。

截至 2026-10-16，Apple 的 Duo 预购取货响应可能为 `pickupDisplay: default`，并附带 `Check back for availability on 10.24`。新版将其显示为“取货待公布 / 10/24 再查”：这是 Apple 建议再查询的日期，不是保证可取货的日期，也不代表门店有货或无货。程序会继续按设定间隔查询，不把这个合法状态当解析错误或触发有货通知；真正返回可取货后才提醒。提示日期来自每次响应，不硬编码 10/24。

送货时间与门店取货分开显示；美式英文日期使用 Apple 提供的完整年月日解析，跨年日期也可正确显示。Apple 的 HTTP 541 拦截仍可能发生，查询失败会保留为未知状态并延长重试间隔。

## iPhone Duo 美国配置

| 容量 | Night Sky | Star White |
| --- | --- | --- |
| 256GB | `MK1F4LL/A` | `MK1E4LL/A` |
| 512GB | `MK1H4LL/A` | `MK1G4LL/A` |
| 1TB | `MK1L4LL/A` | `MK1J4LL/A` |
| 2TB | `MK1R4LL/A` | `MK1Q4LL/A` |

## 从源码构建

需要 Rust 1.90 或更新版本、Node.js、pnpm，以及 Xcode Command Line Tools：

```bash
pnpm install --frozen-lockfile
pnpm generate:na
pnpm test
cargo test --workspace
pnpm tauri build --bundles app
```

输出位于 `target/release/bundle/macos/Apple Store Inventory Monitor US.app`。

两种 Mac 架构可分别使用 `pnpm tauri build --bundles app --target aarch64-apple-darwin` 和 `pnpm tauri build --bundles app --target x86_64-apple-darwin`，前提是通过 `rustup target add` 安装对应目标。

## 许可

本分支是 GPL-3.0-or-later 衍生作品，直接基于 suversal/apple-store-inventory-monitor v1.0.6。原项目与来源说明见 [README](README.md#来源与开源许可)、[NOTICE](NOTICE) 和 [LICENSE](LICENSE)；上游原版文档归档在 [README_UPSTREAM.md](README_UPSTREAM.md)。分发应用时请同时保留对应源代码与许可证。
