# 设计文档

## 概述

猫捉老鼠游戏基于现有兽棋（animal-chess）的架构模式实现，使用纯 HTML/CSS/JavaScript，部署在 `apps/card-game/cat-and-mouse/` 目录下。游戏逻辑与 UI 分离：`game.js` 包含核心逻辑和 UI 控制器，`game.css` 负责样式，`index.html` 提供页面结构。

## 架构

```
apps/card-game/cat-and-mouse/
├── index.html      # 页面结构
├── game.js         # 游戏逻辑 + UI 控制器
├── game.css        # 样式
└── images/         # 棋子图片（已存在）
    ├── 红-大黄猫.png
    ├── 红-小花猫.png
    ├── 红-大灰鼠.png
    ├── 红-米老鼠.png
    ├── 红-白老鼠.png
    ├── 红-偷米鼠.png
    ├── 红-大头鼠.png
    ├── 红-油滑鼠.png
    ├── 蓝-大黄猫.png
    ├── 蓝-小花猫.png
    ├── 蓝-大灰鼠.png
    ├── 蓝-米老鼠.png
    ├── 蓝-白老鼠.png
    ├── 蓝-偷米鼠.png
    ├── 蓝-大头鼠.png
    └── 蓝-油滑鼠.png
```

## 数据模型

### 棋子（Piece）

```js
{
  name: string,    // '大黄猫' | '小花猫' | '大灰鼠' | '米老鼠' | '白老鼠' | '偷米鼠' | '大头鼠' | '油滑鼠'
  team: string,    // 'red' | 'blue'
  rank: number,    // 0=大黄猫(最强), 1=小花猫, 2=大灰鼠, 3=米老鼠, 4=白老鼠, 5=偷米鼠, 6=大头鼠, 7=油滑鼠
  faceUp: boolean  // 是否已翻开
}
```

### 游戏状态（GameState）

```js
{
  mode: string,           // 'pvp' | 'pve'
  board: Piece[][],       // 4×4 二维数组，null 表示空位
  currentTeam: string,    // 'red' | 'blue' | null
  playerTeam: string,     // PVE模式下玩家阵营
  aiTeam: string,         // PVE模式下AI阵营
  teamAssigned: boolean,  // 阵营是否已通过首次翻牌确定
  firstPlayer: string,    // 先手阵营
  turnCount: number,      // 回合计数
  capturedRed: string[],  // 被吃掉的红方棋子名列表
  capturedBlue: string[], // 被吃掉的蓝方棋子名列表
  selectedCell: {x,y},   // 当前选中的格子坐标，null 表示未选中
  gameOver: boolean,
  winner: string,         // 'red' | 'blue' | null
  aiThinking: boolean,    // AI是否正在思考/执行
  aiFirst: boolean        // PVE模式下AI是否先手
}
```

## 核心逻辑函数

### 等级与吃子规则

```js
// 棋子名称列表（按等级排序）
const PIECE_NAMES = ['大黄猫', '小花猫', '大灰鼠', '米老鼠', '白老鼠', '偷米鼠', '大头鼠', '油滑鼠'];

// 等级映射：0=最强（大黄猫），7=最弱（油滑鼠）
const RANK_MAP = {
  '大黄猫': 0, '小花猫': 1, '大灰鼠': 2, '米老鼠': 3,
  '白老鼠': 4, '偷米鼠': 5, '大头鼠': 6, '油滑鼠': 7
};

// 吃子规则：rank 数值小的吃 rank 数值大的；同级同归于尽
function canCapture(attacker, defender):
  - 同阵营不能吃
  - attacker.rank <= defender.rank → 可以吃（含同级同归于尽）
  - attacker.rank > defender.rank → 不能吃

function isMutualDestruction(attacker, defender):
  - attacker.rank === defender.rank → true
```

### 主要操作函数

- `createGameState(mode)` — 初始化游戏状态，Fisher-Yates 洗牌
- `flipCard(state, x, y)` — 翻牌，首次翻牌确定阵营，切换回合
- `moveCard(state, from, to)` — 走牌到相邻空位，切换回合
- `captureCard(state, from, to)` — 吃牌，处理同归于尽，切换回合
- `getValidMoves(board, x, y)` — 返回合法走牌目标列表
- `getValidCaptures(board, x, y, team)` — 返回合法吃牌目标列表
- `hasAnyLegalAction(board, team)` — 检查是否有任何合法操作
- `checkGameOver(board, currentTeam)` — 检查游戏是否结束
- `aiDecide(state, aiTeam)` — AI决策（优先级：吃牌 > 翻牌 > 走牌）

## UI 结构

页面分为以下几个区域（与兽棋保持一致的结构）：

1. **模式选择界面**（`#mode-selection`）：双人对战 / 人机对战
2. **石头剪刀布界面**（`#rps-section`）：PVP 双方各选，PVE 玩家选
3. **游戏区域**（`#game-area`）：
   - 状态栏（`#status-bar`）：当前行动方、回合数、双方剩余棋子数
   - 主游戏区（`#game-main`）：棋盘（`#board`）+ 规则面板（`#rules-panel`）
   - 被吃棋子展示区（`#captured-area`）
   - 操作提示（`#message`）
4. **游戏结束界面**（`#game-over`）：获胜方信息 + 重新开始按钮

## 游戏流程

```
模式选择 → 石头剪刀布（决定先手）→ 游戏开始
  → 当前玩家操作（翻牌/走牌/吃牌）
  → 切换回合
  → 检查胜负
  → [PVE] 若轮到AI则自动执行
  → 循环直到游戏结束
→ 显示结果 → 重新开始（返回模式选择）
```

## 与首页和 README 的集成

- 在根目录 `index.html` 的 `.gallery_wrap` 中新增猫捉老鼠游戏卡片
- 在根目录 `README.md` 的游戏列表中新增猫捉老鼠条目
