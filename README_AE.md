# 阿联酋支持

从 **v1.0.27-us.1** 起，同一个 macOS 安装包支持 United States、Canada 和 **United Arab Emirates**。下载和安装见 [README](README.md)，维护者为 [yuanruoyu515](https://github.com/yuanruoyu515)，联系 [Threads @realtimyry](https://www.threads.com/@realtimyry)。

## 官方目录

2026-10-29 核对 [Apple 阿联酋门店列表](https://www.apple.com/ae/retail/storelist/)，包含五家门店：

| 城市 | 门店 | 编号 |
| --- | --- | --- |
| Dubai | Dubai Mall | R597 |
| Dubai | Mall of the Emirates | R596 |
| Abu Dhabi | Al Maryah Island | R706 |
| Abu Dhabi | Yas Mall | R595 |
| Al Ain | Al Jimi Mall | R785 |

搜索支持酋长国、城市、门店名和编号。型号从 [阿联酋 iPhone 18 Pro / Pro Max](https://www.apple.com/ae/shop/buy-iphone/iphone-18-pro) 与 [iPhone Duo](https://www.apple.com/ae/shop/buy-iphone/iphone-duo) 购买页的公开 JSON 读取，共 40 个独立 `AH/A` 料号：Pro、Pro Max 各 16 个，Duo 8 个。没有从其他国家替换后缀生成型号。

源码 `crates/apw-core/data/ae-source/catalog.json` 保存来源、核对时间、页面 SHA-256 和精简目录。运行 `pnpm refresh:ae` 可重新核对，`pnpm generate:ae` 从已提交快照生成内置数据，构建过程不联网抓 Apple。解析器拒绝空目录、重复门店、重复料号、其他地区料号和运营商专属变体。

## 查询范围

阿联酋采用 `en_AE` 和 `/ae/shop/retail/pickup-message` 取货接口，购物袋与商品页均保留 `/ae` 前缀，不附带美国 `cppart=UNLOCKED/US`。查询沿用上游的持久浏览器会话、同城响应复用、限速和可选 Clash 轮换；541 仍可能出现。

同城响应只在本轮复用，找不到准确门店或料号时补查，不把其他门店的有货状态当成当前门店。目录与查询失败不能证明有货或无货。未增加阿联酋收货地址送达时间查询或自动结账功能。
