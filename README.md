# [我不是牌神]七圣召唤自动牌手

BetterGI 七圣召唤 PVE 全自动牌手，提供雷神柯莱刻晴、伊安珊嘉明早柚、月绽放、莫娜早柚迪卢克四套牌组。自动完成起手换牌、选人、重投骰子、出牌、元素调和、技能、切换和回合推进，角色阵亡后由存活角色继续接力。

- **雷柯刻**：雷电将军爆发补能，柯莱挂草激化，刻晴用雷楔返场、附魔普攻和爆发穿透衔接输出，支持新手版与完全版牌组。
- **伊嘉早**：伊安珊挂雷与增伤，嘉明负责火伤、超载和返场追击，早柚利用扩散与爆发兼顾多目标输出和治疗。
- **月绽放**：菈乌玛、哥伦比娅衔接草水反应与召唤物，奈芙尔使用诳言之核输出，结合减费、返骰、充能和生成牌选择安排行动。
- **莫早卢**：莫娜先挂水并快速交接，早柚留场扩散、准备攻击与爆发处理多目标，迪卢克利用蒸发、连续战技和爆发接力收尾；结合伙伴检索、装备减费、返骰与过牌增加行动机会。

合集／共享层版本：**1.6.9**。脚本版本：雷柯刻、伊嘉早、月绽放 **1.4.7**；莫早卢 **1.1.5**。

每套脚本包仅含9个文件，保留完整牌面与界面识别模板。四套牌手均可独立使用，使用说明、牌表、分享码及来源许可集中在各自的 README 中。

## 本次更新

- 修复最后一张牌使用或调和后，界面提示文字可能被误当成卡牌详情、导致空手数量核对失败的问题。
- 四套牌手按当前画面的实际展开／折叠状态读取手牌，改善抽牌或生成牌后视图变化导致的数量读取失败。
- 改善莫早卢使用幻戏倒计时后抽回同名牌时的动作确认，结合实际付款和万能骰变化核对结果。
- 莫早卢更完整地比较低费装备、老旧的庭园及武器减费后的攻击路线；发育期后，避免付费过牌花掉最后一轮可支付攻击的资金。
- 保留不依赖桌布背景颜色的空手判断、局部未知牌标题补读，以及蒂玛乌斯、迪娜泽黛起手识别和幻戏倒计时阶段核对；读不到费用数字不会直接当作没有手牌。

## 使用

使用 BetterGI 0.66.0 或更新版本、简体中文界面，支持1920×1080、2560×1440和2560×1600游戏客户区。开局前设置好分辨率，整局保持不变；切换后先重启 BetterGI 捕获器再启动牌手。

**画质要求：本脚本依赖画面识别，需要比较高的游戏画质。目前已知渲染精度至少需要设为 0.8，建议使用 1.0 或更高。** 低画质或过低的渲染精度可能导致手牌、费用图标、角色能量等识别失败。0.8 是目前已知的最低要求，不代表所有设备与画质组合下都能稳定识别。

在 BetterGI 的脚本仓库设置中选择自定义源，填写发布仓库地址：

```text
https://github.com/sxy8161-debug/bettergi-tcg-scripts-release
```

更新仓库后订阅所需牌手，按照对应 README 的角色顺序、牌表与启动步骤使用。每套均可独立运行，不需要安装其他牌手。

也可从 [Releases](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/releases) 下载单套脚本包，解压到 BetterGI 的 `User/JsScript/`；整仓库压缩包包含索引与各套牌手。

## 使用说明、牌表与分享码

- [雷神柯莱刻晴](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/repo/js/RaidenColleiKeqingPlayer/README.md)
- [伊安珊嘉明早柚](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/repo/js/IansanGamingSayuPlayer/README.md)
- [月绽放](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/repo/js/MoonbloomPlayer/README.md)
- [莫娜早柚迪卢克](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/repo/js/MonaSayuDilucPlayer/README.md)

作者：巨鲸也是咸鱼。代码与素材来源、完整许可证见各牌手 README 末尾的对应章节。

[源码仓库](https://github.com/sxy8161-debug/bettergi-tcg-scripts) · [发布文件](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/tree/release)
