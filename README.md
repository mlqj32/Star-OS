# Star OS

<p align="center">
  <strong>在 Windows 上运行的应用层桌面环境</strong><br>
  <em>An app-layer desktop environment for Windows — built with Electron & Vue 3</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-28.3.3-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License">
</p>

Star OS 是一款运行在**应用层**的桌面操作系统环境。它在 Windows 上以全屏 Electron 窗口呈现完整桌面体验：多窗口、任务栏、开始菜单、内置应用与 16+ 小游戏，并支持通过「运行」对话框启动任意 Windows 程序、文件或网址。

> Star OS is a full-screen Electron desktop shell with a taskbar, start menu, built-in apps, 16+ mini-games, and 5-language i18n — without replacing the host OS.

---

## 👤 作者与相关项目 Author

| | 链接 |
|---|---|
| 开发者 Developer | **星薇Star** |
| B 站主页 Bilibili | [space.bilibili.com/259516939](https://space.bilibili.com/259516939) |
| 独立游戏《萝薇日记》Steam | [store.steampowered.com/app/4448620](https://store.steampowered.com/app/4448620/_/) |

> 链接与 Star OS 内置「项目说明」卡片一致，欢迎关注 B 站动态或前往 Steam 了解《萝薇日记》。

---

## ✨ 特性 Highlights

| 模块 | 说明 |
|------|------|
| 🖥 **桌面与窗口** | 桌面图标、多窗口拖拽、最小化/最大化/关闭、任务栏切换 |
| 📂 **文件管理器** | 浏览目录、地址栏、前后导航、双击打开文件/文件夹 |
| 🌐 **内置浏览器** | 多标签、前进后退、内嵌网页浏览 |
| 💻 **终端** | 执行系统命令，支持 `cd` 等 Linux 风格路径切换 |
| 🧮 **计算器 / 记事本** | 四则运算；新建/打开/保存文本文件 |
| ⚙️ **设置** | 语言切换、关于、运行入口 |
| 🎮 **16+ 小游戏** | 俄罗斯方块、贪吃蛇、连连看、斗地主、坦克大战、数独等 |
| 🌍 **国际化** | 简体中文 · 繁体中文 · English · 日本語 · 한국어 |
| 🚀 **运行 Windows 应用** | 通过「运行」启动 `.exe`、任意文件路径或 URL |

所有图标均为内联 SVG，无需额外图片资源。

---

## 🚀 快速开始 Quick Start

### 环境要求

- **Node.js** 18+
- **Windows** 10 / 11（宿主系统）

### 安装与运行

```bash
git clone https://github.com/mlqj32/Star-OS.git
cd Star-OS
npm install
npm start
```

启动后将打开全屏窗口，即可当作桌面环境使用。

### 打包构建

```bash
npm run build
# 或双击运行 build-star.bat
# 输出目录: dist/Star OS
```

国内网络可设置 Electron 镜像加速：

```bash
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://mirrors.huaweicloud.com/electron-builder-binaries/
npm install
```

---

## 📖 使用说明

1. **打开应用** — 点击任务栏「开始」，从菜单选择应用或游戏。
2. **运行外部程序** — 开始菜单 →「运行」，或设置 →「运行」，输入：
   - 可执行文件：`C:\Windows\System32\notepad.exe`
   - 文件路径或网址：`https://www.bing.com`
3. **切换语言** — 打开「设置」，在语言下拉框中选择。
4. **终端** — 支持 `dir`、`cd 路径` 等命令（Windows 下通过 `cmd.exe` 执行）。

---

## 📁 项目结构

```
Star-OS/
├── main/
│   └── main.js              # Electron 主进程：窗口、IPC、协议、外部程序
├── renderer/
│   ├── index.html           # 桌面入口
│   ├── styles/main.css      # 全局样式
│   ├── i18n/                # 五语言文案
│   └── js/
│       ├── window-manager.js
│       ├── taskbar.js
│       ├── start-menu.js
│       ├── desktop.js
│       ├── apps-registry.js # 应用注册与界面
│       ├── apps-logic.js    # 各应用交互逻辑
│       ├── main.js          # 初始化
│       └── games/           # 内置小游戏
├── tools/                   # 国际化扫描等开发工具
├── scripts/                 # 构建补丁脚本
├── build-star.bat           # Windows 一键打包
├── package.json
└── README.md
```

---

## 🛠 技术栈

- **[Electron](https://www.electronjs.org/)** 28 — 跨平台桌面壳
- **[Vue 3](https://vuejs.org/)**（CDN）— 部分 UI 响应式
- **原生 JavaScript + CSS** — 桌面、窗口、应用逻辑
- **[node-pty](https://github.com/microsoft/node-pty)** — 终端模拟
- **[xlsx](https://sheetjs.com/)** / **word-extractor** — 文档预览

---

## 🤝 参与贡献

欢迎提交 Issue 与 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -m 'Add my feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 发起 Pull Request

---

## 📄 许可证

MIT License © 星薇Star

---

<p align="center">
  如果这个项目对你有帮助，欢迎 ⭐ Star 支持一下！<br>
  <a href="https://space.bilibili.com/259516939">B 站 · 星薇Star</a>
  ·
  <a href="https://store.steampowered.com/app/4448620/_/">Steam · 《萝薇日记》</a>
</p>
