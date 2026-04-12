# Implementation Plan: 兽棋游戏

## Overview

基于龙虎斗游戏的架构模式，实现兽棋游戏。采用纯 HTML/CSS/JS 实现，game.js 导出纯函数供 vitest + fast-check 测试，UI 控制器仅在浏览器环境运行。文件部署在 `apps/card-game/animal-chess/` 目录下。

## Tasks

- [x] 1. 实现游戏核心逻辑（game.js 逻辑层）
  - [x] 1.1 定义常量和基础工具函数
    - 定义 `ANIMAL_NAMES`、`RANK_MAP` 常量
    - 实现 `getImagePath(team, animal)` 函数，红方返回 `images/红-{动物}.png`，蓝方返回 `images/蓝-{动物}.png`
    - 实现 `getRank(animal)` 函数
    - 实现 `judgeRPS(choice1, choice2)` 石头剪刀布判定函数
    - 实现 `inBounds(x, y)` 边界检查函数
    - 定义 `DIRECTIONS` 四方向偏移量
    - _Requirements: 6.1, 9.1, 3.2_

  - [x] 1.2 实现吃子判定函数
    - 实现 `canCapture(attacker, defender)`：同阵营不能吃、高等级吃低等级、同级可吃、鼠(8)吃象(1)逆袭、象(1)不能吃鼠(8)
    - 实现 `isMutualDestruction(attacker, defender)`：同级同归于尽判定
    - _Requirements: 5.1, 5.4, 5.7, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 1.3 实现游戏状态创建函数
    - 实现 `createGameState(mode)`：创建4×4棋盘，红蓝各8子随机洗牌背面朝上放置，初始无空位
    - 使用 Fisher-Yates 洗牌算法
    - 初始化 GameState 所有字段（capturedRed/capturedBlue 等）
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 11.1_

  - [x] 1.4 实现棋子操作函数
    - 实现 `getValidMoves(board, x, y)`：获取相邻空位
    - 实现 `getValidCaptures(board, x, y, team)`：获取合法吃牌目标
    - 实现 `flipCard(state, x, y)`：翻牌操作，含首次翻牌阵营分配逻辑（PVE模式）
    - 实现 `moveCard(state, from, to)`：走牌操作，验证相邻、空位、己方已翻开
    - 实现 `captureCard(state, from, to)`：吃牌操作，含同归于尽处理（双方均移除并加入被吃列表）
    - _Requirements: 3.1, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.5, 5.6, 8.2, 11.2, 11.4_

  - [x] 1.5 实现游戏结束判定和 AI 决策
    - 实现 `hasAnyLegalAction(board, team)`：检查翻牌/走牌/吃牌是否可行
    - 实现 `checkGameOver(board, currentTeam)`：一方棋子为0或无合法操作则判负
    - 实现 `aiDecide(state, aiTeam)`：优先吃牌（优先吃高等级、避免高等级同归于尽）> 翻牌（随机）> 走牌（随机）
    - _Requirements: 7.1, 7.2, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 1.6 添加 module.exports 导出
    - 使用 `if (typeof module !== 'undefined' && module.exports)` 条件导出所有纯函数和常量
    - _Requirements: 9.4_

- [x] 2. Checkpoint - 核心逻辑验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. 实现页面结构（index.html）
  - [x] 3.1 创建 HTML 页面
    - 参考龙虎斗 index.html 结构，创建模式选择界面、石头剪刀布界面、游戏区域、游戏结束界面
    - 棋盘使用 4×4 grid，16 个 `.cell` 元素，data-x/data-y 属性
    - 状态栏显示当前行动方、回合数、红方/蓝方剩余棋子数
    - 被吃掉的牌展示区域（captured-red / captured-blue）
    - 游戏规则面板：等级排列（象>狮>虎>豹>狼>狗>猫>鼠>象循环）、同级同归于尽、逆袭规则（鼠钻象鼻）、基本操作说明
    - _Requirements: 1.1, 2.1, 2.5, 7.3, 7.4, 9.2, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 12.1, 12.5_

- [x] 4. 实现游戏样式（game.css）
  - [x] 4.1 创建 CSS 样式文件
    - 参考龙虎斗 game.css 结构，适配兽棋的红方/蓝方配色
    - 棋盘 4×4 grid 布局，棋格样式（背面、正面、空位）
    - 选中高亮、合法目标高亮、吃牌目标高亮、AI 操作高亮
    - 模式选择、石头剪刀布、游戏结束等覆盖层样式
    - 状态栏、被吃牌展示区、规则面板、操作提示信息样式
    - 响应式布局（移动端适配）
    - _Requirements: 9.1, 9.3, 9.4_

