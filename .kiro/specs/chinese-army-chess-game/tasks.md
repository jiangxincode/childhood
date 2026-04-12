# Implementation Plan: 军棋（翻翻棋）

## Overview

基于龙虎斗/兽棋游戏的架构模式，实现军棋（翻翻棋）游戏。采用纯 HTML/CSS/JS 实现，game.js 导出纯函数供 vitest + fast-check 测试，UI 控制器仅在浏览器环境运行。5×5 棋盘，红蓝各12子 + 1张中立军旗，共25张棋子。文件部署在 `apps/card-game/chinese-army-chess/` 目录下。

## Tasks

- [x] 1. 实现游戏核心逻辑（game.js 逻辑层）
  - [x] 1.1 定义常量和基础工具函数
    - 定义 `NORMAL_PIECE_NAMES`（司令~工兵）、`BOMB_NAME`、`MINE_NAME`、`FLAG_NAME`、`TEAM_PIECE_NAMES`、`RANK_MAP` 常量
    - 实现 `isNormalPiece(name)`、`isBomb(name)`、`isMine(name)`、`isFlag(name)`、`isMovable(piece)` 棋子类型判定函数
    - 实现 `getImagePath(piece)` 函数：红方返回 `images/红-{名称}.png`，蓝方返回 `images/蓝-{名称}.png`，军旗返回 `images/军旗.png`
    - 实现 `getRank(name)` 函数：普通棋子返回 1-10，炸弹/地雷/军旗返回 null
    - 实现 `judgeRPS(choice1, choice2)` 石头剪刀布判定函数
    - 实现 `inBounds(x, y)` 边界检查函数（5×5棋盘，0-4）
    - 定义 `DIRECTIONS` 四方向偏移量
    - _Requirements: 1.3, 7.1, 7.4, 3.2, 12.1_

  - [x] 1.2 实现战斗判定函数
    - 实现 `canCapture(attacker, defender)`：
      - 军旗不可被吃、地雷不能主动攻击、同阵营不能互吃
      - 炸弹碰任何对方棋子（除军旗）→ true
      - 任何可移动棋子碰对方炸弹 → true
      - 工兵碰地雷 → true、其他普通棋子碰地雷 → true
      - 普通棋子之间：攻击方等级 ≤ 防守方等级（数值比较）时 true
    - 实现 `resolveCombat(attacker, defender)`：
      - 炸弹攻击/被攻击 → 'mutual_destruction'
      - 工兵碰地雷 → 'attacker_wins'
      - 其他碰地雷 → 'mutual_destruction'
      - 同级普通棋子 → 'mutual_destruction'
      - 高等级吃低等级 → 'attacker_wins'
    - _Requirements: 6.1, 6.4, 6.7, 6.8, 7.2, 7.3, 8.2, 8.3, 8.4, 9.2, 9.3, 9.4, 9.5, 10.3_

  - [x] 1.3 实现游戏状态创建函数
    - 实现 `createGameState(mode)`：创建5×5棋盘，红蓝各12子（司令~工兵+炸弹+地雷）+ 1张中立军旗，共25张棋子随机洗牌背面朝上放置，无空位
    - 使用 Fisher-Yates 洗牌算法
    - 初始化 GameState 所有字段（capturedRed/capturedBlue 等）
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

  - [x] 1.4 实现棋子操作函数
    - 实现 `getValidMoves(board, x, y, team)`：获取相邻空位 + 可抱军旗的位置（返回 type: 'move' | 'capture_flag'）
    - 实现 `getValidCaptures(board, x, y, team)`：获取合法吃牌目标（使用 canCapture 判定）
    - 实现 `getLowestNormalPiece(board, team)`：获取己方场上存活的等级最低的普通棋子
    - 实现 `canCaptureFlag(board, x, y, team)`：判断指定棋子是否可以抱军旗
    - 实现 `flipCard(state, x, y)`：翻牌操作，含首次非军旗翻牌阵营分配逻辑（翻开军旗不分配阵营）
    - 实现 `moveCard(state, from, to)`：走牌操作，验证相邻、空位、己方已翻开、可移动（地雷/军旗不可移动），含抱军旗判定（移到军旗位置时判定获胜）
    - 实现 `captureCard(state, from, to)`：吃牌操作，使用 resolveCombat 处理战斗结果（attacker_wins / mutual_destruction）
    - _Requirements: 3.1, 3.3, 3.4, 4.2, 4.4, 4.5, 5.1, 5.2, 5.4, 5.5, 5.7, 6.1, 6.2, 6.3, 6.5, 6.6, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.2, 11.4_

  - [x] 1.5 实现游戏结束判定和 AI 决策
    - 实现 `hasAnyLegalAction(board, team)`：检查翻牌/走牌/吃牌是否可行
    - 实现 `checkGameOver(state)`：当前行动方无合法操作则判负，或通过抱军旗获胜
    - 实现 `aiDecide(state, aiTeam)`：优先级为 抱军旗 > 吃牌（优先吃高等级、避免高等级同归于尽）> 翻牌（随机）> 走牌（随机）
    - _Requirements: 10.7, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x] 1.6 添加 module.exports 导出
    - 使用 `if (typeof module !== 'undefined' && module.exports)` 条件导出所有纯函数和常量
    - 导出列表：NORMAL_PIECE_NAMES, BOMB_NAME, MINE_NAME, FLAG_NAME, TEAM_PIECE_NAMES, RANK_MAP, isNormalPiece, isBomb, isMine, isFlag, isMovable, getImagePath, getRank, judgeRPS, inBounds, canCapture, resolveCombat, getLowestNormalPiece, canCaptureFlag, createGameState, getValidMoves, getValidCaptures, flipCard, moveCard, captureCard, hasAnyLegalAction, checkGameOver, aiDecide

