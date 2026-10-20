# [我不是牌神]七圣召唤自动牌手

BetterGI 七圣召唤 PVE 全自动牌手，提供雷神柯莱刻晴、伊安珊嘉明早柚、月绽放、莫娜早柚迪卢克四套牌组。自动完成起手换牌、选人、重投骰子、出牌、元素调和、技能、切换和回合推进，角色阵亡后由存活角色继续接力。

- **雷柯刻**：雷电将军爆发补能，柯莱挂草激化，刻晴用雷楔返场、附魔普攻和爆发穿透衔接输出，支持新手版与完全版牌组。
- **伊嘉早**：伊安珊挂雷与增伤，嘉明负责火伤、超载和返场追击，早柚利用扩散与爆发兼顾多目标输出和治疗。
- **月绽放**：菈乌玛、哥伦比娅衔接草水反应与召唤物，奈芙尔使用诳言之核输出，结合减费、返骰、充能和生成牌选择安排行动。
- **莫早卢**：莫娜先挂水并快速交接，早柚留场扩散、准备攻击与爆发处理多目标，迪卢克利用蒸发、连续战技和爆发接力收尾；结合伙伴检索、装备减费、返骰与过牌增加行动机会。

合集／共享层版本：**1.7.0**。脚本版本：雷柯刻、伊嘉早、月绽放 **1.4.8**；莫早卢 **1.1.6**。

每套脚本包仅含9个文件，保留完整牌面与界面识别模板。四套牌手均可独立使用，使用说明、牌表、分享码及来源许可集中在各自的 README 中。

## 本次更新

- 修复技能详情已经打开、却因名称旁的界面图标被识别成额外字母而停止的问题。
- 四套牌手支持技能名称模糊匹配，容忍少量错字、漏字及多字；短名称最多一个字符差异，五字及以上名称最多两个字符差异，多个技能同样接近时不猜测。
- 保留当前角色、技能类别、阶段、连续画面和实际费用核对，以及技能施放后的结果确认；本次并未取消所有 OCR，特技与角色专有机制保持独立。
- 保留已有的空手判断、手牌展开／折叠识别和各牌组策略改进。

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
