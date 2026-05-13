<p align="center">
  <h1 align="center">DevSorcerer / 术士</h1>
  <p align="center">
    <b>Black Box for Your AI Coding Agents</b><br>
    <b>AI 开发的仪表盘与黑匣子</b>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-purple" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D22-green" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
</p>

---

> "Git tells you what changed. DevSorcerer tells you why the AI changed it."  
> "Git 告诉你代码改了什么，DevSorcerer 告诉你 AI 为什么这么改。"

DevSorcerer is an AI development observability platform — capturing every tool call, analyzing cost/risk/quality, and making AI coding processes transparent and auditable.

DevSorcerer（术士）是一个 AI 开发可观测性平台——捕获每一次工具调用，分析成本/风险/质量，让 AI 编程从黑盒变成透明仪表盘。

---

## What DevSorcerer Can Do / DevSorcerer 能干嘛

| Your Question / 你想知道 | DevSorcerer Answers / 怎么告诉你 |
|---|---|
| Why did this AI task cost so much? / 为什么花了这么多钱？ | `devsorcerer analyze cost` — token cost per tool call, by project/branch/date |
| Is AI-generated code secure? / AI 写的代码安不安全？ | `devsorcerer analyze risk` — scans diffs for security vulnerabilities |
| Why does AI keep failing? / 为什么 AI 老是做错？ | `devsorcerer show <session>` — replays thinking chain, highlights error loops |
| What's the ROI of AI coding? / AI 投资回报怎么样？ | `devsorcerer analyze quality` — acceptance rate, rollback rate, AI bug rate |
| How to comply with SOC2/ISO? / 怎么合规审计？ | `devsorcerer audit export` — timestamped agent event logs with HMAC |
| How did we solve that bug before? / 上次怎么解决那个 bug 的？ | `devsorcerer knowledge search "concurrent lock"` — semantic search across all sessions |

## Quick Start / 快速开始

```bash
npm install -g devsorcerer
devsorcerer start
# Open http://localhost:3199
```

### From Source / 从源码构建

```bash
git clone https://github.com/your-username/DevSorcerer.git
cd DevSorcerer
npm install
npm run build
node packages/devsorcerer/bin/devsorcerer.js start
```

## CLI Commands / 命令行

| Command / 命令 | Description / 描述 |
|---|---|
| `devsorcerer start` | Start collector + dashboard / 启动采集器和仪表盘 |
| `devsorcerer proxy -t <cmd>` | Run as MCP proxy for agent config / 作为 MCP 代理运行 |
| `devsorcerer status` | Database & session stats / 数据库与会话统计 |
| `devsorcerer dashboard` | Open dashboard in browser / 打开仪表盘 |
| | |
| `devsorcerer analyze cost --project <n>` | Cost by project / 项目成本分析 |
| `devsorcerer analyze risk --session <id>` | Security scan / 安全漏洞扫描 |
| `devsorcerer analyze quality --project <n>` | Acceptance/rollback rate / 采纳率/回滚率 |
| | |
| `devsorcerer show <session-id>` | Timeline replay / 时间线回放 |
| `devsorcerer show <id> --chain` | Thinking chain / 思维链视图 |
| `devsorcerer show <id> --errors` | Error-only view / 错误视图 |
| | |
| `devsorcerer knowledge search "query"` | Semantic search / 语义搜索 |
| `devsorcerer audit export --format ndjson` | Compliance export / 合规审计导出 |
| `devsorcerer config show \| set \| get` | Config management / 配置管理 |

## MCP Integration / MCP 集成（零代码改动）

Add to your agent's MCP config —— 任何 MCP 协议兼容的 Agent 即插即用：

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

Compatible agents: Claude Code, Cursor, Windsurf, Continue, Cline, Codex CLI, and any MCP-compatible agent.

## Architecture / 架构

```
AI Agent (Claude Code, Cursor, etc.)
       │ JSON-RPC 2.0
       ▼
┌──────────────────┐
│  MCP Proxy       │  ← Transparent interception, zero modification
│  ┌────────────┐  │
│  │ Capture    │──┼──→ SQLite (events, sessions, analysis)
│  │ Forward    │  │
│  │ Enrich     │  │
│  └────────────┘  │
└──────┬───────────┘
       │ JSON-RPC (unchanged)
       ▼
  MCP Server (filesystem, github, puppeteer...)

Analysis Layer / 分析层:
  Cost Analyzer        → Token/cost per project, session, tool
  Risk Analyzer        → 8 security rules, regex + AST scanning
  Quality Analyzer     → Acceptance / rollback / bug rate from git blame
  Bottleneck Analyzer  → Error loop detection, slow tool ranking
  Knowledge Engine     → Embeddings + LanceDB + hybrid search

Web Dashboard / Web 仪表盘 (React + Vite + Recharts + Tailwind):
  Overview → Sessions → Session Detail (timeline replay) →
  Cost Analysis → Risk Findings → Quality Metrics →
  Knowledge Search → Audit Export → Settings
```

## Key Differentiators / 核心差异化

| Dimension / 维度 | Other Tools / 其他工具 | DevSorcerer / 术士 |
|---|---|---|
| Event capture / 事件采集 | Per-agent SDK | **Universal MCP proxy / 通用 MCP 代理** |
| Cost analysis / 成本分析 | Basic token count | **Tool-level attribution / 精确到工具调用** |
| Security / 安全扫描 | Separate SAST tool | **Built-in diff scanning / 内置代码 diff 扫描** |
| Compliance / 合规 | Manual log export | **One-click SOC2/ISO export / 一键合规导出** |
| Knowledge / 经验复用 | Lost after session ends | **Vector semantic search / 向量语义搜索** |
| Privacy / 隐私 | Cloud upload | **Local-first + differential privacy / 本地优先** |

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
│   │       └── cli/          # Clipanion commands
│   └── dashboard/            # React + Vite Web UI
│       └── src/pages/        # 9 dashboard pages
└── scripts/install.sh        # curl | sh installer
```

## Privacy / 隐私

- **Local-first / 本地优先**: All data in SQLite + LanceDB on your machine
- **Differential privacy / 差分隐私**: `audit export --scope anonymized` strips identifiers
- **No cloud upload / 不上传**: Code never leaves your filesystem
- **Configurable / 可配置**: `devsorcerer config set captureEnabled false`

## License / 许可证

MIT © 2026 DevSorcerer

## Tags / 标签

`ai-agent` `observability` `mcp-protocol` `cost-tracking` `security-scan` `compliance` `claude-code` `cursor` `devtools` `semantic-search` `code-review` `audit-log`