- [x] 2. Checkpoint - 核心逻辑验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. 实现页面结构（index.html）
  - [x] 3.1 创建 HTML 页面
    - 参考龙虎斗 index.html 结构，创建模式选择界面、石头剪刀布界面、游戏区域、游戏结束界面
    - 棋盘使用 5×5 grid，25 个 `.cell` 元素，data-x/data-y 属性（0-4）
    - 状态栏显示当前行动方、回合数、红方/蓝方剩余棋子数
    - 被吃掉的牌展示区域（captured-red / captured-blue）
    - 游戏规则面板：等级排列（司令>军长>...>工兵）、炸弹规则、地雷规则、工兵排雷、军旗与抱军旗胜利条件、基本操作说明
    - _Requirements: 1.1, 2.1, 2.5, 10.8, 10.9, 12.1, 12.2, 12.5, 13.1, 13.2, 13.3, 13.4, 14.1, 14.5_

- [x] 4. 实现游戏样式（game.css）
  - [x] 4.1 创建 CSS 样式文件
    - 参考龙虎斗 game.css 结构，适配军棋的红方/蓝方配色
    - 棋盘 5×5 grid 布局，棋格样式（背面、正面、空位）
    - 选中高亮、合法目标高亮、吃牌目标高亮、AI 操作高亮、抱军旗目标高亮
    - 中立军旗棋子的特殊边框样式
    - 模式选择、石头剪刀布、游戏结束等覆盖层样式
    - 状态栏、被吃牌展示区、规则面板、操作提示信息样式
    - 响应式布局（移动端适配）
    - _Requirements: 12.3, 12.4, 12.8_

