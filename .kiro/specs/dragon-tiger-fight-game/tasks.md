# Implementation Plan: 龙虎斗游戏

## Overview

基于 knife-kills-chicken 的架构模式，使用纯 HTML/CSS/JavaScript 实现龙虎斗游戏。game.js 分为游戏逻辑层（纯函数，module.exports 导出）和 UI 控制器层（仅浏览器环境）。使用 vitest + fast-check 进行测试。所有文件放置在 `apps/card-game/dragon-tiger-fight/` 目录下。

## Tasks

- [x] 1. 实现常量定义与基础工具函数
  - [x] 1.1 创建 game.js，定义常量和基础函数
    - 定义 DRAGON_PIECES、TIGER_PIECES 数组（各8张棋子，按等级1-8排列）
    - 定义 RANK_MAP（棋子名→等级数值1-8）
    - 定义 IMAGE_MAP（棋子名→图片文件名，如 '龙王': '龙1.jpg'）
    - 定义 TEAM_MAP（棋子名→阵营 'dragon'/'tiger'）
    - 实现 getImagePath(piece)：返回 `images/${IMAGE_MAP[piece]}`
    - 实现 getTeam(piece)：返回阵营
    - 实现 getRank(piece)：返回等级数值
    - 实现 judgeRPS(choice1, choice2)：石头剪刀布判定，返回 1/-1/0
    - 实现 inBounds(x, y)：坐标边界检查
    - 定义 DIRECTIONS 四方向偏移量
    - 使用 `if (typeof module !== 'undefined' && module.exports)` 导出所有纯函数
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 3.2, 6.1, 6.2, 9.1_

  - [ ]* 1.2 为常量和基础函数编写单元测试
    - 创建 game.test.js
    - 测试 judgeRPS 9种组合穷举
    - 测试 getImagePath 16种棋子映射
    - 测试 getRank 所有棋子等级正确性
    - 测试 getTeam 所有棋子阵营正确性
    - _Requirements: 6.1, 6.2, 9.1_

  - [ ]* 1.3 编写属性测试：初始映射正确性
    - **Property 2: 等级映射正确性** — 对所有棋子名称，getRank 返回 1-8，getTeam 返回正确阵营
    - **Validates: Requirements 6.1, 6.2**
    - **Property 3: 图片路径映射正确性** — 对所有棋子名称，getImagePath 返回正确格式路径
    - **Validates: Requirements 3.2, 9.1**

- [x] 2. 实现吃子规则判定
  - [x] 2.1 实现 canCapture 和 isMutualDestruction 函数
    - canCapture(attacker, defender)：判断攻击方是否可吃防守方
      - 同阵营返回 false
      - 高等级（数值小）吃低等级（数值大）
      - 同级返回 true（同归于尽在 captureCard 中处理）
      - 逆袭：等级8吃对方等级1
      - 等级1不能吃对方等级8（被逆袭克制）
    - isMutualDestruction(attacker, defender)：同级判定
    - 导出这两个函数
    - _Requirements: 5.1, 5.4, 5.7, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 2.2 为吃子规则编写单元测试
    - 测试高等级吃低等级的各种组合
    - 测试同级同归于尽的8对对应关系
    - 测试逆袭规则：变形龙吃虎王、小王虎吃龙王
    - 测试等级1不能吃对方等级8
    - 测试同阵营不能互吃
    - _Requirements: 5.1, 5.4, 5.7, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 2.3 编写属性测试：吃子规则完整性
    - **Property 4: 吃子规则完整性** — 对任意跨阵营棋子对，canCapture 结果符合等级高低、逆袭、克制规则
    - **Validates: Requirements 5.1, 5.4, 5.7, 6.3, 6.4, 6.5, 6.6, 6.7**

