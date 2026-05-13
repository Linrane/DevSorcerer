<p align="center">
  <h1 align="center">DevSorcerer / 术士</h1>
  <p align="center">
    <b>Black Box for Your AI Coding Agents — No CLI Required</b><br>
    <b>AI 开发的可观测仪表盘 — 无需命令行，打开浏览器就能用</b>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-purple" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D22-green" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/dashboard-react%2019-61dafb" alt="React 19">
  <img src="https://img.shields.io/badge/responsive-yes-success" alt="Responsive">
</p>

<p align="center">
  <b>Language / 语言</b> &nbsp;|&nbsp;
  <a href="#english">English</a> &nbsp;|&nbsp;
  <a href="#chinese">中文</a>
</p>

---

<p align="center">
  <i>"Git tells you what changed. DevSorcerer tells you why the AI changed it."</i><br>
  <i>"Git 告诉你代码改了什么，DevSorcerer 告诉你 AI 为什么这么改。"</i>
</p>

---

<a id="english"></a>

## English

### Why DevSorcerer?

| Pain Point | Without DevSorcerer | With DevSorcerer |
|---|---|---|
| "What is the AI doing?" | Black box, no visibility | **Real-time web dashboard**, every tool call visible |
| "How much is this costing?" | Surprise at end of month | Drill down by **project / session / tool** |
| "Is the AI writing secure code?" | Manual code review | **8 security rules**, diff-level scanning |
| "Why does the AI keep failing?" | No idea, repeated failures | **Timeline replay + error loop detection** |
| "How do I audit this?" | Manual log collection | **One-click export** for SOC2/ISO audits |
| "How did we fix this last time?" | Forgotten, start over | **Semantic search** across all history |

### Quick Start

```bash
npm install -g devsorcerer
devsorcerer start
# Open http://localhost:3199 — no CLI needed beyond this!
```

Open your browser. Everything else is point-and-click.

#### From Source

```bash
git clone https://github.com/Linrane/DevSorcerer.git
cd DevSorcerer
npm install
npm run build
node packages/devsorcerer/bin/devsorcerer.js start
# Open http://localhost:3199
```

### Dashboard at a Glance — 9 Pages, Zero Learning Curve

| Page | What You See |
|---|---|
| **Overview** | Live stats, cost trend chart, top tools, "what DevSorcerer tells you" guide |
| **Sessions** | All sessions with search, desktop table + mobile cards |
| **Session Detail** | Step-by-step **timeline replay player**, error loop detection, tool breakdown |
| **Cost Analysis** | Time range filter (7d/30d/90d), per-tool cost table with % bars |
| **Risk Findings** | Severity breakdown bars, per-finding detail with code snippets |
| **Quality** | Acceptance rate, rollbacks, AI bugs, radar chart |
| **Knowledge** | Semantic + keyword hybrid search, context expansion |
| **Audit** | One-click JSON/CSV/NDJSON export, full or anonymized |
| **Settings** | Port, DB path, model, toggles with live preview |

### Key Features

- **Real-time WebSocket** — live event streaming, auto-reconnect with backoff
- **Timeline Replay Player** — play/pause/speed control, step-by-step with error markers
- **Responsive Design** — works on desktop, tablet, and mobile (collapsible sidebar)
- **Skeleton Loading** — smooth loading states everywhere
- **Error Boundary** — graceful error handling, never white-screens
- **Bilingual** — all UI text in English, architecture fully intl-ready

### MCP Integration (Zero Code Changes)

Add to your agent's MCP config — any MCP-compatible agent works:

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

Compatible: Claude Code, Cursor, Windsurf, Continue, Cline, Codex CLI, and any MCP agent.

### CLI Commands (Advanced Users)

| Command | Description |
|---|---|
| `devsorcerer start` | Start server + dashboard |
| `devsorcerer proxy -t <cmd>` | MCP proxy for agent |
| `devsorcerer status` | Database stats |
| `devsorcerer dashboard` | Open dashboard in browser |
| `devsorcerer analyze cost` | Cost by project/session/tool |
| `devsorcerer analyze risk` | Security scan with SARIF |
| `devsorcerer analyze quality` | Acceptance/rollback/bug rate |
| `devsorcerer show <id>` | Timeline/chain/errors replay |
| `devsorcerer knowledge search` | Semantic search |
| `devsorcerer audit export` | Compliance export |
| `devsorcerer config` | Config management |

### Architecture

