# 实现任务

## 任务列表

- [x] 1. 创建游戏核心逻辑（game.js）
  - [x] 1.1 定义棋子名称列表和等级映射（PIECE_NAMES、RANK_MAP），爷爷 rank=1，小皇帝 rank=8
  - [x] 1.2 实现 `getImagePath(team, name)` 函数，返回 `images/{颜色}-{角色}.png` 路径
  - [x] 1.3 实现 `judgeRPS(choice1, choice2)` 石头剪刀布判定函数
  - [x] 1.4 实现 `inBounds(x, y)` 边界检查函数和 DIRECTIONS 方向常量
  - [x] 1.5 实现 `canCapture(attacker, defender)` 循环克制规则：相邻等级吃牌、小皇帝吃爷爷、同级同归于尽、禁止越级、同阵营不能吃
  - [x] 1.6 实现 `isMutualDestruction(attacker, defender)` 同级同归于尽判断
  - [x] 1.7 实现 `createGameState(mode)` 初始化函数：创建16张棋子（红蓝各8张），Fisher-Yates 洗牌，放置到4×4棋盘
  - [x] 1.8 实现 `getValidMoves(board, x, y)` 返回相邻空位列表
  - [x] 1.9 实现 `getValidCaptures(board, x, y, team)` 返回合法吃牌目标列表
  - [x] 1.10 实现 `flipCard(state, x, y)` 翻牌操作：翻开棋子，首次翻牌确定阵营，切换回合
  - [x] 1.11 实现 `moveCard(state, from, to)` 走牌操作：移动到相邻空位，切换回合
  - [x] 1.12 实现 `captureCard(state, from, to)` 吃牌操作：处理普通吃牌和同归于尽，切换回合
  - [x] 1.13 实现 `hasAnyLegalAction(board, team)` 检查是否有任何合法操作（翻牌/走牌/吃牌）
  - [x] 1.14 实现 `checkGameOver(board, currentTeam)` 胜负判定：一方无棋子或无合法操作则判负
  - [x] 1.15 实现 `aiDecide(state, aiTeam)` AI决策：优先吃牌（优先吃高等级，避免同归于尽）> 翻牌 > 走牌
  - [x] 1.16 添加 Node.js 模块导出（`module.exports`）

- [x] 2. 创建游戏页面结构（index.html）
  - [x] 2.1 创建基础 HTML 结构，引入 game.css 和 game.js
  - [x] 2.2 添加模式选择界面（`#mode-selection`）：双人对战、人机对战按钮
  - [x] 2.3 添加石头剪刀布界面（`#rps-section`）：PVP 双方选择区域和 PVE 玩家选择区域
  - [x] 2.4 添加游戏区域（`#game-area`）：状态栏、棋盘（16个 `.cell`）、规则面板、被吃棋子区、消息提示
  - [x] 2.5 在规则面板中列出循环克制顺序（爷爷>奶奶>爸爸>妈妈>哥哥>姐姐>妹妹>小皇帝>爷爷）、禁止越级说明、同级同归于尽说明、基本操作说明
  - [x] 2.6 添加游戏结束界面（`#game-over`）：获胜方文本和重新开始按钮

- [x] 3. 创建游戏样式（game.css）
  - [x] 3.1 定义 CSS 变量：颜色、棋格尺寸（160px）、间距等
  - [x] 3.2 实现遮罩层（`.overlay`）和内容卡片（`.overlay-content`）样式
  - [x] 3.3 实现棋盘（`#board`）4×4 grid 布局和棋格（`.cell`）样式
  - [x] 3.4 实现棋子背面（`.cell-back`，显示"?"）和正面（`.cell-face` + img）样式
  - [x] 3.5 实现高亮状态：选中（`.cell-selected` 黄色）、走牌目标（`.cell-target` 绿色）、吃牌目标（`.cell-capture-target` 红色）、AI高亮（`.cell-ai-highlight` 蓝色）
  - [x] 3.6 实现状态栏、被吃棋子区、消息提示、规则面板的样式
  - [x] 3.7 实现响应式布局（移动端适配）

- [x] 4. 实现 UI 控制器（game.js 浏览器部分）
  - [x] 4.1 实现界面切换函数：`showModeSelection()`、`showRPSSelection(mode)`、`showGameArea()`、`showGameOverScreen(winner)`
  - [x] 4.2 实现棋盘渲染函数 `renderBoard(state)`：根据状态渲染所有棋格
  - [x] 4.3 实现高亮函数 `highlightTargets(x, y, moves, captures)` 和 `clearHighlights()`
  - [x] 4.4 实现状态更新函数 `updateStatus(state)`：更新当前行动方、回合数、剩余棋子数、被吃棋子
  - [x] 4.5 实现 PVP 石头剪刀布按钮事件：双方各自选择，两人都选后判定结果
  - [x] 4.6 实现 PVE 石头剪刀布按钮事件：玩家选择后 AI 随机选择，判定结果
  - [x] 4.7 实现模式选择按钮事件（双人对战/人机对战）
  - [x] 4.8 实现棋盘点击事件处理：翻牌、选中己方棋子、走牌、吃牌的完整交互逻辑
  - [x] 4.9 实现 `triggerAI()` 和 `executeAIAction(decision)` AI操作流程（含延迟和高亮反馈）
  - [x] 4.10 实现 `afterAction()` 操作后处理：检查胜负、切换回合提示、PVE 自动触发 AI
  - [x] 4.11 实现 PVE 模式下阵营标签更新（"玩家（红方）"/"电脑（蓝方）"等）
  - [x] 4.12 实现重新开始按钮事件（返回模式选择界面）

- [x] 5. 更新首页和 README
  - [x] 5.1 在根目录 `index.html` 的 `.gallery_wrap` 中添加小皇帝游戏卡片，链接到 `apps/card-game/little-emperor/index.html`
  - [x] 5.2 在根目录 `README.md` 的游戏列表中添加小皇帝游戏说明条目
