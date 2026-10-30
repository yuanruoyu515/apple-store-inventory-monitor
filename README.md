<p align="center">
  <img src="src-tauri/icons/icon.png" width="88" height="88" alt="果到雷达 App 图标">
</p>

<h1 align="center">果到雷达 · 美加阿版</h1>

<p align="center">
  <strong>选好门店和型号，有货时及时知道。</strong><br>
  美国、加拿大、阿联酋 Apple Store 取货库存监控，运行在你的 Mac 上。
</p>

<p align="center">
  <a href="https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases/download/v1.0.28-us.1/Apple-Store-Inventory-Monitor-US-macOS-universal-1.0.28.dmg">
    <img src="docs/readme/download.svg" width="256" height="48" alt="下载 macOS 通用 DMG">
  </a>
</p>

<p align="center">
  <a href="#开始使用">开始使用</a> ·
  <a href="https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases">版本记录</a> ·
  <a href="https://www.threads.com/@realtimyry">Threads @realtimyry</a>
</p>

<p align="center">
  <img src="docs/readme/app-overview.png" width="100%" alt="美加阿版真实界面：同时监控纽约、多伦多和迪拜门店，显示各型号的取货状态、最后检查时间与逐项日志">
</p>

<p align="center"><sub>v1.0.28 实机截图，拍摄于 2026-10-29。库存仅代表拍摄时 Apple 返回的结果。</sub></p>

<details>
<summary>完整使用目录</summary>

