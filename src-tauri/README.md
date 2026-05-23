# Tauri Desktop Build

将本项目（纯静态前端）以 [Tauri 2](https://tauri.app/) 套壳，输出 Windows / macOS / Linux 原生安装包。

## 目录结构

```
src-tauri/
  Cargo.toml             # Rust 包定义（依赖 tauri 2.x）
  build.rs               # tauri-build hook
  tauri.conf.json        # Tauri 主配置（窗口、CSP、bundle 目标等）
  capabilities/
    default.json         # 主窗口权限集（仅 core:default，无额外原生 API）
  src/
    main.rs              # 二进制入口（release 时隐藏 Windows 控制台）
    lib.rs               # 实际启动逻辑
  icons/                 # 由 `npm run tauri:icon` 从 images/pwa-icon.svg 生成（不入库）
  target/                # cargo 构建产物（不入库）
```

`scripts/build-dist.mjs` 会把项目根目录的前端资源复制到 `dist/`，再由 Tauri 作为 `frontendDist` 打包。

## 一次性准备（开发机）

1. **安装 Rust 工具链**：https://rustup.rs/
2. **平台原生依赖**：
   - Windows：装好 [WebView2 运行时](https://developer.microsoft.com/microsoft-edge/webview2/)（Win11 自带）和 Visual Studio C++ Build Tools。
   - macOS：`xcode-select --install`。
   - Linux：`libwebkit2gtk-4.1-dev`、`librsvg2-dev`、`patchelf` 等，详见 `.github/workflows/desktop-release.yml` 的 apt 列表。
3. **安装项目依赖**：
   ```bash
   npm install
   ```
4. **生成平台图标**（首次或 SVG 改动后执行）：
   ```bash
   npm run tauri:icon
   ```

## 本地开发

```bash
npm run tauri:dev
```

会先执行 `npm run build:dist` 把静态资源拷到 `dist/`，再启动 Tauri，加载 `dist/index.html`。

## 本地打包

```bash
npm run tauri:build
```

产物位置：

| 平台 | 产物 |
|------|------|
| Windows | `src-tauri/target/release/bundle/msi/*.msi`、`src-tauri/target/release/bundle/nsis/*.exe` |
| macOS | `src-tauri/target/release/bundle/dmg/*.dmg`、`src-tauri/target/release/bundle/macos/*.app` |
| Linux | `src-tauri/target/release/bundle/deb/*.deb`、`src-tauri/target/release/bundle/rpm/*.rpm`、`src-tauri/target/release/bundle/appimage/*.AppImage` |

## CI / 自动发行

`.github/workflows/desktop-release.yml` 会在以下情况触发：

- 推送 `v*` 标签（如 `v1.0.0`）：四个 runner（Win x64、Linux x64、macOS Intel、macOS ARM）并行构建，结果聚合到一个**草稿** GitHub Release，确认无误后手动发布。
- 手动 `workflow_dispatch`：仅做构建验证，不发布。

## 关于 Service Worker

Tauri 通过自定义协议 `tauri://` 提供前端资源，浏览器侧的 PWA Service Worker 在该协议下既冗余又可能注册失败。`js/common.js` 已经做了运行时检测：在 Tauri 环境（`window.__TAURI__` 等存在）下直接跳过 SW 注册，普通浏览器/GitHub Pages 行为不变。

## 关于 CSP

`tauri.conf.json` 中的 `app.security.csp` 已为以下外部域名放行：

- `https://hm.baidu.com` —— 百度统计
- `https://cdn.jsdelivr.net` —— jQuery / slotmachine

如新增其他 CDN 或统计源，需同步更新 CSP，否则会被 Tauri WebView 拦截。