```
AI Agent (Claude Code, Cursor, etc.)
       │ JSON-RPC 2.0
       ▼
┌──────────────────┐
│  MCP Proxy       │  ← Transparent interception
│  ┌────────────┐  │
│  │ Capture    │──┼──→ SQLite (events, sessions, analysis)
│  │ Forward    │  │
│  │ Enrich     │  │
│  └────────────┘  │
└──────┬───────────┘
       │ JSON-RPC (unchanged)
       ▼
  MCP Server

Analysis Layer:
  Cost Analyzer        → Token/cost per project, session, tool
  Risk Analyzer        → 8 security rules, regex + AST scanning
  Quality Analyzer     → Acceptance / rollback / bug rate from git blame
  Bottleneck Analyzer  → Error loop detection, slow tool ranking
  Knowledge Engine     → Embeddings + LanceDB + hybrid search

Web Dashboard (React 19 + Vite + Recharts + Tailwind 4):
  Overview → Sessions → Session Detail (replay player) →
  Cost → Risk → Quality → Knowledge → Audit → Settings
  All responsive, all real-time via WebSocket.
```

### What's New in v0.2.0

- **Visual-First Dashboard** — redesigned all 9 pages for non-technical users
- **Timeline Replay Player** — play/pause/speed control for session time travel
- **Real-time WebSocket** — live event streaming replaces polling
- **Responsive Design** — mobile sidebar, responsive tables, works on any device
- **Loading Skeletons** — smooth loading everywhere, no more "Loading..." text
- **Error Boundary** — proper error handling, never a blank screen
- **SPA Fallback** — server serves dashboard static files, single `devsorcerer start` does it all
- **Bug Fixes**: CostAnalysis all-sessions mode, AuditExport project dropdown, Settings toggle CSS, Risk severity bars, Overview total cost accuracy
- **12+ UI/UX improvements**: breadcrumbs, tooltips, empty states, context expansion, search highlighting

### Key Differentiators

| Dimension | Other Tools | DevSorcerer |
|---|---|---|
| Event capture | Per-agent SDK | **Universal MCP proxy** |
| Cost analysis | Basic token count | **Tool-level attribution** |
| Security | Separate SAST tool | **Built-in diff scanning** |
| Compliance | Manual log export | **One-click export** |
| Knowledge | Lost after session | **Vector semantic search** |
| **UX** | **CLI-first** | **Dashboard-first, zero CLI** |
| Privacy | Cloud upload | **Local-first + anonymization** |
| **Mobile** | **Desktop only** | **Responsive, any device** |

### Privacy

- **Local-first**: All data in SQLite + LanceDB on your machine
- **Differential privacy**: `audit export --scope anonymized` strips identifiers
- **No cloud upload**: Code never leaves your filesystem
- **Configurable**: `devsorcerer config set captureEnabled false`

---

<a id="chinese"></a>

## 中文

### 为什么需要 DevSorcerer？

| 痛点 | 没有它 | 有了它 |
|---|---|---|
| "AI 在干什么？" | 黑盒，完全不知道 | **实时网页仪表盘**，每个工具调用都可见 |
| "花了多少钱？" | 月底看账单吓一跳 | 按项目/会话/工具**逐级下钻**，随时掌控 |
| "AI 写的代码安全吗？" | 手动 Code Review | **8 条安全规则自动扫描**，diff 级别检测 |
| "AI 为什么老是做错？" | 不知道，重复失败 | **时间线回放 + 错误循环检测**，一眼找到根因 |
| "怎么合规审计？" | 手工整理日志 | **一键导出** SOC2/ISO 审计报告 |
| "上次怎么解决的？" | 忘了，重头再来 | **语义搜索**，跨所有历史会话查找 |

### 快速开始

```bash
npm install -g devsorcerer
devsorcerer start
# 打开 http://localhost:3199 即可使用
```

打开浏览器即可使用，无需再碰命令行。

#### 从源码构建

```bash
git clone https://github.com/Linrane/DevSorcerer.git
cd DevSorcerer
npm install
npm run build
node packages/devsorcerer/bin/devsorcerer.js start
# 打开 http://localhost:3199
```

### 仪表盘一览 — 9 个页面，零学习成本

| 页面 | 你能看到 |
|---|---|
| **总览** | 实时统计、成本趋势图、热门工具、"DevSorcerer 告诉你什么"指南 |
| **会话列表** | 全部会话，支持搜索，桌面端表格 + 移动端卡片 |
| **会话详情** | 逐步**时间线回放播放器**、错误循环检测、工具分类统计 |
| **成本分析** | 时间范围筛选（7天/30天/90天），按工具成本表格及占比条 |
| **风险扫描** | 严重程度分布条、每条风险详情及代码片段 |
| **质量** | 采纳率、回滚次数、AI 缺陷、雷达图 |
| **知识搜索** | 语义 + 关键词混合搜索，上下文展开 |
| **审计导出** | 一键 JSON/CSV/NDJSON 导出，完整或匿名 |
| **设置** | 端口、数据库路径、模型、开关实时预览 |

### 核心特性

- **实时 WebSocket** — 实时事件流推送，断线自动重连（指数退避）
- **时间线回放播放器** — 播放/暂停/速度控制，逐步回放带错误标记
- **响应式设计** — 桌面端、平板、手机均可使用（可折叠侧边栏）
- **骨架屏加载** — 各处流畅的加载状态
- **错误边界** — 优雅的错误处理，永不会白屏
- **双语架构** — 所有 UI 文本为英文，架构完全支持国际化