- [x] 3. 实现游戏状态创建与棋盘初始化
  - [x] 3.1 实现 createGameState 函数
    - 生成16张棋子：龙队8张 + 虎队8张，每张包含 piece/team/rank/faceUp 属性
    - Fisher-Yates 洗牌算法随机排列
    - 放置到 4×4 棋盘 board[y][x]
    - 初始化所有游戏状态字段（mode, currentTeam, playerTeam, aiTeam, teamAssigned, turnCount, capturedDragon, capturedTiger 等）
    - 导出函数
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 11.1_

  - [ ]* 3.2 编写属性测试：初始状态不变量
    - **Property 1: 初始状态不变量** — 对任意游戏模式，createGameState 创建的状态满足：4×4棋盘、16张非空棋子、龙虎各8张、所有 faceUp 为 false
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 11.1**

- [x] 4. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 5. 实现核心操作函数
  - [x] 5.1 实现 getValidMoves 和 getValidCaptures 函数
    - getValidMoves(board, x, y)：返回相邻空位列表（曼哈顿距离1）
    - getValidCaptures(board, x, y, team)：返回可吃的相邻对方已翻开棋子列表
    - 导出函数
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 5.1, 5.6_

  - [x] 5.2 实现 flipCard 函数
    - 翻牌操作：将背面朝上的棋子翻为正面
    - 首次翻牌时处理阵营分配逻辑（PVE 模式下设置 playerTeam/aiTeam）
    - 翻牌后切换 currentTeam，turnCount 递增
    - 非法操作返回 null
    - 导出函数
    - _Requirements: 3.1, 3.3, 3.4, 11.2, 11.3, 11.4_

  - [x] 5.3 实现 moveCard 函数
    - 走牌操作：将己方已翻开棋子移动到相邻空位
    - 验证：属于当前行动方、已翻开、目标为空、曼哈顿距离为1
    - 走牌后切换 currentTeam，turnCount 递增
    - 非法操作返回 null
    - 导出函数
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.4 实现 captureCard 函数
    - 吃牌操作：己方已翻开棋子吃相邻对方已翻开棋子
    - 验证 canCapture 规则
    - 处理同归于尽（isMutualDestruction）：双方棋子均移除，均加入被吃列表
    - 普通吃牌：攻击方移到防守方位置，防守方加入被吃列表
    - 吃牌后切换 currentTeam，turnCount 递增
    - 非法操作返回 null
    - 导出函数
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 5.5 为核心操作函数编写单元测试
    - 测试 getValidMoves：中间/角落/边缘位置、四周被占据
    - 测试 getValidCaptures：可吃/不可吃/同阵营/未翻开
    - 测试 flipCard：正常翻牌、已翻开返回null、空位返回null、PVE阵营分配
    - 测试 moveCard：正常移动、目标非空、距离不为1、对方棋子、未翻开
    - 测试 captureCard：正常吃牌、同归于尽、不满足规则、被吃列表更新
    - _Requirements: 3.1, 3.3, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.5_

  - [ ]* 5.6 编写属性测试：吃牌结果与回合切换
    - **Property 5: 吃牌结果正确性** — 合法吃牌后，同级双方均移除，非同级攻击方移到防守方位置
    - **Validates: Requirements 5.2, 5.3**
    - **Property 6: 操作后回合切换** — 任何合法操作后 currentTeam 切换且 turnCount 递增1
    - **Validates: Requirements 3.3, 4.4, 5.5, 8.2**
    - **Property 7: 非法操作拒绝** — 不满足条件的操作返回 null
    - **Validates: Requirements 4.2, 4.5, 4.6, 5.6, 8.4**

