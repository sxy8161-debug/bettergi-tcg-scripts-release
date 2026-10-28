[我不是牌神]

# 七圣召唤全自动打牌（实时计算临场变招）

六套七圣召唤PVE牌组，自动完成换牌、选人、重投、出牌、元素调和、技能、角色接力和回合推进。

当前版本 **2.0.16**。在启动配置中选择牌手，每次运行处理一局。

## 牌手特色、牌表与分享码

| 牌手 | 特色 | 牌表 | 分享码 | 攻略与来源 |
| --- | --- | --- | --- | --- |
| 雷柯刻 | 充能连爆 | [查看](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#raiden) | [复制](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#share-raiden) | [来源说明](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#attribution) |
| 伊嘉早 | 全能速通 | [查看](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#iansan) | [复制](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#share-iansan) | [派大星攻略](https://news.17173.com/content/02262026/233102589.shtml) |
| 月绽放 | 赚骰爆发 | [查看](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#moonbloom) | [复制](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#share-moonbloom) | [派大星攻略](https://www.miyoushe.com/ys/article/78355185) |
| 莫早卢 | 扩散清场 | [查看](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#mozailu) | [复制](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#share-mozailu) | [派大星攻略](https://www.miyoushe.com/ys/article/62002873) |
| 爱林水 | 反应快攻 | [查看](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#ailin) | [复制](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#share-ailin) | [派大星攻略](https://www.miyoushe.com/ys/article/73568256) |
| 圣骸兽 | 对单核爆 | [查看](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#consecrated) | [复制](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#share-consecrated) | [派大星攻略](https://www.miyoushe.com/ys/article/73568256) |

## 本次更新

- 修复敌方元素图标被误读成额外角色血量，导致牌桌长时间无法继续的问题。
- 修复结束回合后阶段图标延迟变化引起的重复操作与按钮识别报错。
- 改进手牌身份接续，减少切人、技能和出牌后的整手重读、展开收起与重复标题补读；圣骸兽保留旧牌身份时单独读取当前费用。
- 月绽放优先检视可能解锁付款的困困减费与核费用，改善赚骰、打核及后续输出衔接；修正倒计时与科研返骰的确认记账。
- 月绽放改进盈满之实的折叠牌面识别，减少已有图库仍反复补读标题的情况。
- 圣骸兽优化蓄块、清洁增伤与爆发取舍，受压且已经有更强爆发时及时兑现伤害；外来牌按已识别的当前费用参与能量块弃牌排序。
- 莫早卢修正早柚准备踢记账，兼顾装备与续攻资金，并减少无收益的重复费用检视。
- 爱林水优化起手接力、付款费用与装备准备，没有后续攻击时不再裸上角斗士。

## 使用

1. 从上表复制分享码导入牌组，按牌表核对角色从左到右的顺序。
2. 在配置的「使用牌手」中选择对应牌手，手动进入挑战，停在初始手牌、首次选人或首次掷骰页面。
3. 启动脚本，胜负后本次运行结束；下一局由你手动进入。

使用 **BetterGI 0.66.0 或更新版本、简体中文**；支持 **1920×1080、2560×1440、2560×1600**。需要比较高的画质，**渲染精度至少 0.8，建议 1.0 或更高**。

手动安装：下载下方 **「自动牌手v2.0.16.zip」**，将其中的 `TCGPlayerSuite` 文件夹解压到 BetterGI 的 `User/JsScript/`。

## 遇到问题时

请提供**本局日志及问题发生时的完整截图**，方便定位问题，并附上启动摘要和对局摘要。可到[发布仓库 Issues](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/issues)反馈。

## 使用说明、来源与署名

| 资料 | 链接 |
| --- | --- |
| 完整使用说明 | [查看 README](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md) |
| 攻略来源、作者署名与许可 | [查看来源与许可](https://github.com/sxy8161-debug/bettergi-tcg-scripts-release/blob/release/README.md#attribution) |
| 源码 | [查看源码仓库](https://github.com/sxy8161-debug/bettergi-tcg-scripts) |