- [运行要求](#运行要求) / [下载安装](#下载与安装) / [校验安装包](#校验安装包)
- [添加与管理监控](#添加与管理监控) / [提醒与页面跳转](#提醒与页面跳转) / [Bark 配置](#bark-配置)
- [查询间隔](#查询间隔) / [查询线路与 Clash](#查询线路与-clash) / [状态说明](#状态说明)
- [设置、备份与隐私](#设置与数据) / [常见问题](#常见问题)
- [源码构建](#从源码构建) / [验证与数据维护](#验证与数据维护) / [反馈问题](#反馈问题)

</details>

<a id="这一版更新了什么"></a>

## 把反复刷新，交给雷达

果到雷达会按设定间隔查询你选中的门店与型号。Apple 明确返回可取货时，可以播放提示音、把消息推送到 iPhone，或打开对应国家的购物袋和商品页。你继续在 Apple 官网确认并完成购买。

这是由 **[yuanruoyu515](https://github.com/yuanruoyu515)** 维护的地区修改版，基于 **[suversal 的果到雷达 v1.0.26](https://github.com/suversal/apple-store-inventory-monitor/tree/v1.0.26)** 继续适配。现有用户可以覆盖升级，保留原来的监控、Bark 与声音设置。

- **多门店、多型号一起看。** 按州、省、酋长国、城市或店名搜索，多选后一次添加；美国、加拿大和阿联酋的监控可以共存。
- **提醒送到你需要的地方。** 支持电脑提示音、Bark 手机推送和页面跳转，也能给某个型号单独设置 Bark 地址。只想收到一次提醒，可开启「到货后暂停监控」。
- **减少重复查询。** 复用应用专属浏览器会话，合并同城取货请求；响应缺少准确门店或型号时补查。查询线路可跟随系统代理，也可使用自己配置的 Clash 节点。
- **每次查询都有记录。** 查看最后检查时间、门店编号、零件号和 Apple 原始取货说明。被拦截、未返回型号或尚未开放取货时，保留相应状态。

<a id="地区目录与边界"></a>

## 三国目录，各用各的

| 地区 | 内置 Apple Store | iPhone 配置 | 地区料号 |
| :--- | ---: | ---: | :--- |
| United States / 美国 | 269 家 | 40 个 | `LL/A` |
| Canada / 加拿大 | 28 家 | 40 个 | `VC/A` |
| United Arab Emirates / 阿联酋 | 5 家 | 40 个 | `AH/A` |

三国均包含 **iPhone Duo、iPhone 18 Pro、iPhone 18 Pro Max** 的容量与颜色组合。各国使用独立料号、当地查询入口及购物袋，美国以外不携带美国运营商参数。

阿联酋目录包括 **Dubai Mall、Mall of the Emirates、Al Maryah Island、Yas Mall、Al Jimi Mall**。门店和型号来自 Apple 官方公开页面，目录快照不代表当前库存。

<details>
<summary>看看门店搜索与多选</summary>

<p>
  <img src="docs/readme/store-picker.png" width="100%" alt="阿联酋门店选择界面：完整列出 Dubai、Abu Dhabi 与 Al Ain 的五家 Apple Store，可搜索并多选">
</p>

美国与加拿大也使用相同的搜索、多选方式。切换国家时会重新加载当地目录，已有监控继续保留。

数据来源与地区实现说明：[美国](README_US.md) / [加拿大](README_CA.md) / [阿联酋](README_AE.md)。美国门店地址与 ZIP code、阿联酋目录于 2026-10-29 核对；美加型号与加拿大门店保留先前独立核对的快照。

</details>

## 运行要求

| 项目 | 要求 |
| :--- | :--- |
| 电脑 | Mac，支持 Apple Silicon 与 Intel；两种芯片下载同一个通用 DMG |
| 查询浏览器 | Google Chrome 或 Microsoft Edge，安装在 `/Applications`（应用程序） |
| 网络 | 浏览器能正常打开所监控国家的 Apple 官网 |
| 运行状态 | App 保持运行，Mac 保持唤醒；可以关闭主窗口留在菜单栏 |
| 手机提醒 | 可选，需要在 iPhone / iPad 上安装 Bark 并允许通知 |
| Clash | 可选，仅在使用指定节点或节点轮换时需要自行配置 |

普通用户不需要安装 Rust、Node.js、pnpm 或 Xcode。它们只用于从源码构建。

应用会自动查找常见位置的 Chrome / Edge。请先手动打开一次浏览器，确认它能正常访问 Apple 官网。Safari、Firefox 和 Brave 目前不能替代这里的查询浏览器。

本版发布和验证的是 **macOS 美加阿版**，内置美国、加拿大、阿联酋的 iPhone 目录。平台和功能以本页说明及本仓库 Release 为准。

<a id="下载与安装"></a>

## 拖过去，就装好了

**一个通用 DMG，同时支持 Apple Silicon 与 Intel。** 不用区分芯片，也不需要安装开发工具。

<p align="center">
  <img src="docs/readme/dmg-install.png" width="760" alt="通用 DMG 安装窗口：左侧是果到雷达 App，右侧是 Applications 文件夹快捷图标，中间有拖拽方向箭头">
</p>

1. 点击页首「下载 macOS 通用 DMG」，打开下载的镜像。
2. 把左侧 App 拖到右侧 **Applications（应用程序）** 快捷图标。
3. 从「应用程序」打开 App。Mac 还需要安装 **Google Chrome 或 Microsoft Edge**，供后台查询使用。

升级时，先从菜单栏完全退出旧版，再替换同名 App。为兼容旧版，应用文件名仍是 `Apple Store Inventory Monitor US.app`；窗口名称为「果到雷达 · 美加阿版」。

当前应用版本为 **1.0.28**，Release 标签为 **v1.0.28-us.1**。发布页同时提供对应源码、安装说明和 SHA-256 校验文件。请从本仓库下载修改版，上游安装包不包含本版的三国适配。

### 校验安装包

在本版 [Release 的 Assets](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases/tag/v1.0.28-us.1) 中：

| 附件 | 用途 |
| :--- | :--- |
| `Apple-Store-Inventory-Monitor-US-macOS-universal-1.0.28.dmg` | 普通用户下载的安装镜像 |
| `SHA256SUMS.txt` | 安装包、源码与说明的 SHA-256 校验值 |
| `RELEASE-NOTES.md` | 本次更新和升级说明 |
| `Source-v1.0.28-us.1.zip` | 与本次发布对应的源码归档 |

需要校验时，把 DMG 和 `SHA256SUMS.txt` 下载到同一个目录。在终端进入该目录，例如：

```sh
cd ~/Downloads
shasum -a 256 Apple-Store-Inventory-Monitor-US-macOS-universal-1.0.28.dmg
```

将输出的完整校验值与 `SHA256SUMS.txt` 中 **DMG 对应的那一行**比较，两者应完全一致。GitHub 自动生成的 `Source code` 压缩包是源码，不是可直接打开的 App。

<a id="macos-打开问题"></a>

<details>
<summary>macOS 提示无法打开或 App 已损坏？</summary>

当前安装包采用 ad-hoc 签名，已校验两个架构的应用签名，但没有 Developer ID 签名或 Apple 公证。首次打开被拦截时，到「系统设置 → 隐私与安全性」确认本应用后选择「仍要打开」。

确认 DMG 来自本仓库、SHA-256 与发布页一致，仍无法打开时，可只移除此 App 的下载隔离标记：

```sh
xattr -dr com.apple.quarantine "/Applications/Apple Store Inventory Monitor US.app"
```

不需要关闭 macOS 的全局安全功能。

</details>

<a id="开始监控"></a>

## 开始使用

**选择门店与型号。** 在地区中选择 United States、Canada 或 United Arab Emirates，勾选门店、型号、容量与颜色，点击「添加监控」。

**设好提醒。** 按需开启提示音、填写 Bark 地址，并选择到货后是否打开购物袋或商品页。先点「测试提醒与跳转」，确认提醒方式可用。

**开始监控。** 新安装默认每 **60 秒** 查询一次；升级保留原间隔。关闭主窗口后，App 可以留在 Mac 菜单栏继续运行。使用时请保持电脑唤醒。

### 添加与管理监控

1. 正常打开一次 Chrome 或 Edge，确认能访问 Apple 官网，再打开果到雷达。
2. 选择 United States、Canada 或 United Arab Emirates，品类选择 iPhone。
3. 在门店下拉框中搜索并勾选一家或多家门店。美国可以搜州、加拿大可以搜省、阿联酋可以搜酋长国，也可以直接搜城市、店名或门店编号。
4. 在型号下拉框中勾选具体配置，确认机型、容量和颜色。搜索 `Duo`、`Pro` 或具体容量可以缩小范围。
5. 点击「添加监控」。例如，2 家门店 × 3 个型号会生成 6 条监控；已存在的组合会跳过。
6. 从监控列表中检查国家、门店、型号是否正确。不再需要的项目，可以点该行的删除按钮。

切换国家会清空上方尚未添加的选择，不会删除已经保存的监控项。不同国家的相同机型采用各自料号，需要分别添加；切换目录时会丢弃旧请求的迟到结果。

<details>
<summary>找不到新型号或新门店：刷新目录</summary>

门店和型号默认使用应用内置目录。点击「添加监控」旁的刷新按钮，可以从 Apple 官网更新当前国家的门店与 iPhone 型号，活动日志会显示结果。

- 刷新结果保存在本机，重启后继续使用。
- 刷新不会替换已经保存的监控项；部分页面失败时，成功的部分仍会更新，失败的部分保留已有目录。
- 使用「指定节点」或「Clash 节点轮换」时，刷新会先使用配置的专用端口；该线路无法访问官网时，可退回系统网络刷新，日志会说明。
- 列表中出现某个机型，只代表目录识别到了它，不代表已经开放预购或门店取货。

页面结构变化、官网下架旧机型或地区料号变化，都可能影响刷新。先看日志，再与对应国家的官网核对；不要拿其他国家的料号补进来。

</details>

### 提醒与页面跳转

| 设置 | 到货后的行为 |
| :--- | :--- |
| 提示音 | Mac 播放声音，需要系统音量和输出设备正常 |
| 默认 Bark 推送 | 将所有未单独配置的型号发送到同一条 Bark 地址 |
| 型号专属 Bark | 覆盖这个零件号的默认推送地址，同一型号在多家门店共用 |
| 不自动打开 | 保留声音、Bark 等已开启的提醒，不打开浏览器页面 |
| 购物袋 | 打开命中目标所属国家的 Apple 购物袋 |
| 跳转至教育商店购物袋 | 打开对应地区的教育商店购物袋，是否提供商品和购买资格以 Apple 页面为准 |
| 商品详情 | 打开命中型号的商品页，也可手动点击监控列表中的型号打开 |
| 到货后暂停监控 | 确认有货后暂停，之后需要手动点击「开始监控」 |

持续有货时，每一轮都会再次执行已经开启的提醒。如果不想反复弹出浏览器页面，把「到货后打开」设为「不自动打开」；只想提醒一次，可以开启「到货后暂停监控」。

打开页面使用的是平时的默认浏览器，不要求与后台查询使用同一浏览器。这些跳转不会自动加入购物袋、预留库存、提交订单或付款。

### 先测试，再开始

点击「测试提醒与跳转」，确认当前开启的声音、Bark 和页面跳转是否可用：

1. 只测试某一项时，临时关闭其他提醒；测完恢复实际要用的设置。
2. 测试商品详情前，先添加监控；测试会使用列表中第一个目标。
3. 检查活动日志是否记录执行成功或失败原因；Bark 还要确认手机实际收到通知。
4. 测试通过后点击「开始监控」，等待第一轮完成，查看逐项状态和「最后检查」。

**测试提醒不会查询 Apple 库存，不代表商品有货。** 测试 Bark 时通知标题会标明「提醒测试（不代表有货）」。选择「不自动打开」时，Bark 通知也不会附带跳转页面链接。

需要停一下时点「暂停监控」。关主窗口会留在菜单栏，完全退出要从菜单栏 App 图标的菜单选择「退出」。重新打开应用会恢复保存的列表，但仍需点击「开始监控」。

### 查询间隔

本版新安装默认 **60 秒**，旧版升级保留原设置。界面允许更短的间隔，最短为 1 秒；这不代表建议用 1 秒查询。日常先保留 60 秒或更长，监控项较多或经常被拦截时再延长。

间隔从本轮查询结束后开始计算。比如设置为 60 秒，本轮查询用了 8 秒，下一轮会在本轮结束后再等约 60 秒，不能把它理解为每条目固定每 60 秒完成一次查询。

同一门店的多个型号会合并请求，超过单次 20 个料号时分批；同一国家、相同型号组合的附近门店也会优先复用响应，缺少准确门店或型号才补查。真实库存请求之间至少间隔 2 秒，避免并发突发。实际等待时间以界面倒计时和活动日志为准。

<a id="bark-配置"></a>

<details>
<summary>把到货提醒推送到 iPhone</summary>

在 iPhone 上安装 Bark，把形如 `https://api.day.app/你的BarkKey` 的推送地址填入 App。可以设置通知等级、铃声、音量和持续响铃；这些效果还取决于 Bark 和 iPhone 的通知权限。

监控列表也支持为某个型号设置专属地址。BarkKey 属于推送凭证，反馈问题时请隐去完整地址。Bark 负责接收通知，Mac 负责运行监控。

#### 1. 在 iPhone 上下载 Bark

打开 [App Store 中的 Bark](https://apps.apple.com/cn/app/bark-%E7%BB%99%E4%BD%A0%E7%9A%84%E6%89%8B%E6%9C%BA%E5%8F%91%E6%8E%A8%E9%80%81/id1403753865)，或者在 App Store 搜索完整名称 **“Bark - 给你的手机发推送”**。安装后打开 Bark，并允许它发送通知。Bark 的源代码和官方说明可在 [Finb/Bark](https://github.com/Finb/Bark) 查看。

#### 2. 找到自己的 Bark 推送地址

打开 Bark 首页，找到并复制它显示的推送地址或测试 URL。果到雷达需要的是“服务器地址 + 设备 Key”，通常形如：

```text
https://api.day.app/你的设备Key
```

如果 Bark 显示的是下面这种带测试文字的完整地址：

```text
https://api.day.app/你的设备Key/这里改成你自己的推送内容
```

只把前半段 `https://api.day.app/你的设备Key` 填入果到雷达，不要把最后的测试文字一起粘贴。使用自建 Bark 服务器时规则相同：地址必须以 `http://` 或 `https://` 开头，并且路径中包含设备 Key。

设备 Key 相当于这台设备的推送凭证。不要把真实地址发到群聊、截图、公开 Issue 或代码仓库中。

#### 3. 填入果到雷达

1. 回到电脑上的果到雷达。
2. 在右侧「默认 Bark 推送」输入框粘贴地址。
3. 点击输入框外的空白位置，让设置保存。
4. 如果所有型号都推送到同一台手机，到这里就配置完成了。

想让某个型号推送给另一台手机时，先添加该型号的监控，再点击监控列表 Bark 一栏中的「默认」，在弹窗中填写另一条 Bark 地址并保存。按钮会变成「专属」。同一型号即使监控多家门店，也共用这一条专属地址；清空专属地址并保存，就会恢复使用默认 Bark。

#### 4. 先测试，再开始监控

点击「测试提醒与跳转」，然后检查：

1. iPhone 是否收到标题为“提醒测试（不代表有货）”的通知。
2. 果到雷达活动日志是否显示 Bark 已执行，还是给出了失败原因。
3. 如果配置了型号专属 Bark，测试会使用监控列表中第一个型号的地址；因此测试专属地址前，应先把对应型号添加到列表。

测试按钮不会查询 Apple 库存，也不代表商品有货。只有手机实际收到通知，才能确认 Bark 链路已经可用。

#### 5. 通知等级、铃声和持续响铃

在「Bark 推送增强」里设置，全部保持默认也可以正常推送。

| 选项 | 用法 |
| :--- | :--- |
| 不指定 | 沿用 Bark 默认通知行为 |
| `active` | 立即亮屏显示 |
| `timeSensitive` | 时效性通知，是否在专注模式显示取决于系统权限 |
| `passive` | 加入通知列表，不亮屏 |
| `critical` | 重要警告，需要先在 Bark 和 iPhone 设置中授予权限 |
| 铃声 | 可选 Bark 内置铃声；留空使用默认铃声 |
| 音量 | 0 到 10，仅重要警告生效；留空使用默认值 |
| 持续响铃 | 铃声重复约 30 秒，配合已获权限的重要警告使用 |

这些设置只作用于 Bark，不改变 Mac 提示音。静音、勿扰和专注模式下的表现还取决于 Bark 与 iOS 权限，设好后请实际测试。


</details>

<a id="查询线路与-clash"></a>

<details>
<summary>查询线路与 HTTP 541</summary>

本版带入了上游的持久浏览器会话、真实浏览器身份、同城响应复用和查询线路设置。这些改进可以减少重复请求，**不能保证消除 Apple HTTP 541**。

- **跟随系统代理 / 指定节点：** 遇到拦截后停止当轮同地区的其他请求，下一轮按设定间隔重试。
- **Clash 节点轮换：** 被拒的节点进入冷却，尝试其他可用节点；全部不可用时等待恢复。需要自己配置并运行 Clash，软件不提供代理或节点。

不要连续点击查询或把间隔调得很短。监控范围较大或持续被拦截时，延长间隔或暂停后再试。541 表示本次查询无法确认库存，不能当成无货。

#### 三种出口方式

| 出口方式 | 适合谁 | 行为 |
| --- | --- | --- |
| 跟随系统代理（默认） | 不使用代理，或不想改动 Clash | 与旧版本一致。开着 Clash 系统代理或 TUN 时，出口由 Clash 规则决定 |
| 指定节点 | 想固定用某个节点，或固定用家庭宽带 | 经 Clash 专用端口固定使用一个节点，不自动切换。选 DIRECT 即使用本机网络，Clash 开着 TUN 也有效 |
| Clash 节点轮换 | 有机场订阅、经常被拦截 | 平时一直用当前节点；被 Apple 拒绝时冷却该节点并立即换下一个 |

Clash 节点轮换的具体规则：

- 节点被 Apple 拒绝（`541`、`403`、`429`）后冷却 5 分钟；冷却结束后的第一次请求仍被拒，则依次延长到 10、20、30 分钟，成功一次即恢复。
- 切换前先对目标节点测速，测不通的节点跳过 60 秒，直接试下一个。测速地址为 `https://www.gstatic.com/generate_204`，不消耗 Apple 的请求额度；DIRECT 不参与测速。
- 连续 10 个不同节点都被 Apple 拒绝时，本轮停止切换，因为这通常说明拦截的不只是 IP。
- 所有节点都不可用时，下一轮等到最早恢复的节点，界面显示「冷却中」和倒计时。
- 可以在「当前节点」中手动指定节点，手动指定会解除该节点的冷却；之后被拒时仍会自动切换。

两种 Clash 模式都**只切换果到雷达专用的策略组，只让查询浏览器使用专用端口**，电脑上其他软件使用的节点不受影响。

#### 配置 Clash（以 Clash Verge Rev 为例）

需要使用 mihomo（Clash Meta）内核。Clash Verge Rev 默认就是 mihomo 内核。

**第一步：开启外部控制器**

1. 打开 Clash Verge，进入「设置」→「Clash 设置」→「外部控制」。
2. 打开「启用外部控制器」，监听地址填 `127.0.0.1:9097`。
3. 设置一个「API 访问密钥」并记下来，稍后要填到果到雷达里。
4. 点「保存」。

**第二步：添加果到雷达专用的扩展脚本**

1. 进入「订阅」页面，在页面底部找到 **「全局扩展脚本」**（右上角标着 `Script`）。
2. 右键点击它，选择「编辑文件」。
3. 先备份已有的全局扩展脚本。没有其他自定义逻辑时粘贴下面的脚本；已有逻辑时，把配置合并进原来的 `main`，不要直接覆盖。
4. 在 `APW_SUBSCRIPTIONS` 中填写机场订阅地址。每行一个，左边是机场名（只用于给节点加前缀），右边是订阅地址；有几个机场就写几行。订阅地址可以在对应订阅卡片上右键复制，或到机场官网复制。
5. 保存。如果「代理」页面没有刷新，在当前使用的订阅卡片上点一下刷新。

```javascript
// Clash Verge「全局扩展脚本」：节点只供果到雷达的专用端口使用，不影响电脑本身的节点
const APW_PREFIX = "APW·";
const APW_GROUP = "果到雷达";
const APW_SUBSCRIPTIONS = {
  机场1: "机场订阅地址",
};

function main(config, profileName) {
  const providers = config["proxy-providers"] || {};
  const used = [];
  for (const [label, url] of Object.entries(APW_SUBSCRIPTIONS)) {
    if (!/^https?:\/\//.test(url)) continue;
    const key = `apw-${label}`;
    providers[key] = {
      type: "http",
      url,
      interval: 86400,
      path: `./providers/${key}.yaml`,
      override: { "additional-prefix": `${APW_PREFIX}${label}|` },
      "health-check": { enable: false },
    };
    used.push(key);
  }
  config["proxy-providers"] = providers;

  // 原有策略组若自动收录全部节点（include-all / include-all-providers），排除专用节点
  const guard = `^${APW_PREFIX}`;
  const groups = (config["proxy-groups"] || []).filter((g) => g.name !== APW_GROUP);
  for (const group of groups) {
    if (group["include-all"] || group["include-all-providers"]) {
      const old = group["exclude-filter"];
      if (old && old.includes(guard)) continue;
      group["exclude-filter"] = old ? `(?:${old})|${guard}` : guard;
    }
  }
  groups.push({ name: APW_GROUP, type: "select", proxies: ["DIRECT"], use: used });
  config["proxy-groups"] = groups;

  const listeners = (config.listeners || []).filter((l) => l.name !== "apple-store-monitor");
  listeners.push({ name: "apple-store-monitor", type: "mixed", port: 7899, listen: "127.0.0.1", proxy: APW_GROUP });
  config.listeners = listeners;
  return config;
}
```

脚本做了三件事：把订阅节点加上 `APW·机场名|` 前缀，放进新建的「果到雷达」策略组；让原有策略组排除这些节点，电脑本身的分流保持不变；开一个只转发到「果到雷达」组的本机端口 `7899`。

> 不要把这些配置写进「全局扩展覆写配置」（Merge）。新版 Clash Verge 的 Merge 不支持追加策略组，写成 `proxy-groups` 还会替换原有的全部策略组，导致电脑分流异常。
>
> 订阅地址相当于账号凭证，不要截图、分享或提交到公开仓库。

**第三步：确认 Clash 已生效**

在 Clash Verge 的「代理」页面检查：

- 出现了名为「果到雷达」的策略组，里面有 DIRECT 和带 `APW·` 前缀的节点。
- 你平时使用的策略组（例如「节点选择」「自动选择」）中**没有**出现 `APW·` 开头的节点。如果出现了，说明脚本没有生效，或者使用了旧版写法，请重新按第二步操作。

**第四步：在果到雷达中填写**

1. 展开右侧「查询线路」，出口方式选择「Clash 节点轮换」或「指定节点」。
2. 按下表填写：

   | 项目 | 填写 |
   | --- | --- |
   | 控制接口 | 第一步的监听地址，例如 `127.0.0.1:9097`，可直接粘贴，程序会自动补上 `http://` |
   | 密钥 | 第一步设置的 API 访问密钥 |
   | 专用端口 | `7899`（与脚本中的 `port` 一致） |
   | 策略组 | `果到雷达`（与脚本中的 `APW_GROUP` 一致） |
   | 节点关键词 | 可留空；只想用部分节点时填关键词，用竖线分隔，例如 `香港\|台湾\|日本` |

3. 点「检查线路」。正常情况下会显示内核版本、可用节点数量和「端口 7899 可连接」。这一步只访问本机的 Clash，不会请求 Apple。
4. 在「当前节点」（指定节点模式下为「指定节点」）下拉框中查看各节点的延迟，需要时手动选择。
5. 点「开始监控」。活动日志每轮结束时会显示「线路：Clash 节点 …」，被拒或切换节点时也会记录。

「查询线路」面板中的「配置教程」按钮包含与本节相同的分步说明，并可一键复制与当前端口、策略组对应的脚本。

#### 使用建议

- **查询间隔建议保持本版默认的 60 秒或更长。** 间隔越短，每个节点的额度消耗越快，切换越频繁。
- **不想优先使用家庭宽带时**，把脚本中的 `proxies: ["DIRECT"]` 改成 `proxies: []`。脚本默认把 DIRECT 排在第一位，平时优先走本机网络，被拦截后再切换到机场节点。
- **选择能稳定访问对应国家 Apple 官网的节点。**「节点关键词」只是按节点名称筛选，不会替你验证库存或取得更高额度。
- **某个机场的节点全部测速超时**时，说明该订阅当前不可用，可以从 `APW_SUBSCRIPTIONS` 中删掉。
- 机场的多个节点可能共用同一个出口 IP，也可能与其他用户共用，因此节点数量多不代表不会被拦截。
- 控制接口密钥以明文保存在本机设置文件中。

#### 其他 Clash 客户端

只要客户端使用 mihomo 内核，并且能满足以下三点，就可以使用：

1. 开启外部控制器（`external-controller`），并设置密钥（`secret`）。
2. 有一个 `select` 类型的策略组，只供果到雷达使用。
3. 有一个 `listeners` 端口，`proxy` 指向这个策略组。

直接编辑 mihomo 配置文件时，可参考：

```yaml
external-controller: 127.0.0.1:9097
secret: "你的密钥"
proxy-providers:
  apw-airport1:
    type: http
    url: "机场订阅地址"
    interval: 86400
    path: ./providers/apw-airport1.yaml
    override:
      additional-prefix: "APW·机场1|"
proxy-groups:
  # 保留原有策略组，只在末尾追加这一个；原有使用 include-all 的组需加上 exclude-filter: "^APW·"
  - name: 果到雷达
    type: select
    proxies: [DIRECT]
    use: [apw-airport1]
listeners:
  - name: apple-store-monitor
    type: mixed
    port: 7899
    listen: 127.0.0.1
    proxy: 果到雷达
```

#### Clash 配置常见问题

| 检查线路或日志提示 | 原因与处理 |
| --- | --- |
| 无法连接 Clash 控制接口 | 外部控制器没有开启，或地址、端口与设置不一致。按第一步检查 |
| Clash 控制接口拒绝访问，请检查密钥 | 密钥填错，或 Clash 中修改了密钥 |
| Clash 中没有名为「果到雷达」的策略组 | 扩展脚本没有生效：确认写在「全局扩展脚本」而不是 Merge，已保存，并刷新了订阅 |
| 「果到雷达」的类型不是 select | 策略组类型需要是 `select`，程序才能切换节点 |
| 端口 7899 无法连接 / 无法连接 Clash 专用端口 | 脚本中的 `listeners` 没有生效，或端口被占用；确认脚本已保存，必要时换一个端口，并同步修改果到雷达中的「专用端口」 |
| 可用节点为 0，或某个机场没有节点 | 订阅地址填错，或该订阅在国内无法直接下载；到 Clash 的日志中查看订阅加载错误 |
| 电脑平时用的策略组里出现了 `APW·` 节点 | 使用了旧版配置或 Merge 写法，请按第二步改用本节的脚本 |

</details>

<a id="状态说明"></a>

<details>
<summary>库存状态与使用范围</summary>

**有货 / 无货**来自 Apple 本次明确返回的取货结论；「待开放取货」「暂无取货数据」「请求被拦截」等状态分别保留原意，不触发有货提醒。Apple 给出的「再查」日期也不是可取货承诺。

预计送货列只展示 Apple 实际返回的信息。本版没有增加三国收货地址或邮编送达时间查询，不能用送货信息推断门店库存。

本版提供监控、提醒和页面跳转，不开放上游仅适配中国大陆的自动结账。软件不预留库存、不自动付款。Mac 休眠、关机、断网或彻底退出 App 后，监控会停止。最终库存和购买结果以 Apple 官网为准。

### 怎样读每一条结果

监控列表中的「最后检查」表示这条监控最近一次完成查询的时间。活动日志按轮显示状态、门店编号、零件号与 Apple 原始说明，轮次结束后汇总耗时、请求次数和下次等待时间。

日志最多保留 300 行，供查看当前运行过程；它不是完整历史数据库。排查问题时，尽早复制相关轮次的内容，并保留出错前后的几行。

同一种状态使用相同颜色，不同业务状态使用独立配色；界面保留文字标签，便于直接辨认。

| 状态 | 颜色 | 含义 | 是否到货提醒 |
| --- | --- | --- | --- |
| 待查询 | 淡灰、虚线边框 | 尚未完成首次查询 | 否 |
| 有货 | 绿色 | Apple 返回 `available`，所选门店可取货 | 是，每轮确认有货都会提醒 |
| 无货 | 粉红色 | Apple 返回 `unavailable`，所选门店当前不可取货 | 否 |
| 不支持取货 | 石板灰 | Apple 返回 `ineligible`，当前商品或购买组合不适用取货服务，不能据此认定门店库存为零 | 否 |
| 暂未开售 | 蓝色 | `NOT_FOR_SALE` 且 Apple 文案明确说明尚未发售 | 否 |
| 即将发售 | 紫色 | Apple 返回 `COMING_SOON`，不代表已经可以下单 | 否 |
| 暂不可购买 | 金黄色 | `NOT_FOR_SALE`，但没有明确的尚未发售文案 | 否 |
| 未确认结果 | 橙色 | 根据原因显示「暂无取货数据」「未返回型号」「请求被拦截」「请求被限流」「查询失败」等，不能当作无货 | 否 |

取货、购买和配送是独立信息：购买状态 `OK` 不代表门店有货；配送日期也不是门店可取货日期。`SELL_IN_KIT_ONLY_RESTRICTION` 是购买限制字段，仅凭它不能判断门店库存或认定全部购买组合都不支持取货，请到官网核对完整配置。

有货以明确的取货结果为准，不会被送货说明覆盖。概览中的「不可取货」合计包括无货、不支持取货及尚不可购买的项目；「未确认」表示本轮没有可信结论。请结合逐项标签和日志查看具体原因。

### 为什么会有「未知」或未确认结果

查询失败和无货是两回事。请求被拦截、超时、限流、响应解析失败，以及 Apple 没有返回对应门店或型号的数据，都不能确认库存。程序会保留具体原因；遇到「暂无取货数据」或「未返回型号」时，请刷新当前国家的型号目录并核对官网是否仍销售该配置、是否已开放取货。

### 「待开放取货」与「暂停取货」

Apple 返回 `pickupDisplay: default` 时，界面可能显示「待开放取货」，并附上 Apple 建议的再查询日期。旧版记录中的「取货待公布」指的也是这类状态。它既不是有货，也不是明确无货，程序会继续查询，不触发到货提醒。

「暂停取货」表示 Apple 本次返回的门店取货服务不可用，不能自行推断为该型号库存售罄。日期、跨年区间和「几周后」等文案按 Apple 实际提供的信息显示，不把建议日期当作取货承诺。

「预计送货」未返回时会明确显示；它不是针对你填写的美国 ZIP code、加拿大邮编或阿联酋收货地址重新报价。本版没有这些地址查询功能。

</details>

## 设置与数据

美加阿版使用独立应用标识 **`com.suversal.apple-store-inventory-monitor.us`**。原来的 `US` 名称继续保留，用于兼容升级，不影响加拿大和阿联酋支持。

macOS 的设置目录是：

```text
~/Library/Application Support/apple-store-inventory-monitor-us/
```

在 Finder 按 `Shift + Command + G`，粘贴这个路径即可前往。

| 文件或目录 | 内容 |
| :--- | :--- |
| `settings.v2.json` | 监控目标、查询间隔、声音、默认与型号专属 Bark、页面跳转、到货后暂停和查询线路设置 |
| `catalog-cache/` | 从 Apple 在线刷新的门店和型号目录 |
| `chromium-profile-v1/` | 后台库存查询专用的浏览器资料与会话 |
| `chromium-profile-v1/browser-startup.log` | 最近一次查询浏览器启动诊断，用于排查启动失败 |

### 备份、换机与恢复

1. 从菜单栏完全退出 App，避免备份或恢复时软件正在写入。
2. 备份 `settings.v2.json`，妥善保管。恢复到另一台 Mac 时，先安装本版和 Chrome / Edge。
3. 退出新机器上的 App，把备份放回上述目录，再打开应用检查门店、型号和提醒设置。
4. 在新机器重新点击「测试提醒与跳转」，并检查 Clash 地址、端口和节点是否仍然适用。
5. 确认配置后点击「开始监控」。运行状态和实时库存结果不靠设置文件恢复。

无需迁移查询浏览器的整个资料目录。`catalog-cache/` 不在时会退回内置目录，需要时可以再次刷新。删除目录缓存不会删除监控项。

设置文件损坏或无法读取时，App 会给出提示；能够留档时会保存为 `settings.v2.json.corrupt-时间戳`。先保留原文件和留档，不要反复删除设置试错。

### 隐私与联网

Bark 地址和 Clash 控制接口密钥会以明文保存在本机设置中。设置文件、浏览器资料目录和代理订阅地址都不应上传到公开 Issue 或仓库。

后台查询使用独立 Chrome / Edge 资料，不读取日常浏览器的登录状态、Cookie 或浏览记录；也不要求登录 Apple 账户。App 正常退出时会停止自己启动的专属浏览器，保留自己的会话资料。

项目没有接入分析统计或崩溃上报。功能使用中会访问：

- Apple 官网，用于目录刷新、浏览器校验和取货库存查询。
- 你填写的 Bark 服务，用于测试和到货推送。
- 本机 Clash 控制接口与专用端口，仅在启用相应线路功能时使用；节点测速还会访问 `https://www.gstatic.com/generate_204`。
- GitHub，仅在打开项目、发布页或下载更新时使用。本版没有启用上游自动更新。

## 常见问题

<details>
<summary>找不到安装包，或下载后只有源代码</summary>

打开本仓库 [Releases](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases)，进入 `v1.0.28-us.1` 并展开 Assets，下载文件名含 `macOS-universal` 的 DMG。GitHub 的 `Code → Download ZIP` 和 `Source code` 都是源码。

不要下载上游的安装包覆盖本版。上游并不包含本版的美国、加拿大、阿联酋目录和独立配置适配。

</details>

<details>
<summary>macOS 提示 App 已损坏、无法验证开发者或无法打开</summary>

先按[首次打开的处理说明](#macos-打开问题)确认来源、校验文件，再到「系统设置 → 隐私与安全性」处理。本版为 ad-hoc 签名，没有 Developer ID 证书和 Apple 公证；签名检查通过也不等于已经公证。

升级前要从菜单栏退出旧版，替换「应用程序」里的同名 App，再从那里打开。只关窗口，旧进程仍可能运行，窗口里看到的版本也就不会变。

</details>

<details>
<summary>还是出现 HTTP 541 / 403 / 429</summary>

本轮查询没有拿到可信结果，先看[查询线路与 Clash](#查询线路与-clash)里的模式区别。系统代理和指定节点模式在下一轮重试；轮换模式会冷却被拒节点并尝试其他可用节点。

连续失败时：

1. 延长查询间隔，必要时暂停一段时间；不要连续快速启停。
2. 确认 Chrome / Edge 能访问目标国家的 Apple 官网。
3. 使用 Clash 时点「检查线路」，核对控制接口、密钥、专用端口、策略组与可用节点。
4. 多个节点可能共用出口 IP，节点多不等于一定不会拦截。必要时对照官网或尝试其他网络。

这次版本减少了重复请求、改进了会话与线路处理，但不能保证 Apple 持续接受请求。

</details>

<details>
<summary>显示「浏览器未连接」或「浏览器会话未能完成本次 Apple 查询」</summary>

这是查询会话没有建立，不能当成无货。按界面给出的具体原因处理：

| 提示 | 处理 |
| :--- | :--- |
| 未找到浏览器 | 将 Chrome 或 Edge 安装在 `/Applications`，手动打开一次再重试 |
| 专属资料目录被占用、目录锁或退出码 21 | 从菜单栏退出所有果到雷达实例，只重新打开一次；仍失败时重启电脑后再试 |
| 拒绝访问、权限不足 | 查看安全软件或管理员策略是否阻止浏览器启动、访问专属资料目录 |
| 会话立即退出或连接失败 | 更新受支持的浏览器，确认能访问 Apple 官网，再查看启动诊断日志 |

处理后点击「处理后重试」；已暂停时点击「开始监控」。启动日志在[设置目录](#设置与数据)的 `chromium-profile-v1/browser-startup.log`。退出码 21 也可能是权限或目录锁问题，不能只凭数字断定重复启动。

正常退出 App 会处理自己启动的专属浏览器，无需手动结束平时使用的 Chrome / Edge。不要一上来就清空整个浏览器资料目录。

</details>

<details>
<summary>官网有货，App 却显示无货或未确认</summary>

先核对国家、门店、容量、颜色和完整零件号。Apple 网页可能默认切换附近门店，也可能显示另一种配置；美国 `LL/A`、加拿大 `VC/A` 与阿联酋 `AH/A` 不能混用。

再看最后检查时间及日志中的原始取货说明。「未知」「未返回型号」「暂无取货数据」要先排查查询与目录问题；不要把这些状态当成无货。库存也可能在两次查询之间变化。

</details>

<details>
<summary>为什么一直提示「待开放取货」「未返回型号」或「暂无取货数据」</summary>

先刷新当前国家的型号目录，核对对应官网是否仍销售该配置、是否已经开放门店取货。新机已出现在目录，不代表取货接口已经开放；Apple 给出的再查询日期也不是承诺可取货日期。

如果官网和目录一致，保存门店编号、完整料号及相关日志再反馈，见[状态说明](#状态说明)。

</details>

<details>
<summary>测试提醒没有声音，或手机收不到 Bark</summary>

声音先看 App 的提示音开关、Mac 音量、静音状态和音频输出设备。Bark 先确认地址只包含服务器和设备 Key、手机允许通知，再查看活动日志里的失败原因。

配置了型号专属 Bark 时，测试会使用列表中第一个型号的地址，可能并非当前默认地址。重要警告、音量和持续响铃还受 Bark 与 iOS 权限影响。完整步骤见 [Bark 配置](#bark-配置)。

</details>

<details>
<summary>为什么每隔一轮又响一次、又打开网页</summary>

本版持续有货时会每轮提醒。只想收到一次，开启「到货后暂停监控」；只是不想弹网页，把「到货后打开」设为「不自动打开」。

</details>

<details>
<summary>为什么没有某个国家、品类、地址查询或自动结账</summary>

美加阿版当前开放美国、加拿大、阿联酋的 iPhone 门店取货监控。源码继承了部分上游组件，不代表这些组件已经在本版完成地区适配或对用户开放。

没有三国收货地址 / 邮编送达时间查询，也没有三国自动结账。查看上游文档时，请以本 README 的功能范围为准。

</details>

<details>
<summary>关闭窗口、锁屏、休眠之后还会监控吗</summary>

关闭窗口会收进 Mac 菜单栏，监控继续。只锁屏通常不会停止 App；进入睡眠、关机、断网或从菜单栏完全退出后不会继续查询。

长时间监控时接通电源，按需要调整系统睡眠设置。Bark 只接收通知，不是云端监控服务。

</details>

<details>
<summary>升级后设置会不会丢，为什么文件名还带 US</summary>

覆盖安装继续使用同一 Bundle ID 和 `apple-store-inventory-monitor-us` 目录，保留原监控、Bark、声音与间隔设置；`US` 文件名是兼容旧版的标识。升级前可按[备份说明](#备份换机与恢复)保存设置。

本版配置与上游原版独立，不会自动合并两边的监控列表，也不会在多台 Mac 之间自动同步。

</details>

<details>
<summary>如何更新到下一版</summary>

本版从 [yuanruoyu515 的 Releases](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases)手动下载。完全退出旧版，打开新的通用 DMG，把 App 拖到 Applications 并替换，然后重新打开、测试提醒和开始监控。

上游的应用内自动下载安装没有在本版启用，避免升级时覆盖三国适配。发布页的源码标签、Actions 记录和公开安装包也要分开看；当前可下载内容以正式 Release 的 Assets 为准。

</details>

## 开源与开发

使用 **Rust、Tauri 2、React 与 TypeScript** 构建。查询使用应用专属的 Chrome / Edge 资料目录，不读取日常浏览器的登录状态或浏览记录。修改版保留独立应用标识和配置目录，并通过自己的 GitHub Releases 手动更新。

<details>
<summary>维护版图标与资源生成</summary>

v1.0.28 起，应用使用左上角白色弧形角标与蓝色地球标识，方便与原版区分。App、菜单栏、界面、DMG 和项目首页采用同一套图标。

图标母版位于 `assets/icon.png`。修改母版后运行：

```sh
pnpm generate:icons
```

脚本通过 Tauri 图标工具生成桌面 PNG、ICNS、ICO，并同步 `public/icon.png`，供界面与网页图标使用。DMG 卷图标使用同一份 ICNS；安装背景的可编辑源文件为 `scripts/dmg-background.svg`，配套 PNG 为 `720 × 440`。

</details>

<details>
<summary>从源码构建</summary>

<a id="从源码构建"></a>

需要 Rust 1.90+、Node.js 24、pnpm 和 Xcode Command Line Tools。

```sh
git clone --branch us-edition https://github.com/yuanruoyu515/apple-store-inventory-monitor.git
cd apple-store-inventory-monitor
pnpm install --frozen-lockfile
pnpm generate:regions
pnpm test
cargo test --workspace
pnpm tauri build --bundles app
```

App 输出到 `target/release/bundle/macos/Apple Store Inventory Monitor US.app`。

### 开发运行与检查

工具链按本仓库的发布配置准备：Rust 1.90+、Node.js 24、pnpm 9，以及 Xcode Command Line Tools。没有命令行工具时先执行：

```sh
xcode-select --install
```

完成安装依赖和目录生成后，启动桌面开发版：

```sh
pnpm tauri dev
```

`pnpm dev` 只启动前端页面，普通浏览器无法调用 Tauri 命令，不能用它验证真实库存查询。桌面开发版同样需要安装 Chrome / Edge。

在仓库根目录运行与修改对应的检查：

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
pnpm build
pnpm test
```

默认测试不访问 Apple。三国真实取货回归是单独的忽略测试，需要本机浏览器和网络，会依次检查美国、加拿大、阿联酋，再切回美国：

```sh
cargo test -p apple-store-inventory-monitor international_live_pickup -- --ignored --nocapture
```

该测试只读查询库存，不会创建订单；真实状态和风控可能变化，单次通过不能保证持续可用。

### 开发排障

`failed to run cargo metadata` 时先运行 `cargo --version`，确认终端能找到 Rust。使用默认 rustup 安装位置时，可以先载入环境：

```sh
source "$HOME/.cargo/env"
pnpm tauri dev
```

Cargo 能运行时，继续看错误中的 manifest、依赖和工具链提示，不要把所有 metadata 错误都当成未安装 Rust。

源码目录改名后，如果构建仍读取旧目录的 Tauri permissions 文件，先检查 `CARGO_TARGET_DIR` 和 `.cargo/config.toml` 是否指向共享目录，再决定是否清理缓存：

```sh
cargo clean
pnpm tauri dev
```

`cargo clean` 会删除实际目标目录的构建缓存；共用 target 的项目也会受影响，但不会删除源码或用户设置。

### 双架构与通用 DMG

单独构建某个架构前安装对应 Rust 目标，然后执行：

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --bundles app --target aarch64-apple-darwin
pnpm tauri build --bundles app --target x86_64-apple-darwin
```

分别保留两个 App 包，确认资源和版本一致、签名有效，再交给通用 DMG 脚本。脚本需要 macOS 命令行工具和 `dmgbuild==1.6.7`；会检查输入架构与资源、合并 Mach-O、重新签名，并验证挂载后的 App 和 Applications 链接。

发布流水线匹配 `v*-us.*` 标签。两个架构构建成功后，统一生成通用 DMG、对应源码和校验文件，再发布完整 Release；手动运行工作流只生成构建产物。维护者应同步 `package.json`、Cargo 与 Tauri 版本，核对地区数据和本版发布说明。

发布时分别构建并校验 Apple Silicon 与 Intel 应用，再用 [通用 DMG 打包脚本](scripts/package-universal-dmg.py) 合并为通用 App，写入 Applications 快捷图标与 Finder 布局。完整构建步骤见 [发布工作流](.github/workflows/release.yml)。

</details>

<a id="验证与数据维护"></a>

<details>
<summary>版本验证与数据维护</summary>

v1.0.28 的 Apple Silicon 与 Intel 构建各通过 342 项 Rust 测试，74 项前端测试与 Clippy 检查通过；真实 App 查询已验证美国、加拿大、阿联酋。通用 DMG 的双架构、应用签名、App / 卷图标和 Applications 链接均已核对。

v1.0.27 发布前，342 项 Rust 测试分别在 Apple Silicon 和 Intel（Rosetta）运行通过，74 项前端测试通过。真实 Chromium 查询已验证美国、加拿大、阿联酋，以及跨地区会话切换。通用 App 包含 `arm64` 与 `x86_64`，DMG 挂载后的签名和 Applications 链接也经过检查。

数据生成使用已提交的快照，不要求构建时访问 Apple。`pnpm generate:regions` 生成三国目录；维护者可用 `pnpm refresh:ca`、`pnpm refresh:ae` 与 `scripts/refresh-us-stores.mjs` 核对相应官方数据。

[更新记录](CHANGELOG.md) / [完整 Release](https://github.com/yuanruoyu515/apple-store-inventory-monitor/releases)

### 目录维护命令

| 操作 | 命令 |
| :--- | :--- |
| 从已提交快照生成三国目录 | `pnpm generate:regions` |
| 只生成一个国家 | `pnpm generate:us` / `pnpm generate:ca` / `pnpm generate:ae` |
| 从官网重新核对加拿大快照 | `pnpm refresh:ca` |
| 从官网重新核对阿联酋快照 | `pnpm refresh:ae` |
| 核对美国门店地址与 ZIP code | `node scripts/refresh-us-stores.mjs` |

刷新原始快照后先检查 diff，再生成数据、运行相关测试并做真实取货回归。地区料号从对应国家官方数据解析，不能靠替换 `LL/A`、`VC/A`、`AH/A` 后缀生成。

### 代码入口

```text
crates/apw-core/src/
  apple.rs                 HTTP 错误分类与库存响应解析
  apple_catalog.rs         Apple 购买页型号解析
  catalog.rs               内置目录、在线刷新与本地缓存
  config.rs                设置保存、规范化与损坏留档
  model.rs                 地区、商品、门店与库存模型
  notify.rs                Bark 与提示音
  watcher.rs               轮次调度、分组查询与事件

src-tauri/src/
  chromium_fetcher.rs      持久浏览器会话、三国接口与真实取货查询
  browser_support.rs       查询浏览器查找与启动诊断
  clash.rs                 Clash 控制接口、测速与节点切换
  route_pool.rs            线路选择与冷却
  lib.rs                   三国命令入口、托盘、提醒与手动更新限制

src/
  App.tsx                  主界面与三国监控入口
  components/              多选、Bark 与查询线路等组件
  lib/store.ts             前端状态、事件与日志
  lib/monitorLog.ts         库存状态、日期和故障说明

scripts/                   地区数据维护与通用 DMG 打包
.github/workflows/         检查和发布工作流
```

库存结论由 Rust 核心依据 Apple 响应判断，前端负责展示，不根据空响应或日志文字自行推断无货。上游保留在源码中的其他功能，不代表已在美加阿版开放。

</details>

<a id="来源与反馈"></a>

## 维护与来源

<a id="反馈问题"></a>

修改版维护：[GitHub @yuanruoyu515](https://github.com/yuanruoyu515) / [Threads @realtimyry](https://www.threads.com/@realtimyry)。反馈请附 App 版本、Mac 芯片、国家、门店编号、型号与相关日志，隐去 BarkKey 和个人信息。

问题请提交到[本版 Issues](https://github.com/yuanruoyu515/apple-store-inventory-monitor/issues)。下面的信息可以直接复制后填写：

```text
App 版本：
macOS 版本与芯片：
国家、城市、门店名及编号：
iPhone 型号、容量、颜色与完整料号：
查询线路：跟随系统代理 / 指定节点 / Clash 节点轮换
发生时间与复现步骤：
活动日志中的完整错误：
对应国家官网的核对结果：
```

库存随时变化，单张有货或无货截图通常不足以定位问题。提交前删除 Bark 地址与设备 Key、Clash 密钥和订阅链接、完整个人路径等隐私信息；不要直接上传设置文件或浏览器资料目录。

Bark、Clash 与部分操作、排错说明沿用并适配上游文档，本版差异以本页为准。`README_UPSTREAM.md` 保留上游原文，涉及其他平台、品类、地区或自动结账的章节不表示本版提供这些功能。

本项目基于 [suversal/apple-store-inventory-monitor](https://github.com/suversal/apple-store-inventory-monitor) 修改，更早来源包括 [ENCHIGO/apple-pickup-watcher](https://github.com/ENCHIGO/apple-pickup-watcher) 与 [hteen/apple-store-helper](https://github.com/hteen/apple-store-helper)。感谢原作者与贡献者。上游文档保存在 [README_UPSTREAM.md](README_UPSTREAM.md)。

继续按 **[GPL-3.0-or-later](LICENSE)** 发布，保留原作者署名、许可和 [修改声明](NOTICE)。本项目不是 Apple 官方软件，与 Apple Inc. 没有隶属或授权关系。
