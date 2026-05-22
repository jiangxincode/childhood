<p align="center">
  <img src="images/logo.svg" alt="childhood logo" width="400">
</p>

<h1 align="center">童年游戏合集</h1>

<p align="center">
  <a href="http://www.apache.org/licenses/LICENSE-2.0"><img src="https://img.shields.io/badge/license-Apache%202.0-green" alt="License"></a>
  <a href="https://github.com/jiangxincode/childhood/actions/workflows/childhood.yml"><img src="https://github.com/jiangxincode/childhood/actions/workflows/childhood.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/jiangxincode/childhood/actions/workflows/codeql-analysis.yml"><img src="https://github.com/jiangxincode/childhood/actions/workflows/codeql-analysis.yml/badge.svg" alt="CodeQL"></a>
  <a href="https://jiangxincode.github.io/childhood/"><img src="https://img.shields.io/badge/GitHub%20Pages-live-brightgreen" alt="GitHub Pages"></a>
  <a href="https://sonarcloud.io/dashboard?id=jiangxincode_childhood"><img src="https://sonarcloud.io/api/project_badges/measure?project=jiangxincode_childhood&metric=alert_status" alt="Quality Gate Status"></a>
</p>

一个纯前端经典游戏合集，收录了 **23 款**童年桌游与卡牌游戏，零框架、零构建，开箱即玩。

**[在线体验](https://jiangxincode.github.io/childhood/)**

## 卡牌游戏

![经典童年卡牌对战](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/经典同童年卡牌对战.jpg)

| 刀杀鸡 | 龙虎斗 | 兽棋 |
|:------:|:------:|:----:|
| ![刀杀鸡](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/card-game/刀杀鸡.jpg) | ![龙虎斗](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/card-game/龙虎斗.jpg) | ![兽棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/card-game/兽旗.jpg) |

| 军师旅团营 | 猫捉老鼠 | 小皇帝 |
|:-------------:|:-------:|:------:|
| ![军师旅团营](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/card-game/军师旅团营.jpg) | ![猫捉老鼠](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/card-game/猫捉老鼠.jpg) | ![小皇帝](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/card-game/小皇帝.jpg) |

## 经典棋盘游戏

![经典棋盘游戏](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/策略棋盘博弈.jpg)

| 中国象棋 | 国际象棋 | 军棋（棋盘版） |
|:-------:|:-------:|:------------:|
| ![中国象棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/象棋.jpg) | ![国际象棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/国际象棋.jpg) | ![军棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/军棋.jpg) |

| 五子棋 | 黑白棋 | 国际跳棋 |
|:-----:|:-----:|:-------:|
| ![五子棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/五子棋.jpg) | ![黑白棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/黑白棋.jpg) | ![国际跳棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/国际跳棋.jpg) |

| 井字棋 | 中国跳棋 | 围棋 |
|:-----:|:-------:|:---:|
| ![井字棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/井字棋.jpg) | ![中国跳棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/中国跳棋.jpg) | ![围棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/board-game/围棋.jpg) |

## 欢乐骰子游戏

| 飞行棋 |
|:-----:|
| ![飞行棋](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/dice-game/飞行棋.jpg) |

## 童年棋盘游戏

| 狼吃羊 | 憋茅坑 | 小猫钓鱼 | 钻牛角尖 | 摆四龙 | 蚂蚁搬家 |
|:-----:|:-----:|:-------:|:-------:|:------:|:------:|
| ![狼吃羊](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/childhood-board-game/狼吃羊.jpg) | ![憋茅坑](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/childhood-board-game/憋茅坑.jpg) | ![小猫钓鱼](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/childhood-board-game/小猫钓鱼.jpg) | ![钻牛角尖](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/childhood-board-game/钻牛角尖.jpg) | ![摆四龙](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/childhood-board-game/摆四龙.jpg) | ![蚂蚁搬家](https://raw.githubusercontent.com/wiki/jiangxincode/childhood/snapshots/childhood-board-game/蚂蚁搬家.jpg) |

## 项目结构

```
childhood/
├── apps/
│   ├── card-game/                    # 童年经典卡牌游戏
│   │   ├── knife-kills-chicken/      # 刀杀鸡
│   │   ├── dragon-tiger-fight/       # 龙虎斗
│   │   ├── animal-chess/             # 兽棋
│   │   ├── chinese-army-chess/       # 军师旅团营
│   │   ├── cat-and-mouse/            # 猫捉老鼠
│   │   └── little-emperor/           # 小皇帝
│   ├── board-game/                   # 经典棋盘游戏
│   │   ├── chinese-chess/            # 中国象棋
│   │   ├── international-chess/      # 国际象棋
│   │   ├── chinese-army-chess/       # 军棋（棋盘版）
│   │   ├── gomoku/                   # 五子棋
│   │   ├── reversi/                  # 黑白棋
│   │   ├── checkers/                 # 国际跳棋
│   │   ├── tic-tac-toe/              # 井字棋
│   │   ├── chinese-checkers/         # 中国跳棋
│   │   └── go/                       # 围棋
│   ├── dice-game/                    # 欢乐骰子游戏
│   │   └── flying-chess/             # 飞行棋
│   ├── childhood-board-game/         # 童年棋盘游戏
│   │   ├── lang-chi-yang/            # 狼吃羊
│   │   ├── bie-mao-keng/             # 憋茅坑
│   │   ├── xiao-mao-diao-yu/         # 小猫钓鱼
│   │   ├── zuan-niu-jiao-jian/       # 钻牛角尖
│   │   ├── bai-si-long/              # 摆四龙
│   │   └── ma-yi-ban-jia/            # 蚂蚁搬家
│   └── common/                       # 共享模块
│       ├── card-game-core.js         # 卡牌游戏核心逻辑
│       └── game-utils.js             # 游戏工具函数
├── js/                               # 全局 JavaScript
├── css/                              # 全局样式
├── images/                           # 图片资源
├── index.html                        # 入口页面
└── package.json                      # 项目配置
```

## 快速开始

```bash
# 克隆项目
git clone https://github.com/jiangxincode/childhood.git
cd childhood

# 安装依赖
npm install

# 直接用浏览器打开即可
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

## 运行测试

```bash
# 执行全部测试
npm test

# 监听模式
npm run test:watch
```

## 交流群

欢迎加入QQ交流群，一起讨论游戏玩法、反馈问题或分享童年回忆：

<img src="https://raw.githubusercontent.com/wiki/jiangxincode/childhood/qrcode_1778427076704.jpg" alt="QQ交流群" width="200">

## 许可证

[Apache License 2.0](LICENSE)