- [x] 6. 实现游戏结束判定与 AI 决策
  - [x] 6.1 实现 hasAnyLegalAction 和 checkGameOver 函数
    - hasAnyLegalAction(board, team)：检查是否有翻牌/走牌/吃牌任一合法操作
    - checkGameOver(board, currentTeam)：一方无棋子或当前方无合法操作则游戏结束
    - 导出函数
    - _Requirements: 7.1, 7.2_

  - [x] 6.2 实现 aiDecide 函数
    - AI 决策优先级：吃牌（优先吃高等级）> 翻牌（随机）> 走牌（随机）
    - 吃牌时优先选择吃对方高等级棋子，避免用高等级棋子同归于尽
    - 无合法操作返回 null
    - 导出函数
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ]* 6.3 编写属性测试：游戏结束判定与 AI 合法性
    - **Property 8: 游戏结束判定** — 一方无棋子则该方失败；当前方无合法操作则当前方失败
    - **Validates: Requirements 7.1, 7.2**
    - **Property 9: PVE 首次翻牌阵营分配** — PVE 模式首次翻牌后 playerTeam 和 aiTeam 正确分配
    - **Validates: Requirements 11.2, 11.4**
    - **Property 10: AI 决策合法性** — AI 返回的操作类型合法，存在吃牌时必须返回 capture，操作可成功执行
    - **Validates: Requirements 13.1, 13.2, 13.5**

- [x] 7. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 8. 实现 UI 层
  - [x] 8.1 创建 index.html 页面结构
    - 模式选择界面（双人对战/人机对战按钮）
    - 石头剪刀布选择界面（PVP双方选择 / PVE玩家选择）
    - 游戏区域：状态栏（当前行动方、回合数、双方剩余棋子数）+ 4×4棋盘（16个 .cell div）+ 游戏规则面板
    - 被吃掉的棋子展示区域（龙队被吃 / 虎队被吃）
    - 操作提示信息区域
    - 游戏结束界面（获胜方信息 + 重新开始按钮）
    - 引用 game.css 和 game.js
    - _Requirements: 1.1, 2.1, 7.3, 7.4, 8.1, 9.2, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 8.2 创建 game.css 样式文件
    - 参考 knife-kills-chicken 的 game.css 样式结构
    - 覆盖层/模式选择/石头剪刀布界面样式
    - 棋盘网格布局（4×4 grid）
    - 棋格样式：背面（?标记）、正面（图片）、空位、龙队/虎队边框颜色
    - 选中高亮、合法目标高亮、吃牌目标高亮、AI操作高亮
    - 状态栏、被吃棋子展示区、规则面板样式
    - 响应式布局（移动端适配）
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.3, 10.4_

  - [x] 8.3 实现 UI 控制器（game.js 下半部分）
    - 在 `if (typeof document !== 'undefined')` 块中实现
    - 渲染器：renderBoard（棋盘渲染）、updateStatus（状态更新）、clearHighlights、highlightTargets
    - 模式选择事件处理：btn-pvp / btn-pve 点击
    - 石头剪刀布事件处理：PVP 双方选择 / PVE 玩家选择 + AI 随机
    - 棋盘点击事件处理：翻牌/选中/走牌/吃牌逻辑分发
    - 选中棋子后高亮可移动和可吃目标
    - 非法操作提示信息显示
    - 游戏结束检测与结果界面显示
    - 重新开始按钮返回模式选择
    - PVE 模式下 AI 操作触发（延迟500-1500ms）、AI 操作高亮、操作期间禁止玩家点击
    - PVE 模式下界面标识玩家方和电脑方阵营
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.4, 5.1, 5.2, 5.3, 5.5, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 9. Final checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 参考 knife-kills-chicken 的代码结构和模式，保持一致的架构风格
- game.js 使用 `if (typeof module !== 'undefined' && module.exports)` 导出纯函数，兼容浏览器和 Node.js 环境
- UI 控制器使用 `if (typeof document !== 'undefined')` 包裹，仅在浏览器环境运行
- 图片资源已存在于 `apps/card-game/dragon-tiger-fight/images/` 目录（龙1-8.jpg, 虎1-8.jpg）
- 属性测试使用 fast-check 库，每个属性测试标注对应的设计文档属性编号