- [x] 5. 实现 UI 控制器（game.js UI 层）
  - [x] 5.1 实现渲染器和事件处理
    - 在 `if (typeof document !== 'undefined')` 块中实现 UI 控制器
    - 实现 `renderBoard(state)`：根据棋子状态渲染背面/正面/空位，正面使用 `getImagePath` 加载图片
    - 实现 `updateStatus(state)`：更新当前行动方、回合数、剩余棋子数、被吃棋子展示
    - 实现 `updateTeamLabels(state)`：PVE 模式下标识玩家方和电脑方（如"玩家（红方）"和"电脑（蓝方）"）
    - 实现棋盘点击事件处理：翻牌、选中、走牌、吃牌、取消选中
    - 实现选中高亮和合法目标高亮（`highlightTargets`, `clearHighlights`）
    - 实现非法操作提示信息（"这不是你的棋子"、"无法吃掉该棋子"等）
    - _Requirements: 3.1, 3.2, 4.1, 5.1, 8.1, 8.3, 8.4, 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_

  - [x] 5.2 实现模式选择和石头剪刀布流程
    - 实现模式选择按钮事件（PVP/PVE）
    - 实现 PVP 石头剪刀布：双方各自选择，平局重来
    - 实现 PVE 石头剪刀布：玩家选择，电脑随机选择，平局重来
    - 实现先手确定后进入游戏
    - 实现重新开始按钮返回模式选择
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 5.3 实现 AI 操作执行与动画
    - 实现 `triggerAI()`：500-1500ms 延迟后执行 AI 决策
    - 实现 `executeAIAction(decision)`：翻牌/走牌/吃牌的高亮动画和执行
    - AI 操作期间禁止玩家点击（aiThinking 标志）
    - AI 操作完成后切换行动权给玩家，更新提示信息
    - 实现 `afterAction()`：检查游戏结束、触发 AI 回合、更新提示
    - _Requirements: 13.1, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 6. Checkpoint - 完整游戏功能验证
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 编写属性测试和单元测试（game.test.js）
  - [ ]* 7.1 编写属性测试 - Property 1: 初始状态不变量
    - **Property 1: 初始状态不变量**
    - 验证 createGameState 创建的棋盘为4×4，恰好16张非空棋子，红方8张蓝方8张，各含象狮虎豹狼狗猫鼠各一张，所有 faceUp 为 false
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 11.1**

  - [ ]* 7.2 编写属性测试 - Property 2: 等级映射正确性
    - **Property 2: 等级映射正确性**
    - 验证 getRank 对所有动物名称返回正确等级值
    - **Validates: Requirements 6.1**

  - [ ]* 7.3 编写属性测试 - Property 3: 图片路径映射正确性
    - **Property 3: 图片路径映射正确性**
    - 验证 getImagePath 对所有阵营和动物名称返回正确格式路径
    - **Validates: Requirements 3.2, 9.1**

  - [ ]* 7.4 编写属性测试 - Property 4: 吃子规则完整性
    - **Property 4: 吃子规则完整性**
    - 验证 canCapture 对所有跨阵营棋子对的判定结果正确：高等级吃低等级、同级可吃、鼠吃象逆袭、象不能吃鼠、同阵营不能吃
    - **Validates: Requirements 5.1, 5.4, 5.7, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

  - [ ]* 7.5 编写属性测试 - Property 5: 吃牌结果正确性
    - **Property 5: 吃牌结果正确性**
    - 验证 captureCard 执行后：同级同归于尽双方均移除，非同级攻击方移到防守方位置
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 7.6 编写属性测试 - Property 6: 操作后回合切换
    - **Property 6: 操作后回合切换**
    - 验证翻牌/走牌/吃牌操作后 currentTeam 切换且 turnCount 递增1
    - **Validates: Requirements 3.3, 4.4, 5.5, 8.2**

  - [ ]* 7.7 编写属性测试 - Property 7: 非法操作拒绝
    - **Property 7: 非法操作拒绝**
    - 验证各种非法操作返回 null（非己方棋子、未翻开、非相邻、目标非空等）
    - **Validates: Requirements 4.2, 4.5, 4.6, 5.6, 8.4**

  - [ ]* 7.8 编写属性测试 - Property 8: 游戏结束判定
    - **Property 8: 游戏结束判定**
    - 验证一方棋子为0则该方失败，当前行动方无合法操作则失败
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 7.9 编写属性测试 - Property 9: PVE 首次翻牌阵营分配
    - **Property 9: PVE 首次翻牌阵营分配**
    - 验证 PVE 模式下首次翻牌正确分配 playerTeam 和 aiTeam
    - **Validates: Requirements 11.2, 11.4**

  - [ ]* 7.10 编写属性测试 - Property 10: AI 决策合法性
    - **Property 10: AI 决策合法性**
    - 验证 aiDecide 返回合法操作类型，存在吃牌时优先返回 capture，操作可成功执行
    - **Validates: Requirements 13.1, 13.2, 13.5**

  - [ ]* 7.11 编写单元测试
    - 石头剪刀布 9 种组合穷举
    - 图片映射 16 种棋子验证
    - 具体吃子场景（逆袭、同归于尽、象不能吃鼠等）
    - getValidMoves/getValidCaptures 各种位置场景
    - flipCard/moveCard/captureCard 各种操作场景
    - checkGameOver 游戏结束判定场景
    - aiDecide AI 决策优先级场景
    - _Requirements: 全部需求覆盖_

- [x] 8. Final checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 参考龙虎斗（dragon-tiger-fight）的代码结构和模式
- 阵营使用 'red'/'blue'，对应图片前缀"红-"/"蓝-"
- game.js 使用 `if (typeof module !== 'undefined' && module.exports)` 导出纯函数
- UI 控制器使用 `if (typeof document !== 'undefined')` 条件执行
- 图片资源已存在于 `apps/card-game/animal-chess/images/` 目录
- 使用 vitest + fast-check 进行测试，测试文件为 game.test.js
