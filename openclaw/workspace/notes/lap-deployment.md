# Lap 部署笔记

> 2026-08-11 整理。
> 来源：julyx10/lap README + Releases + 实操经验整理。
> 配套项目：<https://github.com/julyx10/lap>

## TL;DR

- **普通用户**：直接装预编译包（macOS 一行 `brew` 搞定）
- **开发者 / 想换 AI 模型 / fork**：从源码编译，要 Node 20+ / pnpm / Rust / Xcode CLT
- **JackLee 的场景**：Mac mini + Synology NAS → SMB 挂载 → Lap 索引挂载点
- **关键约束**：DB 和缩略图缓存必须在本地 SSD，原始照片可以放 NAS

---

## 路径 A：装预编译包（99% 的用户选这条）

### macOS（推荐方式）

```bash
brew tap julyx10/lap
brew install --cask lap
```

或者去 GitHub Releases 直接下 .dmg：
<https://github.com/julyx10/lap/releases/latest>

### Windows

下载 `_x64_en-US.msi` 或 `_arm64_en-US.msi`。
⚠️ 未签名，SmartScreen 拦截时点 "Keep anyway"。

### Linux（Debian/Ubuntu/Mint）

```bash
sudo dpkg -i lap_*_amd64.deb
sudo apt -f install
```

更好的视频播放支持：

```bash
sudo apt install gstreamer1.0-libav gstreamer1.0-plugins-good
```

### 首次启动做了什么

1. 创建本地 DB：`~/Library/Application Support/com.julyx10.lap`
2. 弹窗让你"添加 Library"——选一个文件夹就开始索引
3. 后台下载 AI 模型（首次启动会触发）：
   - CLIP multilingual ~1.5 GB
   - InsightFace buffalo_l ~300 MB
4. Core ML EP 首次编译模型到本地缓存（慢但只一次）

---

## 路径 B：从源码编译

什么时候需要：想换 AI 模型、调样式、看源码、fork、改协议。

### 前置依赖

#### macOS

```bash
xcode-select --install
brew install nasm pkg-config autoconf automake libtool cmake
```

#### Linux（Debian/Ubuntu）

```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf nasm clang pkg-config autoconf automake libtool cmake
```

#### 工具链（一次性）

- **Node.js 20+**：用 nvm 或 `brew install node@20`
- **pnpm**：`npm install -g pnpm` 或 `brew install pnpm`
- **Rust stable**：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Tauri CLI**：`cargo install tauri-cli --version "^2.0.0" --locked`

### 构建步骤

```bash
git clone --recursive https://github.com/julyx10/lap.git
cd lap
git submodule update --init --recursive

# 拉 AI 模型 + FFmpeg sidecar
./scripts/download_models.sh
./scripts/download_ffmpeg_sidecar.sh

# 装前端依赖
cd src-vite && pnpm install && cd ..

# 开发模式（带热重载）
cargo tauri dev

# 或打包 release .app / .dmg / .msi / .deb
cargo tauri build
```

### 编译时间预估（Mac mini M 系列）

| 步骤 | 时间 |
|------|------|
| `cargo tauri build` 首次 | 5–15 分钟 |
| `pnpm install` | 1–3 分钟 |
| 模型下载 | 5–20 分钟（看网速） |
| 增量 `cargo tauri build` | 30 秒 – 2 分钟 |

---

## JackLee 的场景：Mac mini + Synology NAS

### 步骤

1. **SMB 挂载 NAS 照片目录**

   Finder → 前往 → 连接服务器 → `smb://192.168.1.141/Photos`

   挂载点默认在 `/Volumes/Photos`（具体名字看 NAS 共享名）

   或命令行：

   ```bash
   mount_smbfs //jacklee@192.168.1.141/Photos /Volumes/Photos
   ```

