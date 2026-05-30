# 童年游戏合集 - 音效需求清单

## 项目概述

本项目共 **23 款游戏**，需要 **20 个独立音效文件**即可覆盖全部游戏。

## 实施状态

| 状态 | 说明 |
|------|------|
| ✅ | 已完成 |
| ⏳ | 进行中 |
| ❌ | 未开始 |

### 已完成

- ✅ 音效文件目录结构创建 (`apps/audio/`)
- ✅ 音效管理模块 (`apps/common/sound-manager.js`)
- ✅ 飞行棋音效迁移 (`apps/audio/dice/`)
- ✅ 龙虎斗音效集成
- ✅ 中国象棋音效集成
- ✅ 所有游戏 HTML 添加 sound-manager.js 引用

---

## 一、游戏分类统计

| 类别 | 数量 | 游戏列表 |
|------|------|----------|
| **卡牌翻牌类** | 6 | 龙虎斗、刀杀鸡、兽棋、猫捉老鼠、军师旅团营、小皇帝 |
| **经典棋盘类** | 9 | 中国象棋、国际象棋、五子棋、围棋、黑白棋、国际跳棋、井字棋、中国跳棋、军棋 |
| **童年棋盘类** | 7 | 狼吃羊、憋茅坑、小猫钓鱼、钻牛角尖、摆四龙、蚂蚁搬家、四步钉 |
| **骰子类** | 1 | 飞行棋（已有音效） |

---

## 二、通用音效（所有游戏共享）

| 序号 | 音效名称 | 英文关键词 | 时长要求 | 格式 | 说明 |
|------|----------|-----------|----------|------|------|
| 1 | **胜利音效** | victory, win, cheer | 1.5-2.5s | MP3 | 游戏胜利时播放 |
| 2 | **失败音效** | lose, fail, game over | 1.5-2.5s | MP3 | 游戏失败时播放 |
| 3 | **平局音效** | draw, tie | 1-2s | MP3 | 平局时播放 |
| 4 | **按钮点击** | button click, ui click | 0.1-0.3s | MP3 | 点击按钮时播放 |
| 5 | **错误提示** | error, invalid | 0.3-0.5s | MP3 | 无效操作时播放 |

---

## 三、卡牌翻牌类音效（6款游戏共享）

| 序号 | 音效名称 | 英文关键词 | 时长要求 | 说明 |
|------|----------|-----------|----------|------|
| 6 | **翻牌** | card flip, card reveal | 0.2-0.4s | 翻开背面牌时播放 |
| 7 | **吃子/攻击** | capture, attack, hit | 0.3-0.6s | 吃掉对方棋子时播放 |
| 8 | **同归于尽** | mutual destruction, both die | 0.5-0.8s | 同级相吃双双消失时播放 |
| 9 | **移动** | move, slide | 0.2-0.3s | 棋子移动时播放 |

**适用游戏**：
- 龙虎斗 (dragon-tiger-fight)
- 刀杀鸡 (knife-kills-chicken)
- 兽棋 (animal-chess)
- 猫捉老鼠 (cat-and-mouse)
- 军师旅团营 (chinese-army-chess)
- 小皇帝 (little-emperor)

---

## 四、棋盘类音效（16款游戏共享）

| 序号 | 音效名称 | 英文关键词 | 时长要求 | 说明 |
|------|----------|-----------|----------|------|
| 10 | **落子** | place piece, drop stone | 0.2-0.4s | 放置棋子时播放（五子棋、围棋等） |
| 11 | **吃子** | capture, take | 0.3-0.5s | 吃掉对方棋子时播放 |
| 12 | **移动** | move, slide | 0.2-0.3s | 移动棋子时播放 |
| 13 | **提子** | remove, lift | 0.2-0.4s | 提走棋子时播放（围棋） |

