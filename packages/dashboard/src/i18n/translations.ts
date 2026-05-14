export type Language = 'en' | 'zh';

export const languages: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
];

// English strings as keys, Chinese as values.
// Components use t("English string") — English doubles as fallback.
const zh: Record<string, string> = {
  // App / 404
  'Page not found': '页面未找到',
  'Back to Dashboard': '返回仪表盘',

  // Sidebar navigation
  'Overview': '总览',
  'Sessions': '会话',
  'Cost': '成本',
  'Risk': '风险',
  'Quality': '质量',
  'Knowledge': '知识',
  'Audit': '审计',
  'Settings': '设置',
  'Status': '状态',
  'Close sidebar': '关闭侧边栏',

  // Header
  'Open sidebar': '打开侧边栏',
  'Live': '在线',
  'Running': '运行中',
  'Checking...': '检查中...',
  'Stopped': '已停止',
  'Refresh': '刷新',
  ' sessions': ' 个会话',
  ' events': ' 个事件',
  ' connected': ' 已连接',

  // ErrorBoundary
  'Something went wrong': '出了点问题',
  'An unexpected error occurred.': '发生了意外错误。',
  'Reload page': '重新加载页面',

  // Overview page
  'Total Sessions': '总会话数',
  'Total Cost': '总成本',
  'Total Tokens': '总 Token 数',
  'Projects': '项目数',
  'Cost Trend': '成本趋势',
  'Top Tools by Usage': '工具使用排行',
  'What DevSorcerer Tells You': 'DevSorcerer 能告诉你什么',
  'Why did this AI task cost so much?': '为什么这次 AI 任务花了这么多钱？',
  'Token cost per tool call, by project and date.': '按项目、日期统计每次工具调用的 Token 成本。',
  'Is AI-generated code secure?': 'AI 生成的代码安全吗？',
  'Scans every diff for secrets, injection, unsafe patterns.': '扫描每次差异中的密钥、注入、不安全模式。',
  'Why does AI keep failing?': '为什么 AI 一直失败？',
  'Replays thinking chain, highlights error loops.': '回放思考链，高亮错误循环。',
  "What's the ROI of AI coding?": 'AI 编程的投资回报率是多少？',
  'Acceptance rate, rollback rate, AI bug rate.': '采纳率、回滚率、AI 缺陷率。',
  'Recent Sessions': '最近会话',
  'View all': '查看全部',
  'Session': '会话',
  'Agent': '代理',
  'Tools': '工具',
  'No sessions yet. Start a devsorcerer proxy to capture AI activity.': '暂无会话。启动 devsorcerer 代理以捕获 AI 活动。',

  // Sessions page
  'Search sessions...': '搜索会话...',
  'No sessions yet.': '暂无会话。',
  'Start the devsorcerer proxy to begin capturing AI agent activity.': '启动 devsorcerer 代理以开始捕获 AI 代理活动。',
  'Session ID': '会话 ID',
  'Branch': '分支',
  'Project': '项目',
  'Started': '开始时间',
  'Events': '事件',
  'Tokens': 'Token',
  'tools': '工具',
  'No sessions matching': '没有匹配的会话',
  ' total': ' 总计',

  // SessionDetail page
  'Session not found.': '会话未找到。',
  'Back to sessions': '返回会话列表',
  'Agent:': '代理：',
  'Branch:': '分支：',
  'Started:': '开始时间：',
  'Cost:': '成本：',
  'Tool Calls': '工具调用',
  'Errors': '错误',
  'Duration': '耗时',
  'Timeline Replay': '时间线回放',
  'Tool Call Summary': '工具调用摘要',
  'No tool calls in this session.': '此会话没有工具调用。',
  ' errors': ' 个错误',
  ' calls': ' 次调用',
  'unknown': '未知',
  'Error': '错误',

  // CostAnalysis page
  'Cost Analysis': '成本分析',
  'All Sessions': '全部会话',
  'Tool Cost Breakdown': '工具成本明细',
  'Tool': '工具',
  'Calls': '调用',
  'Input Tokens': '输入 Token',
  'Output Tokens': '输出 Token',
  '% of Total': '占比',

  // RiskFindings page
  'Risk Findings': '风险发现',
  'Risk Score:': '风险评分：',
  'CRITICAL': '严重',
  'HIGH': '高危',
  'MEDIUM': '中危',
  'LOW': '低危',
  'Severity Breakdown': '严重程度分布',
  'Select a session to scan for security risks.': '选择一个会话以扫描安全风险。',
  'Each AI-generated code diff is scanned against 8 security rules — secrets, injection, path traversal, eval, crypto, auth, and more.': '每条 AI 生成的代码差异都会通过 8 条安全规则扫描——密钥、注入、路径穿越、eval、加密、认证等。',

  // Quality page
  'Quality Metrics': '质量指标',
  'Measure how much AI-generated code is accepted, modified, or rolled back — so you can track ROI and code quality.': '衡量 AI 生成代码的采纳率、修改率和回滚率——追踪投资回报率和代码质量。',
  'Acceptance Rate': '采纳率',
  'Files Created': '创建文件',
  'Rollbacks': '回滚',
  'AI Bugs': 'AI 缺陷',
  'Quality Radar': '质量雷达',
  'Details': '详情',
  'Files Modified': '修改文件',
  'Files Accepted': '采纳文件',
  'Acceptance': '采纳率',
  'Select a session to view quality metrics.': '选择一个会话以查看质量指标。',
  'Quality analysis measures AI code acceptance rate, rollback frequency, and AI-introduced bugs via git history.': '质量分析通过 git 历史衡量 AI 代码的采纳率、回滚频率和 AI 引入的缺陷。',

  // Knowledge page
  'Knowledge Search': '知识搜索',
  'Semantic search across all historical AI sessions. Find how similar problems were solved, what patterns worked, and reuse past solutions.': '跨所有历史 AI 会话进行语义搜索。发现相似问题的解决方式、有效的模式，复用过去的方案。',
  'Search patterns, e.g. "concurrent lock" or "OAuth implementation"...': '搜索模式，例如"并发锁"或"OAuth 实现"...',
  'Search': '搜索',
  'Hybrid': '混合',
  'Hybrid = vector similarity + keyword matching': '混合 = 向量相似度 + 关键词匹配',
  'Search failed:': '搜索失败：',
  'Unknown error': '未知错误',
  'result': '条结果',
  'results': '条结果',
  'No results found for': '未找到结果',
  'Try different keywords, a broader query, or toggle Hybrid search off.': '尝试不同关键词、更宽泛的查询，或关闭混合搜索。',
  'Enter a query to search across all AI sessions': '输入查询以搜索所有 AI 会话',
  'The knowledge engine uses AI embeddings to find semantically similar solutions, even when keywords don\'t match exactly.': '知识引擎使用 AI 嵌入来查找语义相似的解决方案，即使关键词不完全匹配。',
  'Show context': '显示上下文',
  'match': '匹配',
  'Unknown date': '日期未知',

  // AuditExport page
  'Audit Export': '审计导出',
  'Export timestamped agent event logs for SOC2/ISO compliance audits. Supports CSV, JSON, and NDJSON formats with optional anonymization.': '导出带时间戳的代理事件日志，用于 SOC2/ISO 合规审计。支持 CSV、JSON 和 NDJSON 格式，可选匿名化。',
  'Export Format': '导出格式',
  'Data Scope': '数据范围',
  'Full (includes file paths, project names)': '完整（包含文件路径、项目名称）',
  'Anonymized (strips identifiers)': '匿名化（去除标识符）',
  'Project Filter (optional)': '项目筛选（可选）',
  'All Projects': '全部项目',
  'Export Audit Log': '导出审计日志',
  'Exporting...': '导出中...',
  'Audit logs include timestamps, agent identity, tool calls, and event sequences. Raw code content is excluded in anonymized exports.': '审计日志包含时间戳、代理身份、工具调用和事件序列。匿名导出中不包含原始代码内容。',

  // Settings page
  'Server Port': '服务器端口',
  'Database Path': '数据库路径',
  'Embedding Model': '嵌入模型',
  'Requires model to be available from HuggingFace Hub.': '模型需从 HuggingFace Hub 获取。',
  'Dashboard Enabled': '启用仪表盘',
  'Capture Enabled': '启用捕获',
  'Anonymize Exports by Default': '默认匿名导出',
  'Save Settings': '保存设置',
  'Saving...': '保存中...',
  'Settings saved successfully.': '设置保存成功。',
  'Failed to save:': '保存失败：',
  'Language': '语言',
  'English': '英文',
  '中文': '中文',

  // Settings — Pricing Editor
  'General': '通用设置',
  'Model Pricing': '模型定价',
  'Reset to Defaults': '重置为默认',
  'Set per-model API pricing (USD per 1,000 tokens). Used to calculate accurate session costs.': '设置每个模型的 API 定价（美元/千 token）。用于准确计算会话成本。',
  'Example 1M in + 500K out': '示例 1M 入 + 500K 出',
  'In': '入',
  'Out': '出',
  'Add': '添加',
  'Remove model': '删除模型',
  'Add a new model pricing entry:': '添加新模型定价：',
  'Model name (e.g. gpt-4o)': '模型名（例如 gpt-4o）',
  'Model name is required.': '模型名不能为空。',
  'This model already exists.': '此模型已存在。',
  'Input price must be a positive number.': '输入价格必须为正数。',
  'Output price must be a positive number.': '输出价格必须为正数。',
  'input price must be a positive number.': '输入价格必须为正数。',
  'output price must be a positive number.': '输出价格必须为正数。',
  'Model name cannot be empty.': '模型名不能为空。',
  'Pricing reset to defaults.': '定价已重置为默认值。',
  'No custom pricing configured. Defaults will be used.': '未配置自定义定价，将使用默认值。',
  'Reset all pricing to built-in defaults': '将所有定价重置为内置默认值',

  // Cost Analysis — Model breakdown
  'Per-Model Cost': '各模型成本',
  'Model': '模型',
  'Per-Tool Breakdown': '各工具明细',
  'Hide': '隐藏',
  'Show': '显示',
  'Avg Cost / 1K Tokens': '均成本 / 千 Token',
  'No cost data available yet.': '暂无成本数据。',
  'Start an AI session with MCP tools enabled, then import the session data to see costs here.': '启动启用了 MCP 工具的 AI 会话，然后导入会话数据即可在此查看成本。',
  'Loading cost data...': '加载成本数据中...',
  'No cost data yet.': '暂无成本数据。',
  'Import session data or start capturing to see trends.': '导入会话数据或开始捕获以查看趋势。',

  // Charts
  'No timeline data available.': '暂无时间线数据。',
  'Start': '开始',
  'Pause': '暂停',
  'Play': '播放',
  'End': '末尾',
  'Step': '步骤',
  'Latency': '延迟',
  'total latency': '总延迟',

  // ErrorLoopHighlight
  'Error Loops Detected': '检测到错误循环',
  'failed attempts': '次失败尝试',

  // Charts
  'No session data yet. Start capturing events to see trends.': '暂无会话数据。开始捕获事件以查看趋势。',
  'No tool usage data yet.': '暂无工具使用数据。',
  'No risk findings yet. Run risk analysis on sessions to see results.': '暂无风险发现。对会话运行风险分析以查看结果。',
  'No quality data yet.': '暂无质量数据。',
  'Low Rollback': '低回滚',
  'Low Bugs': '低缺陷',
  'Created': '已创建',
  'Modified': '已修改',

  // Status labels (displayed in tables/cards)
  'completed': '已完成',
  'error': '错误',
  'active': '运行中',

  // Knowledge search
  'in': '用时',

  // Settings pricing
  'default (fallback)': '默认（回退）',

  // Placeholders
  'In $/1k': '输入 $/1k',
  'Out $/1k': '输出 $/1k',

  // Session replay
  'Error at step {n}': '第 {n} 步错误',
};

export const translations: Record<Language, Record<string, string>> = {
  en: {},
  zh,
};