### MCP 集成（零代码改动）

将以下配置添加到你的 agent 的 MCP 配置中——任何 MCP 兼容的 agent 均可使用：

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

兼容：Claude Code、Cursor、Windsurf、Continue、Cline、Codex CLI 及任何 MCP agent。

### 命令行（高级用户）

| 命令 | 说明 |
|---|---|
| `devsorcerer start` | 启动服务 + 仪表盘 |
| `devsorcerer proxy -t <cmd>` | MCP 代理模式 |
| `devsorcerer status` | 数据库统计 |
| `devsorcerer dashboard` | 在浏览器中打开仪表盘 |
| `devsorcerer analyze cost` | 按项目/会话/工具分析成本 |
| `devsorcerer analyze risk` | 安全漏洞扫描（SARIF 格式） |
| `devsorcerer analyze quality` | 采纳率/回滚率/缺陷率分析 |
| `devsorcerer show <id>` | 时间线/调用链/错误回放 |
| `devsorcerer knowledge search` | 语义搜索 |
| `devsorcerer audit export` | 合规导出 |
| `devsorcerer config` | 配置管理 |

### 架构

```
AI Agent (Claude Code, Cursor 等)
       │ JSON-RPC 2.0
       ▼
┌──────────────────┐
│  MCP Proxy       │  ← 透明拦截
│  ┌────────────┐  │
│  │ 捕获       │──┼──→ SQLite (事件、会话、分析)
│  │ 转发       │  │
│  │ 增强       │  │
│  └────────────┘  │
└──────┬───────────┘
       │ JSON-RPC (不变)
       ▼
  MCP Server

分析层:
  成本分析器    → 按项目/会话/工具的 Token/成本
  风险分析器    → 8 条安全规则，正则 + AST 扫描
  质量分析器    → 采纳率/回滚率/缺陷率（基于 git blame）
  瓶颈分析器    → 错误循环检测、慢工具排序
  知识引擎      → 嵌入向量 + LanceDB + 混合搜索

Web 仪表盘 (React 19 + Vite + Recharts + Tailwind 4):
  总览 → 会话 → 会话详情（回放播放器）→
  成本 → 风险 → 质量 → 知识 → 审计 → 设置
  全响应式、全实时 WebSocket 推送。
```

### v0.2.0 更新内容

- **可视化优先仪表盘** — 为非技术用户重新设计了全部 9 个页面
- **时间线回放播放器** — 播放/暂停/速度控制，会话时间旅行
- **实时 WebSocket** — 实时事件流替代轮询
- **响应式设计** — 移动端侧边栏、响应式表格，任何设备都能用
- **骨架屏加载** — 各处流畅加载，告别"Loading..."文字
- **错误边界** — 完善的错误处理，永不会出现空白页
- **SPA 回退** — 服务端直接托管仪表盘静态文件，一条 `devsorcerer start` 搞定
- **Bug 修复**：成本分析全会话模式、审计导出项目下拉框、设置开关 CSS、风险严重程度条、总览总成本准确性
- **12+ UI/UX 改进**：面包屑、提示框、空状态、上下文展开、搜索高亮

### 核心差异化

| 维度 | 其他工具 | DevSorcerer |
|---|---|---|
| 事件捕获 | 每种 agent 单独 SDK | **通用 MCP 代理** |
| 成本分析 | 基础 Token 计数 | **工具级归因** |
| 安全 | 单独的 SAST 工具 | **内置 diff 扫描** |
| 合规 | 手动导出日志 | **一键导出** |
| 知识 | 会话结束后丢失 | **向量语义搜索** |
| **用户体验** | **命令行优先** | **仪表盘优先，零 CLI** |
| 隐私 | 上传到云端 | **本地优先 + 匿名化** |
| **移动端** | **仅桌面端** | **响应式，任何设备** |

### 隐私

- **本地优先**：所有数据存储在本地 SQLite + LanceDB
- **差分隐私**：`audit export --scope anonymized` 去除标识符
- **无云端上传**：代码不会离开你的文件系统
- **可配置**：`devsorcerer config set captureEnabled false`

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
│   │       ├── server/       # Fastify API + WebSocket + static
│   │       ├── storage/      # SQLite + repositories
│   │       └── cli/          # Clipanion commands
│   └── dashboard/            # React 19 + Vite Web UI
│       └── src/
│           ├── pages/        # 9 pages (Overview → Settings)
│           ├── components/   # Charts, Session, Layout, UI
│           ├── hooks/        # useWebSocket
│           └── api/          # TanStack Query client
└── scripts/install.sh        # curl | sh installer
```

## License / 许可证

MIT © 2026 DevSorcerer

## Tags / 标签

`ai-agent` `observability` `mcp-protocol` `cost-tracking` `security-scan` `compliance` `claude-code` `cursor` `devtools` `semantic-search` `code-review` `audit-log` `dashboard` `visualization` `real-time` `typescript` `react`