**适用游戏**：
- 中国象棋 (chinese-chess)
- 国际象棋 (international-chess)
- 五子棋 (gomoku)
- 围棋 (go)
- 黑白棋 (reversi)
- 国际跳棋 (checkers)
- 井字棋 (tic-tac-toe)
- 中国跳棋 (chinese-checkers)
- 军棋 (chinese-army-chess)
- 狼吃羊 (lang-chi-yang)
- 憋茅坑 (bie-mao-keng)
- 小猫钓鱼 (xiao-mao-diao-yu)
- 钻牛角尖 (zuan-niu-jiao-jian)
- 摆四龙 (bai-si-long)
- 蚂蚁搬家 (ma-yi-ban-jia)
- 四步钉 (si-bu-ding)

---

## 五、特殊游戏专用音效

| 序号 | 音效名称 | 英文关键词 | 时长要求 | 适用游戏 |
|------|----------|-----------|----------|----------|
| 14 | **掷骰子** | dice roll, shake dice | 0.5-1s | 飞行棋（已有） |
| 15 | **跳棋跳跃** | jump, hop | 0.2-0.4s | 中国跳棋 |
| 16 | **憋茅坑堵路** | block, trap | 0.3-0.5s | 憋茅坑 |
| 17 | **钓鱼** | fishing, catch | 0.4-0.6s | 小猫钓鱼 |
| 18 | **蚂蚁搬家** | ant move, carry | 0.3-0.5s | 蚂蚁搬家 |
| 19 | **狼叫** | wolf howl | 0.5-1s | 狼吃羊（可选） |
| 20 | **羊叫** | sheep bleat | 0.3-0.5s | 狼吃羊（可选） |

---

## 六、音效文件规格要求

| 规格 | 要求 |
|------|------|
| **格式** | MP3（首选）或 OGG |
| **采样率** | 44.1 kHz 或 48 kHz |
| **比特率** | 128-192 kbps |
| **声道** | 单声道或立体声均可 |
| **音量** | 统一标准化（-14 LUFS 左右） |
| **文件大小** | 短音效 < 100KB，长音效 < 300KB |

---

## 七、音效数量汇总

| 类别 | 数量 | 说明 |
|------|------|------|
| **通用音效** | 5 | 所有游戏共享 |
| **卡牌类音效** | 4 | 6款卡牌游戏共享 |
| **棋盘类音效** | 4 | 16款棋盘游戏共享 |
| **特殊音效** | 7 | 部分游戏专用（含飞行棋已有） |
| **总计** | **20** | 去重后独立音效文件 |

---

## 八、音效优先级

| 优先级 | 音效 | 原因 |
|--------|------|------|
| **P0（必须）** | 翻牌、落子、吃子、胜利、失败 | 核心游戏体验 |
| **P1（重要）** | 移动、同归于尽、按钮点击 | 提升交互反馈 |
| **P2（可选）** | 狼叫、羊叫、钓鱼等 | 增强氛围 |

---

## 九、推荐获取顺序

1. **第一步**：获取 5 个通用音效（可复用于所有游戏）
2. **第二步**：获取 4 个卡牌类音效（覆盖 6 款游戏）
3. **第三步**：获取 4 个棋盘类音效（覆盖 16 款游戏）
4. **第四步**：获取 7 个特殊音效（按需添加）

---

## 十、音效获取资源

### 免费音效网站

| 网站 | 网址 | 许可证 |
|------|------|--------|
| Freesound | https://freesound.org | CC0/CC-BY |
| Pixabay | https://pixabay.com/music | Pixabay License |
| Mixkit | https://mixkit.co/free-sound-effects | 免费商用 |
| Kenney | https://kenney.nl | CC0 |

### 搜索关键词示例

```
翻牌：card flip, card reveal, card sound
落子：place piece, drop stone, click
吃子：capture, attack, hit, take
移动：move, slide, step
胜利：victory, win, cheer, fanfare
失败：lose, fail, game over
```

---

## 十一、文件命名规范

建议统一命名格式：`{动作}_{对象}.mp3`

