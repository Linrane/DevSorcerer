<p align="center">
  <h1 align="center">DevSorcerer / 术士</h1>
  <p align="center">
    <b>Black Box for Your AI Coding Agents</b><br>
    <b>AI 开发的可观测仪表盘 — 打开浏览器就能用</b>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.2-purple" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D22-green" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/dashboard-react%2019-61dafb" alt="React 19">
</p>

<p align="center">
  <b>Language / 语言</b> &nbsp;|&nbsp;
  <a href="#english">English</a> &nbsp;|&nbsp;
  <a href="#chinese">中文</a>
</p>

---

> "Git tells you what changed. DevSorcerer tells you why the AI changed it."
> "Git 告诉你代码改了什么，DevSorcerer 告诉你 AI 为什么这么改。"

---

<a id="english"></a>

## English

### Prerequisites

Before anything else, verify these two things in your terminal:

```bash
node --version   # Must be >= 22.0.0
npm --version    # Comes with Node.js
```

| If you see | Solution |
|---|---|
| `node: command not found` | Install Node.js from https://nodejs.org (choose LTS v22.x) |
| Node version < 22 | Upgrade: `npm install -g n && n 22`, or reinstall from nodejs.org |
| `npm: command not found` | npm comes with Node.js — reinstall Node.js (it's included) |
| **Windows**: `npm` works in Bash but not PowerShell | See [Windows: npm not found in PowerShell](#windows-npm-not-found-in-powershell-or-cmd) |

### Quick Start

Clone, install, build, run. Four commands:

```bash
# 1. Get the code
git clone https://github.com/Linrane/DevSorcerer.git
cd DevSorcerer

# 2. Install dependencies
npm install

# 3. Build everything
npm run build

# 4. Start the dashboard
node packages/devsorcerer/bin/devsorcerer.js start
```

Open **http://localhost:3199** in your browser. Done.

> **Optional**: To use the shorter `devsorcerer` command instead of the full `node packages/...` path:
> ```bash
> cd packages/devsorcerer
> npm link
> # Now you can run: devsorcerer start
> ```

### Troubleshooting / Common Errors

#### `node: command not found`

You don't have Node.js installed (or it's not in your PATH).

- **Windows**: Download the installer from https://nodejs.org (v22 LTS, `.msi` file). Run it. **Important**: check the box "Add to PATH" during installation. Restart your terminal after installing.
- **Mac**: `brew install node@22` or download from nodejs.org
- **Linux**: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`

Verify with: `node --version`

#### `npm: command not found`

npm is included with Node.js. If Node.js is installed but npm is not found:

- **Windows**: Re-run the Node.js installer and make sure "npm package manager" is checked. Restart terminal.
- **Mac/Linux**: npm should be in the same directory as node. Check `which node` then verify npm is in the same folder.

#### Windows: npm not found in PowerShell or CMD

This happens when Node.js was installed to a custom path without adding it to the system PATH.

**Fix (pick one):**

Option A — **Use Git Bash** (simplest):
Install Git for Windows (https://git-scm.com), then use "Git Bash" as your terminal. It shares the same PATH as the bash environment where npm already works.

Option B — **Add to PATH manually** (PowerShell, as Administrator):
```powershell
# Find where node.exe is first:
Get-ChildItem -Path C:\ -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 FullName

# Add that directory to your PATH (replace <path> with the actual folder):
[Environment]::SetEnvironmentVariable('Path', $env:Path + ';<path-to-node-folder>', 'User')
```
Close and reopen PowerShell. Run `node --version` to verify.

Option C — **Reinstall Node.js** with the official installer from nodejs.org. Make sure "Add to PATH" is checked.

#### `npm install` fails with `EACCES` (Mac/Linux)

```
npm install -g npm
# or configure npm to use a user-owned directory:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### `npm install` hangs or is very slow

```bash
# Use a mirror (replace with one close to you):
npm config set registry https://registry.npmmirror.com
npm install
```

#### Port 3199 is already in use

```
Error: listen EADDRINUSE :::3199
```

```bash
# Find and kill the process using port 3199:
# Windows:
netstat -ano | findstr :3199
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :3199
kill -9 <PID>
```

#### `node packages/devsorcerer/bin/devsorcerer.js start` says "No such file"

You're not in the project root directory. Make sure you did `cd DevSorcerer` (the cloned folder) first.

Run `ls` (Mac/Linux) or `dir` (Windows) — you should see `package.json` and a `packages/` folder.

### MCP Integration

Add to your agent's MCP config:

```json
{
  "mcpServers": {
    "devsorcerer-filesystem": {
      "command": "devsorcerer",
      "args": ["proxy", "-t", "npx", "--target-args", "-y @anthropic/mcp-server-filesystem", "."]
    }
  }
}
```

Compatible with: Claude Code, Cursor, Windsurf, Continue, Cline, Codex CLI, and any MCP agent.

### CLI Commands

| Command | Description |
|---|---|
| `devsorcerer start` | Start server + dashboard |
| `devsorcerer validate` | Pre-flight checks (config, DB, git, Node.js) |
| `devsorcerer status` | Database stats |
| `devsorcerer analyze cost` | Cost by project / session / tool |
| `devsorcerer analyze risk` | Security scan (SARIF output) |
| `devsorcerer analyze quality` | Acceptance / rollback / bug rate |
| `devsorcerer show <id>` | Session timeline replay |
| `devsorcerer knowledge search` | Semantic search across history |
| `devsorcerer audit export` | Compliance export (JSON/CSV/NDJSON) |
| `devsorcerer config` | Manage configuration |

### Dashboard Pages

| Page | What You See |
|---|---|
| **Overview** | Live stats, cost trend, top tools |
| **Sessions** | All sessions with search |
| **Session Detail** | Step-by-step timeline replay player |
| **Cost Analysis** | Time range filter, per-tool cost table |
| **Risk Findings** | Severity breakdown, per-finding detail |
| **Quality** | Acceptance rate, rollbacks, AI bugs |
| **Knowledge** | Semantic + keyword hybrid search |
| **Audit** | One-click JSON/CSV/NDJSON export |
| **Settings** | Port, DB path, model, toggles |

### Architecture

```
AI Agent (Claude Code, Cursor, etc.)
       │ JSON-RPC 2.0
       ▼
┌──────────────────┐
│  MCP Proxy       │  ← Transparent interception
│  Capture/Forward │──→ SQLite (events, sessions, analysis)
└──────┬───────────┘
       │ JSON-RPC (unchanged)
       ▼
  MCP Server

Analysis: Cost → Risk (8 rules) → Quality → Bottleneck → Knowledge (embeddings + LanceDB)
Dashboard: React 19 + Vite + Recharts + Tailwind 4, 9 pages, real-time via WebSocket
```

### Key Differentiators

| Dimension | Other Tools | DevSorcerer |
|---|---|---|
| Event capture | Per-agent SDK | **Universal MCP proxy** |
| UX | CLI-first | **Dashboard-first** |
| Knowledge | Lost after session | **Vector semantic search** |
| Privacy | Cloud upload | **Local-first** |
| Mobile | Desktop only | **Responsive, any device** |

### Privacy

- **Local-first**: All data in SQLite + LanceDB on your machine
- **Anonymization**: `audit export --scope anonymized`
- **No cloud upload**: Code never leaves your filesystem

---

<a id="chinese"></a>

## 中文

### 前置条件

在开始之前，先在终端里验证两件事：

```bash
node --version   # 必须 >= 22.0.0
npm --version    # 随 Node.js 一起安装
```

| 如果你看到 | 解决方法 |
|---|---|
| `node: command not found` | 从 https://nodejs.org 安装 Node.js（选 LTS v22.x 版本） |
| Node 版本 < 22 | 升级：`npm install -g n && n 22`，或从 nodejs.org 重装 |
| `npm: command not found` | npm 随 Node.js 一起提供 — 重装 Node.js 即可 |
| **Windows**：Bash 里能用 npm，PowerShell 里不行 | 见下方 [Windows：PowerShell 找不到 npm](#windowspowershell-找不到-npm-或-cmd) |

### 快速开始

克隆、安装、构建、运行。四步搞定：

```bash
# 1. 下载代码
git clone https://github.com/Linrane/DevSorcerer.git
cd DevSorcerer

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 启动仪表盘
node packages/devsorcerer/bin/devsorcerer.js start
```

浏览器打开 **http://localhost:3199**。不用再碰命令行了。

> **可选**：把 `devsorcerer` 注册为全局命令，以后在任意目录都能直接敲：
> ```bash
> cd packages/devsorcerer
> npm link
> # 之后直接运行：devsorcerer start
> ```

### 常见报错与解决方法

#### `node: command not found`（找不到 node 命令）

你的电脑没有安装 Node.js，或者装了但没加到 PATH。

- **Windows**：去 https://nodejs.org 下载 v22 LTS 版本（`.msi` 安装包）。安装时**一定要勾选** "Add to PATH" 选项。装完重启终端。
- **Mac**：终端执行 `brew install node@22`，或者去 nodejs.org 下载安装包
- **Linux**：`curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs`

验证：`node --version`

#### `npm: command not found`（找不到 npm 命令）

npm 是 Node.js 自带的。如果 node 装好了但 npm 没有：

- **Windows**：重新运行 Node.js 安装程序，确保勾选 "npm package manager"。重启终端。
- **Mac/Linux**：npm 和 node 在同一个目录。用 `which node` 找到位置，确认 npm 也在同一文件夹。

#### Windows：PowerShell 找不到 npm（或 CMD）

这种情况是 Node.js 装到了自定义路径，但没有写入系统 PATH。

**解决方法（任选一个）：**

方案 A — **用 Git Bash**（最简单）：
安装 Git for Windows（https://git-scm.com），然后用 "Git Bash" 作为终端。在 Git Bash 里 npm 和 node 都能直接使用。

方案 B — **手动添加 PATH**（在管理员 PowerShell 里执行）：
```powershell
# 先找到 node.exe 在哪：
Get-ChildItem -Path C:\ -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 FullName

# 把那个目录加到 PATH（把 <path> 换成上面找到的目录）：
[Environment]::SetEnvironmentVariable('Path', $env:Path + ';<node所在目录的路径>', 'User')
```
关掉重新打开 PowerShell。输入 `node --version` 验证。

方案 C — **重装 Node.js**：从 nodejs.org 下载官方安装程序，安装时确保勾选 "Add to PATH"。

#### `npm install` 报 `EACCES` 错误（Mac/Linux）

权限不够。两种修法：

```bash
# 方法1：用管理员权限
sudo npm install

# 方法2：配置 npm 使用用户目录（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### `npm install` 很慢或卡住

```bash
# 换成国内镜像（例如 npmmirror）：
npm config set registry https://registry.npmmirror.com
npm install
```

#### 端口 3199 被占用

```
Error: listen EADDRINUSE :::3199
```

说明之前启动的 DevSorcerer 还没关，或者有其他程序占用了 3199 端口。

```bash
# Windows：
netstat -ano | findstr :3199
taskkill /PID <进程ID> /F

# Mac/Linux：
lsof -i :3199
kill -9 <进程ID>
```

#### 运行 `node packages/devsorcerer/bin/devsorcerer.js start` 提示文件不存在

你不在项目根目录。确保你先 `cd DevSorcerer`（进入克隆下来的文件夹）。用 `ls`（Mac/Linux）或 `dir`（Windows）应该能看到 `package.json` 和 `packages/` 文件夹。

#### 启动后数据库报错

如果看到类似 `Database not initialized` 的提示：

```bash
# 先运行一次 validate 检查各项配置是否正常
devsorcerer validate

# 然后重新启动
devsorcerer start
```

### MCP 集成

把以下配置加到你的 AI agent 的 MCP 配置中：

```json
{
  "mcpServers": {
    "devsorcerer-filesystem": {
      "command": "devsorcerer",
      "args": ["proxy", "-t", "npx", "--target-args", "-y @anthropic/mcp-server-filesystem", "."]
    }
  }
}
```

兼容：Claude Code、Cursor、Windsurf、Continue、Cline、Codex CLI 等所有 MCP agent。

### CLI 命令一览

| 命令 | 说明 |
|---|---|
| `devsorcerer start` | 启动服务 + 仪表盘 |
| `devsorcerer validate` | 预检（配置、数据库、git、Node.js 版本） |
| `devsorcerer status` | 数据库统计 |
| `devsorcerer analyze cost` | 按项目/会话/工具分析成本 |
| `devsorcerer analyze risk` | 安全扫描（可输出 SARIF 格式） |
| `devsorcerer analyze quality` | 采纳率/回滚率/缺陷率 |
| `devsorcerer show <id>` | 会话时间线回放 |
| `devsorcerer knowledge search` | 跨会话语义搜索 |
| `devsorcerer audit export` | 审计导出（JSON/CSV/NDJSON） |
| `devsorcerer config` | 配置管理 |

### 仪表盘页面

| 页面 | 你能看到 |
|---|---|
| **总览** | 实时统计、成本趋势图、热门工具排行 |
| **会话列表** | 全部会话，支持搜索 |
| **会话详情** | 逐步时间线回放播放器 |
| **成本分析** | 按时间筛，工具级成本明细 |
| **风险扫描** | 严重程度分布，每条风险详情 |
| **质量** | 采纳率、回滚次数、AI 缺陷 |
| **知识搜索** | 语义 + 关键词混合搜索 |
| **审计导出** | 一键 JSON/CSV/NDJSON 导出 |
| **设置** | 端口、数据库、模型、开关 |

### 架构

```
AI Agent（Claude Code、Cursor 等）
       │ JSON-RPC 2.0
       ▼
┌─────────────────┐
│  MCP Proxy      │  ← 透明拦截，不改协议
│  捕获 / 转发    │──→ SQLite（事件、会话、分析）
└─────┬───────────┘
      │ JSON-RPC（不变）
      ▼
  MCP Server

分析层：成本 → 风险（8规则）→ 质量 → 瓶颈 → 知识（向量 + LanceDB）
仪表盘：React 19 + Vite + Recharts + Tailwind 4，9 页面，WebSocket 实时推送
```

### 核心差异化

| 维度 | 其他工具 | DevSorcerer |
|---|---|---|
| 事件捕获 | 每种 agent 单独 SDK | **通用 MCP 代理** |
| 用户体验 | 命令行优先 | **仪表盘优先，打开就能用** |
| 知识 | 会话结束就丢了 | **向量语义搜索** |
| 隐私 | 上传到云端 | **本地优先** |
| 移动端 | 仅桌面 | **响应式，手机也能看** |

### 隐私

- **本地优先**：所有数据存在你的 SQLite + LanceDB 里
- **可匿名**：`audit export --scope anonymized`
- **不上传**：代码和日志不离开你的电脑

---

## Project Structure / 项目结构

```
DevTwin/
├── packages/
│   ├── devsorcerer/          # Core CLI + Engine (TypeScript)
│   │   ├── bin/              # CLI entry point
│   │   └── src/
│   │       ├── collector/    # MCP transparent proxy
│   │       ├── analyzer/     # Cost / Risk / Quality / Bottleneck
│   │       ├── knowledge/    # Embeddings + semantic search
│   │       ├── server/       # Fastify API + WebSocket
│   │       ├── storage/      # SQLite + repositories
│   │       ├── cli/          # Clipanion commands
│   │       └── shared/       # Types, utils, validation
│   └── dashboard/            # React 19 + Vite Web UI
│       └── src/
│           ├── pages/        # 9 pages (Overview → Settings)
│           ├── components/   # Charts, Session, Layout, UI
│           ├── hooks/        # useWebSocket
│           └── api/          # TanStack Query client
└── scripts/install.sh        # Unix installer
```

## License / 许可证

MIT © 2026 DevSorcerer

## Tags / 标签

`ai-agent` `observability` `mcp-protocol` `cost-tracking` `security-scan` `compliance` `claude-code` `cursor` `devtools` `semantic-search` `code-review` `audit-log` `dashboard` `visualization` `real-time` `typescript` `react`
