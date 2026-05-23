# 项目规则

## README 同步

每次修改内容后，检查项目实际状态是否与 `README.md` 描述一致。如果不一致（如游戏数量、分类、文件结构等发生变化），必须同步更新 README。

## sitemap 同步

每次修改内容后，检查项目实际状态是否与 `sitemap.xml` 描述一致。如果不一致（如游戏数量、分类、文件结构等发生变化），必须同步更新 sitemap。

## 测试稳定性

每次修改后，运行 `npm test` 确保所有已有用例通过。

如果用例失败：
- 如果是代码 bug 导致的，修复代码
- 如果确实需要修改用例才能适配新逻辑，必须先征得开发者同意，不得擅自修改

## 代码格式检查

每次修改后，运行 `npm run lint` 确保代码格式符合规范。如果格式检查失败，修复代码格式后再提交。

## Service Worker (`sw.js`) 维护

修改 `sw.js` 时必须遵守以下要求，否则会导致用户 PWA 缓存出现不一致或更新失败。

- **bump `VERSION`**：只要修改 `sw.js` 的逻辑或 `PRECACHE_URLS` 列表，必须把顶部的 `VERSION` 常量改成新值（例如 `2026-05-24-1`）。`CACHE_NAME` 由 `VERSION` 拼接而来，新 cache 名才能让 `activate` 阶段删掉旧 cache。
- **同步 `PRECACHE_URLS`**：当新增、改名、删除"全站共享的根级资源"（如 `js/common.js`、`css/index.css`、`images/pwa-icon.svg`、`manifest.webmanifest`）时，必须同步更新 `PRECACHE_URLS`。每个游戏自己的 `game.css` / `game.js` **不要**加入预缓存，它们由运行时 stale-while-revalidate 自动管理。
- **保留缓存策略边界**：HTML / 导航请求走 network-first，同源静态资源走 stale-while-revalidate；跨域请求**默认直通不缓存**，只有 `CROSS_ORIGIN_PRECACHE` 白名单里的 CDN 脚本/样式才会预缓存并走 SWR。改动 `fetch` handler 时不要破坏这四条分流。
- **维护跨域白名单**：当 HTML 中新增 / 改动 / 删除 CDN 引用（jsdelivr 上的 jQuery、slotmachine 等）时，必须同步更新 `CROSS_ORIGIN_PRECACHE`。**绝不要**把分析统计类（如百度统计、Google Analytics）加入白名单——统计请求本来就该有就有、没就没。
- **保留 kill switch**：`?nosw=1` 必须仍能注销所有 SW 并清空 cache（实现在 `js/common.js` 里）。改 SW 注册逻辑时不要破坏它。
- **不要拦截 `sw.js` 自身**：fetch handler 必须保留 `if (url.pathname.endsWith("/sw.js")) return;`，否则浏览器拿不到新版 sw.js，更新机制会卡住。
- **预缓存路径用相对形式**：`PRECACHE_URLS` 全部以 `./` 开头，确保 GitHub Pages 的 `/childhood/` 子路径部署也能正确解析。

## Git 提交

commit message 使用英文。

## Tauri 桌面打包

修改前端资源时不需要额外动作；但以下情况必须同步维护 `src-tauri/` 配置：

- **新增 / 删除根目录顶级文件夹**（除 `apps/`、`css/`、`images/`、`js/` 之外）：检查 `scripts/build-dist.mjs` 的 `INCLUDE_DIRS` 是否需要扩列。该脚本决定哪些资源会被复制进 `dist/` 进入安装包。
- **新增 / 改动 / 删除 CDN 引用**：除了 `sw.js` 的白名单同步外，必须同步更新 `src-tauri/tauri.conf.json` 中 `app.security.csp` 的 `script-src` / `style-src` / `connect-src`。Tauri WebView 默认按这条 CSP 拦截，漏改会导致桌面端白屏或资源 404。
- **新增 / 改动 / 删除统计上报域名**：CSP 的 `connect-src` 需同步更新；`script-src`/`img-src` 视上报方式而定。
- **改动 `images/pwa-icon.svg`**：在本地执行 `npm run tauri:icon` 重新生成各平台图标。CI 已经会自动重新生成，但本地构建前要手动跑一次。
- **不要把 `*.test.js`、`sonar-report.xml`、`sw.js` 等加入 `dist/`**：`scripts/build-dist.mjs` 的过滤规则保证它们不进安装包；如调整规则，要保持测试文件、CI 元数据、SEO 文件被排除。

详见 `src-tauri/README.md`。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **childhood** (2943 symbols, 5558 relationships, 259 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/childhood/context` | Codebase overview, check index freshness |
| `gitnexus://repo/childhood/clusters` | All functional areas |
| `gitnexus://repo/childhood/processes` | All execution flows |
| `gitnexus://repo/childhood/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
