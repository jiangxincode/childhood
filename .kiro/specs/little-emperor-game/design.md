# 设计文档

## 概述

小皇帝游戏基于现有兽棋（animal-chess）的架构模式实现，使用纯 HTML/CSS/JavaScript，部署在 `apps/card-game/little-emperor/` 目录下。游戏逻辑与 UI 分离：`game.js` 包含核心逻辑和 UI 控制器，`game.css` 负责样式，`index.html` 提供页面结构。

核心特色：循环克制规则（爷爷>奶奶>爸爸>妈妈>哥哥>姐姐>妹妹>小皇帝>爷爷），高等级棋子可以吃掉任意低等级棋子（允许越级），小皇帝可以吃掉爷爷。

## 架构

```
apps/card-game/little-emperor/
├── index.html      # 页面结构
├── game.js         # 游戏逻辑 + UI 控制器
├── game.css        # 样式
└── images/         # 棋子图片（已存在）
    ├── 红-爷爷.png
    ├── 红-奶奶.png
    ├── 红-爸爸.png
    ├── 红-妈妈.png
    ├── 红-哥哥.png
    ├── 红-姐姐.png
    ├── 红-妹妹.png
    ├── 红-小皇帝.png
    ├── 蓝-爷爷.png
    ├── 蓝-奶奶.png
    ├── 蓝-爸爸.png
    ├── 蓝-妈妈.png
    ├── 蓝-哥哥.png
    ├── 蓝-姐姐.png
    ├── 蓝-妹妹.png
    └── 蓝-小皇帝.png
```

## 数据模型

### 棋子（Piece）

```js
{
  name: string,    // '爷爷'|'奶奶'|'爸爸'|'妈妈'|'哥哥'|'姐姐'|'妹妹'|'小皇帝'
  team: string,    // 'red' | 'blue'
  rank: number,    // 1=爷爷, 2=奶奶, 3=爸爸, 4=妈妈, 5=哥哥, 6=姐姐, 7=妹妹, 8=小皇帝
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

### 循环克制规则

```js
// 棋子名称列表（按等级排序，rank 1-8）
const PIECE_NAMES = ['爷爷', '奶奶', '爸爸', '妈妈', '哥哥', '姐姐', '妹妹', '小皇帝'];

// 等级映射：1=爷爷（最强），8=小皇帝（最弱但可克制爷爷）
const RANK_MAP = {
  '爷爷': 1, '奶奶': 2, '爸爸': 3, '妈妈': 4,
  '哥哥': 5, '姐姐': 6, '妹妹': 7, '小皇帝': 8
};

// 吃子规则：
// - 同阵营不能吃
// - 高等级（rank数值小）吃低等级（rank数值大），允许越级
// - 循环克制：小皇帝(rank8)吃爷爷(rank1)，爷爷不能吃小皇帝
// - 同级同归于尽
function canCapture(attacker, defender):
  if same team → false
  if attacker.rank === defender.rank → true (同归于尽)
  if attacker.rank === 8 && defender.rank === 1 → true (小皇帝吃爷爷)
  if attacker.rank === 1 && defender.rank === 8 → false (爷爷不能吃小皇帝)
  if attacker.rank < defender.rank → true (高等级吃低等级，允许越级)
  → false

function isMutualDestruction(attacker, defender):
  attacker.rank === defender.rank → true
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

- 在根目录 `index.html` 的 `.gallery_wrap` 中新增小皇帝游戏卡片
- 在根目录 `README.md` 的游戏列表中新增小皇帝条目
