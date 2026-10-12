# 果到雷达 · 美国版

这是 `Apple Store Inventory Monitor` v1.0.6 的美国地区分支，面向美国 Apple Store 的 iPhone 18 Pro 与 iPhone 18 Pro Max 到店取货库存监控。

## 使用

1. Mac 需已安装 Google Chrome 或 Microsoft Edge，并保持电脑唤醒。
2. 双击 `Apple Store Inventory Monitor US.app`。这是没有 Developer ID 公证的构建；若 macOS 拦截，请在 Finder 中按住 Control 点击应用并选择“打开”。仍被拦截时，可在终端执行：

   ```bash
   xattr -dr com.apple.quarantine "/Applications/Apple Store Inventory Monitor US.app"
   ```

3. 地区默认是 `United States`。门店搜索支持州、城市、店名或门店编号。
4. 选择一个或多个门店，再选择 iPhone 18 Pro / Pro Max 的容量与颜色，点击“添加监控”。
5. 可填写 Bark 地址（例如 `https://api.day.app/你的密钥`），再点“测试提醒与跳转”。
6. 点击“开始监控”。关闭主窗口后应用会留在菜单栏继续监控；彻底退出、电脑休眠或关机后会停止。

应用查询时会启动一个隔离的临时 Chromium 会话完成 Apple 的浏览器验证，不读取日常浏览器资料。库存变化和 Apple 的风控策略都可能很快变化，最终能否取货以 Apple 官网下单结果为准。

## 美国版变更

- 美国站点 `https://www.apple.com` 与 `en_US` 地区支持。
- 内置 269 家美国 Apple Store，门店标题同时包含州与城市。
- 内置 32 个美国 `LL/A` 的 iPhone 18 Pro / Pro Max SKU，涵盖容量与颜色。
- 美国查询携带 Apple 的 `UNLOCKED/US` 配置参数。
- 使用独立配置目录和 Bundle ID，不覆盖原版配置。
- 禁用上游自动更新检查，避免美国支持被正式版覆盖。

数据快照生成脚本为 `scripts/generate-us-data.mjs`，原始快照位于 `crates/apw-core/data/us-source/`。商品配置已于 2026-09-15 对照 Apple 美国官方购买页确认。

## 从源码构建

需要 Rust 1.90 或更新版本、Node.js、pnpm，以及 Xcode Command Line Tools：

```bash
pnpm install --frozen-lockfile
pnpm test
cargo test --workspace
pnpm tauri build --bundles app
```

输出位于 `target/release/bundle/macos/Apple Store Inventory Monitor US.app`。

## 许可

本分支是 GPL-3.0-or-later 衍生作品。原项目与来源说明见 `README.md`、`NOTICE` 和 `LICENSE`；分发应用时请同时保留对应源代码与许可证。