- [x] 5. 实现 UI 控制器（game.js UI 层）
  - [x] 5.1 实现渲染器和事件处理
    - 在 `if (typeof document !== 'undefined')` 块中实现 UI 控制器
    - 实现 `renderBoard(state)`：根据棋子状态渲染背面/正面/空位，正面使用 `getImagePath` 加载图片，军旗使用中立样式
    - 实现 `updateStatus(state)`：更新当前行动方、回合数、剩余棋子数、被吃棋子展示
    - 实现 `updateTeamLabels(state)`：PVE 模式下标识玩家方和电脑方（如"玩家（红方）"和"电脑（蓝方）"）
    - 实现棋盘点击事件处理：翻牌、选中、走牌（含抱军旗）、吃牌、取消选中
    - 实现选中高亮和合法目标高亮（`highlightTargets`, `clearHighlights`），抱军旗目标特殊高亮
    - 实现非法操作提示信息（"这不是你的棋子"、"无法吃掉该棋子"、"该棋子不能移动"、"军旗不能被吃"、"只有最小棋子才能抱军旗"等）
    - _Requirements: 3.1, 3.2, 3.4, 5.1, 5.5, 5.7, 11.1, 11.3, 12.1, 12.2, 12.3, 12.5, 12.6, 12.7, 12.8_

  - [x] 5.2 实现模式选择和石头剪刀布流程
    - 实现模式选择按钮事件（PVP/PVE）
    - 实现 PVP 石头剪刀布：双方各自选择，平局重来
    - 实现 PVE 石头剪刀布：玩家选择，电脑随机选择，平局重来
    - 实现先手确定后进入游戏
    - 实现重新开始按钮返回模式选择
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 5.3 实现 AI 操作执行与动画
    - 实现 `triggerAI()`：500-1500ms 延迟后执行 AI 决策
    - 实现 `executeAIAction(decision)`：翻牌/走牌/吃牌/抱军旗的高亮动画和执行
    - AI 操作期间禁止玩家点击（aiThinking 标志）
    - AI 操作完成后切换行动权给玩家，更新提示信息
    - 实现 `afterAction()`：检查游戏结束、触发 AI 回合、更新提示
    - _Requirements: 15.1, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 6. Checkpoint - 完整游戏功能验证
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 编写属性测试和单元测试（game.test.js）
  - [ ]* 7.1 编写属性测试 - Property 1: 初始状态不变量
    - **Property 1: 初始状态不变量**
    - 验证 createGameState 创建的棋盘为5×5，恰好25张非空棋子，红方12张（司令~工兵+炸弹+地雷）、蓝方12张、1张中立军旗（team='neutral'），所有 faceUp 为 false
    - **Validates: Requirements 1.2, 1.4, 1.5**

  - [ ]* 7.2 编写属性测试 - Property 2: 图片路径映射正确性
    - **Property 2: 图片路径映射正确性**
    - 验证 getImagePath 对所有棋子对象返回正确格式路径：红方 `images/红-{名称}.png`，蓝方 `images/蓝-{名称}.png`，军旗 `images/军旗.png`
    - **Validates: Requirements 3.2, 12.1**

  - [ ]* 7.3 编写属性测试 - Property 3: 等级映射正确性
    - **Property 3: 等级映射正确性**
    - 验证 getRank 对所有普通棋子名称返回正确等级值（1-10），对炸弹/地雷/军旗返回 null
    - **Validates: Requirements 7.1, 7.4**

  - [ ]* 7.4 编写属性测试 - Property 4: 战斗判定完整性（canCapture）
    - **Property 4: 战斗判定完整性**
    - 验证 canCapture 对所有棋子对的判定结果正确：军旗不可被吃、地雷不能主动攻击、同阵营不能互吃、炸弹碰任何对方棋子（除军旗）、工兵碰地雷、普通棋子等级比较
    - **Validates: Requirements 6.1, 6.4, 6.7, 6.8, 8.2, 8.3, 8.4, 9.2, 9.3, 9.5, 10.3**

  - [ ]* 7.5 编写属性测试 - Property 5: 战斗结果正确性（resolveCombat）
    - **Property 5: 战斗结果正确性**
    - 验证 resolveCombat 对所有合法战斗的结果正确：炸弹同归于尽、工兵排雷存活、普通棋子碰地雷同归于尽、同级同归于尽、高等级吃低等级
    - **Validates: Requirements 6.2, 6.3, 8.2, 8.4, 9.2, 9.3, 9.4**

  - [ ]* 7.6 编写属性测试 - Property 6: 操作后回合切换
    - **Property 6: 操作后回合切换**
    - 验证翻牌/走牌/吃牌操作后 currentTeam 切换且 turnCount 递增1
    - **Validates: Requirements 3.3, 5.4, 6.5, 11.2**

  - [ ]* 7.7 编写属性测试 - Property 7: 非法操作拒绝
    - **Property 7: 非法操作拒绝**
    - 验证各种非法操作返回 null（非己方棋子、未翻开、非相邻、目标非空、地雷/军旗不可移动、坐标越界等）
    - **Validates: Requirements 5.2, 5.5, 5.6, 5.7, 6.6, 11.4**

  - [ ]* 7.8 编写属性测试 - Property 8: 抱军旗判定正确性
    - **Property 8: 抱军旗判定正确性**
    - 验证 canCaptureFlag：仅己方最小普通棋子可抱军旗、需与已翻开军旗相邻、非普通棋子不能抱、非最小普通棋子不能抱
    - **Validates: Requirements 10.4, 10.5, 10.6**

  - [ ]* 7.9 编写属性测试 - Property 9: 游戏结束判定
    - **Property 9: 游戏结束判定**
    - 验证当前行动方无合法操作则失败，抱军旗获胜正确返回获胜方，双方均有合法操作则游戏未结束
    - **Validates: Requirements 10.7**

  - [ ]* 7.10 编写属性测试 - Property 10: PVE 首次翻牌阵营分配
    - **Property 10: PVE 首次翻牌阵营分配**
    - 验证 PVE 模式下首次非军旗翻牌正确分配 playerTeam 和 aiTeam，翻开军旗时不分配阵营
    - **Validates: Requirements 4.2, 4.4, 4.5**

  - [ ]* 7.11 编写属性测试 - Property 11: AI 决策合法性
    - **Property 11: AI 决策合法性**
    - 验证 aiDecide 返回合法操作类型，存在吃牌时优先返回 capture，最小普通棋子与军旗相邻时优先抱军旗，操作可成功执行
    - **Validates: Requirements 15.1, 15.2, 15.5, 15.7**

  - [ ]* 7.12 编写单元测试
    - 石头剪刀布 9 种组合穷举
    - 图片映射 25 种棋子验证（红方12 + 蓝方12 + 军旗）
    - 具体吃子场景（炸弹同归于尽、工兵排雷、普通棋子碰地雷、同级同归于尽、高等级吃低等级等）
    - getValidMoves/getValidCaptures 各种位置场景（含抱军旗目标）
    - flipCard 翻牌操作场景（含军旗翻牌不分配阵营）
    - moveCard 走牌操作场景（含地雷/军旗不可移动、抱军旗获胜）
    - captureCard 吃牌操作场景（含炸弹、地雷、工兵排雷）
    - canCaptureFlag 抱军旗判定场景
    - checkGameOver 游戏结束判定场景（含抱军旗获胜）
    - aiDecide AI 决策优先级场景（含抱军旗最高优先级）
    - _Requirements: 全部需求覆盖_

- [x] 8. Final checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 参考龙虎斗（dragon-tiger-fight）和兽棋（animal-chess）的代码结构和模式
- 阵营使用 'red'/'blue'/'neutral'（军旗），对应图片前缀"红-"/"蓝-"/"军旗"
- game.js 使用 `if (typeof module !== 'undefined' && module.exports)` 导出纯函数
- UI 控制器使用 `if (typeof document !== 'undefined')` 条件执行
- 图片资源已存在于 `apps/card-game/chinese-army-chess/images/` 目录
- 使用 vitest + fast-check 进行测试，测试文件为 game.test.js
- 5×5 棋盘，25张棋子初始无空位，与龙虎斗（4×4，16张）和兽棋（4×4，16张）不同
- 军棋特有机制：炸弹同归于尽、地雷不可移动、工兵排雷、军旗中立不可被吃只能被抱