示例：
```
通用音效：
- victory.mp3
- lose.mp3
- draw.mp3
- click.mp3
- error.mp3

卡牌类：
- flip_card.mp3
- capture.mp3
- mutual_destruction.mp3
- move.mp3

棋盘类：
- place_piece.mp3
- take_piece.mp3
- move_piece.mp3
- remove_piece.mp3

特殊类：
- dice_roll.mp3
- jump.mp3
- block.mp3
- fishing.mp3
- ant_carry.mp3
- wolf_howl.mp3
- sheep_bleat.mp3
```

---

## 十二、技术实现参考

### 实际目录结构

```
apps/
├── audio/                    # 统一音效目录
│   ├── common/               # 通用音效（所有游戏共享）
│   │   ├── victory.mp3
│   │   ├── lose.mp3
│   │   ├── draw.mp3
│   │   ├── click.mp3
│   │   └── error.mp3
│   ├── card/                 # 卡牌类音效（6款游戏共享）
│   │   ├── flip.mp3
│   │   ├── capture.mp3
│   │   ├── destroy.mp3
│   │   └── move.mp3
│   ├── board/                # 棋盘类音效（16款游戏共享）
│   │   ├── place.mp3
│   │   ├── take.mp3
│   │   ├── slide.mp3
│   │   └── remove.mp3
│   ├── dice/                 # 骰子类音效（飞行棋专用）
│   │   ├── roll.ogg
│   │   ├── fly.ogg
│   │   ├── jump.ogg
│   │   ├── move.ogg
│   │   ├── fall.ogg
│   │   ├── up.ogg
│   │   ├── triple_six.ogg
│   │   ├── six.ogg
│   │   ├── win.ogg
│   │   └── home.ogg
│   └── special/              # 特殊音效（部分游戏专用）
│       ├── wolf.mp3
│       ├── sheep.mp3
│       ├── block.mp3
│       ├── fishing.mp3
│       └── carry.mp3
├── common/
│   └── sound-manager.js      # 音效管理模块
└── [game-folders]/
    └── game.js               # 各游戏逻辑（已集成音效）
```

### 音效管理模块使用说明

**文件位置**: `apps/common/sound-manager.js`

**初始化**:
```javascript
// 在游戏 UI 控制器部分初始化
SoundManager.init('../../audio');
```

**播放音效**:
```javascript
// 翻牌时
SoundManager.play('flip');

// 吃子时
SoundManager.play('capture');

// 移动时
SoundManager.play('slide');

// 胜利时
SoundManager.play('victory');

// 失败时
SoundManager.play('lose');

// 平局时
SoundManager.play('draw');
```

**控制音效**:
```javascript
// 切换音效开关
SoundManager.toggle();

// 设置音效状态
SoundManager.setEnabled(false);

// 检查音效状态
if (SoundManager.isEnabled()) {
  // 音效已启用
}

// 设置音量（0.0 到 1.0）
SoundManager.setVolume(0.8);
```

### 游戏集成示例

**龙虎斗 (dragon-tiger-fight)**:
```javascript
// 翻牌时
SoundManager.play('flip');

// 吃子时（普通）
SoundManager.play('capture');

// 吃子时（同归于尽）
SoundManager.play('destroy');

// 移动时
SoundManager.play('move');

// 游戏结束
SoundManager.play('victory'); // 或 'lose' 或 'draw'
```

**中国象棋 (chinese-chess)**:
```javascript
// 移动棋子（空位）
SoundManager.play('slide');

// 吃子
SoundManager.play('take');

// 游戏结束
SoundManager.play('victory'); // 或 'lose' 或 'draw'
```

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-05-30 | v1.0 | 初始版本，梳理全部音效需求 |
| 2026-05-30 | v1.1 | 完成音效目录结构和管理模块 |
| 2026-05-30 | v1.2 | 完成龙虎斗和中国象棋音效集成 |
