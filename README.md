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

---

> "Git tells you what changed. DevSorcerer tells you why the AI changed it."  
> "Git 告诉你代码改了什么，DevSorcerer 告诉你 AI 为什么这么改。"

DevSorcerer turns your AI coding process from a black box into a **beautiful, real-time dashboard**. Open a browser, see everything your AI agents are doing — cost, security, quality, failures. No CLI needed.

DevSorcerer（术士）把 AI 编程从黑盒变成**直观的网页仪表盘**。打开浏览器，就能看到 AI 在干什么——花了多少钱、写了什么代码、有没有安全漏洞、为什么失败。**不需要命令行。**

---

## Why DevSorcerer? / 为什么需要它？

| Pain Point / 痛点 | Without DevSorcerer / 没有它 | With DevSorcerer / 有了它 |
|---|---|---|
| "AI 在干什么？" | 黑盒，完全不知道 | **实时网页仪表盘**，每个工具调用都可见 |
| "花了多少钱？" | 月底看账单吓一跳 | 按项目/会话/工具**逐级下钻**，随时掌控 |
| "AI 写的代码安全吗？" | 手动 Code Review | **8 条安全规则自动扫描**，diff 级别检测 |
| "AI 为什么老是做错？" | 不知道，重复失败 | **时间线回放 + 错误循环检测**，一眼找到根因 |
| "怎么合规审计？" | 手工整理日志 | **一键导出** SOC2/ISO 审计报告 |
| "上次怎么解决的？" | 忘了，重头再来 | **语义搜索**，跨所有历史会话查找 |

---

## Quick Start / 快速开始

```bash
npm install -g devsorcerer
devsorcerer start
# Open http://localhost:3199 — no CLI needed beyond this!
```

Open your browser. That's it. Everything else is point-and-click.

打开浏览器即可使用，无需再碰命令行。

### From Source / 从源码构建

```bash
git clone https://github.com/Linrane/DevSorcerer.git
cd DevSorcerer
npm install
npm run build
node packages/devsorcerer/bin/devsorcerer.js start
# Open http://localhost:3199
```

---

## Dashboard at a Glance / 仪表盘一览

### 9 Pages, Zero Learning Curve / 9 个页面，零学习成本

| Page / 页面 | What You See / 你能看到 |
|---|---|
| **Overview / 总览** | Live stats, cost trend chart, top tools, "what DevSorcerer tells you" guide |
| **Sessions / 会话列表** | All sessions with search, desktop table + mobile cards |
| **Session Detail / 会话详情** | Step-by-step **timeline replay player**, error loop detection, tool breakdown |
| **Cost Analysis / 成本分析** | Time range filter (7d/30d/90d), per-tool cost table with % bars |
| **Risk Findings / 风险扫描** | Severity breakdown bars, per-finding detail with code snippets |
| **Quality / 质量** | Acceptance rate, rollbacks, AI bugs, radar chart |
| **Knowledge / 知识搜索** | Semantic + keyword hybrid search, context expansion |
| **Audit / 审计导出** | One-click JSON/CSV/NDJSON export, full or anonymized |
| **Settings / 设置** | Port, DB path, model, toggles with live preview |

### Key Features / 核心特性

- **Real-time WebSocket** — live event streaming, auto-reconnect with backoff
- **Timeline Replay Player** — play/pause/speed control, step-by-step with error markers
- **Responsive Design** — works on desktop, tablet, and mobile (collapsible sidebar)
- **Skeleton Loading** — smooth loading states everywhere
- **Error Boundary** — graceful error handling, never white-screens
- **Bilingual** — all UI text in English, architecture fully intl-ready

---

## MCP Integration / MCP 集成（零代码改动）

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

---

## CLI Commands / 命令行（高级用户）

| Command | Description |
|---|---|
| `devsorcerer start` | Start server + dashboard / 启动服务 + 仪表盘 |
| `devsorcerer proxy -t <cmd>` | MCP proxy for agent / MCP 代理模式 |
| `devsorcerer status` | Database stats / 数据库统计 |
| `devsorcerer dashboard` | Open dashboard in browser / 打开仪表盘 |
| `devsorcerer analyze cost` | Cost by project/session/tool / 成本分析 |
| `devsorcerer analyze risk` | Security scan with SARIF / 安全漏洞扫描 |
| `devsorcerer analyze quality` | Acceptance/rollback/bug rate / 质量分析 |
| `devsorcerer show <id>` | Timeline/chain/errors replay / 时间线回放 |
| `devsorcerer knowledge search` | Semantic search / 语义搜索 |
| `devsorcerer audit export` | Compliance export / 合规导出 |
| `devsorcerer config` | Config management / 配置管理 |

---

## Architecture / 架构

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

Analysis Layer / 分析层:
  Cost Analyzer        → Token/cost per project, session, tool
  Risk Analyzer        → 8 security rules, regex + AST scanning
  Quality Analyzer     → Acceptance / rollback / bug rate from git blame
  Bottleneck Analyzer  → Error loop detection, slow tool ranking
  Knowledge Engine     → Embeddings + LanceDB + hybrid search

Web Dashboard / Web 仪表盘 (React 19 + Vite + Recharts + Tailwind 4):
  Overview → Sessions → Session Detail (replay player) →
  Cost → Risk → Quality → Knowledge → Audit → Settings
  All responsive, all real-time via WebSocket.
```

---

## What's New in v0.2.0 / v0.2.0 更新

- **Visual-First Dashboard** — redesigned all 9 pages for non-technical users
- **Timeline Replay Player** — play/pause/speed control for session time travel
- **Real-time WebSocket** — live event streaming replaces polling
- **Responsive Design** — mobile sidebar, responsive tables, works on any device
- **Loading Skeletons** — smooth loading everywhere, no more "Loading..." text
- **Error Boundary** — proper error handling, never a blank screen
- **SPA Fallback** — server serves dashboard static files, single `devsorcerer start` does it all
- **Bug Fixes**: CostAnalysis all-sessions mode, AuditExport project dropdown, Settings toggle CSS, Risk severity bars, Overview total cost accuracy
- **12+ UI/UX improvements**: breadcrumbs, tooltips, empty states, context expansion, search highlighting

---

## Key Differentiators / 核心差异化

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

---

## Project Structure / 项目结构

```
DevTwin/
├── packages/
│   ├── devsorcerer/          # Core CLI + Engine (TypeScript)
│   │   ├── bin/              # CLI entry point (JS)
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

---

## Privacy / 隐私

- **Local-first**: All data in SQLite + LanceDB on your machine
- **Differential privacy**: `audit export --scope anonymized` strips identifiers
- **No cloud upload**: Code never leaves your filesystem
- **Configurable**: `devsorcerer config set captureEnabled false`

---

## License / 许可证

MIT © 2026 DevSorcerer

---

## Tags / 标签

`ai-agent` `observability` `mcp-protocol` `cost-tracking` `security-scan` `compliance` `claude-code` `cursor` `devtools` `semantic-search` `code-review` `audit-log` `dashboard` `visualization` `real-time` `typescript` `react`