2. **首次添加 Library**

   - Lap 启动 → Settings → Library → Add Library
   - 路径选 `/Volumes/Photos`（或 NAS 上的实际路径）
   - **不要把 DB 放在 SMB 上！** DB 路径在 Settings → Storage 改成 `~/Library/Application Support/com.julyx10.lap`（默认就是）

3. **首次索引预期**

   - 10 万张照片：2–8 小时（取决于 SMB 速度 + AI embedding 是否开启）
   - AI embedding 是后台跑的，期间可以正常浏览
   - 建议先用 100–1000 张小目录试水

### ⚠️ 几个坑

| 坑 | 原因 | 解法 |
|----|------|------|
| SMB 索引慢 | 网络 IO 远慢于本地 SSD | 把热点照片复制到本地 SSD 索引 |
| DB 卡 SMB | SQLite 跨网络性能差 | DB 路径改本地（默认就是） |
| 缩略图缓存塞满 SSD | 10 万张可能 1–5 GB | 缓存目录也可改（Settings → Storage） |
| ONNX 首次慢 | Core ML EP 编译模型 | 只慢一次，结果缓存 |
| AI 索引 CPU 满 | InsightFace + CLIP 吃 CPU | Settings 里可以暂停 AI 任务 |

### 性能预期（粗略）

| 操作 | 本地 SSD | SMB 挂载 |
|------|---------|---------|
| 10 万张扫描 | 30–60 分钟 | 2–4 小时 |
| 1 万张 AI embedding | 1–3 小时 | 1–3 小时（CPU bound） |
| 浏览流畅度 | 流畅 | 略卡（缩略图懒加载） |
| 缩略图缓存占用 | 1–5 GB | 1–5 GB |

---

## 卸载

### macOS（brew 装的）

```bash
brew uninstall --cask lap
rm -rf "$HOME/Library/Application Support/com.julyx10.lap"
rm -rf "$HOME/Library/Caches/com.julyx10.lap"
rm -rf "$HOME/Library/WebKit/com.julyx10.lap"
rm -f "$HOME/Library/Preferences/com.julyx10.lap.plist"
```

### macOS（手动装的 .dmg）

```bash
rm -rf /Applications/Lap.app
# 然后跑上面 brew 的清理命令
```

### Windows

设置 → 应用 → 已安装的应用 → Lap → 卸载

然后 PowerShell：

```powershell
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "$env:LOCALAPPDATA\com.julyx10.lap"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "$env:APPDATA\com.julyx10.lap"
```

### Linux

```bash
sudo apt remove lap
rm -rf "$HOME/.local/share/com.julyx10.lap"
rm -rf "$HOME/.cache/com.julyx10.lap"
rm -rf "$HOME/.config/com.julyx10.lap"
```

⚠️ **卸载 DB 会清掉所有标签 / 收藏 / Smart Albums**，但**不影响原图**（folder-first 设计就是这样）。

---

## 故障排查

| 现象 | 可能原因 | 解法 |
|------|---------|------|
| 启动后白屏 | WebView2 没装（Win） | 装 Microsoft Edge WebView2 Runtime |
| AI 搜索无结果 | 模型还没下载完 / 索引没跑完 | 看 Settings → AI Status |
| SMB 挂载断 | NAS 休眠 / 网络抖动 | 重连 SMB，看 `tail -f /var/log/system.log` |
| 缩略图加载慢 | 缓存还没生成 | 首次访问会触发生成，等几秒 |
| InsightFace 误识别人脸 | buffalo_l 模型对小脸 / 侧脸精度有限 | 升级到 buffalo_sc（需自己编译） |

---

## 相关链接

- GitHub：<https://github.com/julyx10/lap>
- 官网：<https://julyx10.github.io/lap/>
- Demo：<https://youtu.be/RbKqNKhbVUs>
- Releases：<https://github.com/julyx10/lap/releases/latest>
- License：GPL-3.0-or-later
- 配套笔记：`memory/2026-08-11.md`
