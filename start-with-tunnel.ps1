# DevSorcerer + Cloudflare Tunnel 一键启动脚本
# 启动本地服务并暴露到 devsorcerer.linrane.top

param(
    [switch]$NoTunnel = $false,
    [switch]$Headless = $false
)

$ErrorActionPreference = "Stop"

Write-Host "DevSorcerer v0.3.2 + Cloudflare Tunnel 启动器" -ForegroundColor Cyan
Write-Host "=" * 60

# 1. 检查依赖
$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not $NoTunnel -and -not (Test-Path $cloudflaredPath)) {
    Write-Host "❌ Cloudflared 未安装，请先运行: winget install Cloudflare.cloudflared" -ForegroundColor Red
    exit 1
}

# 2. 构建项目
Write-Host "🔨 构建项目..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 构建完成" -ForegroundColor Green

# 3. 启动本地服务（后台）
Write-Host "🚀 启动 DevSorcerer 服务 (端口 3199)..." -ForegroundColor Yellow
$serverJob = Start-Job -Name "DevSorcererServer" -ScriptBlock {
    Set-Location $using:PSScriptRoot
    node packages/devsorcerer/bin/devsorcerer.js start --headless
}

# 等待服务启动
Start-Sleep -Seconds 3

# 4. 启动 Cloudflare Tunnel
if (-not $NoTunnel) {
    Write-Host "🌐 启动 Cloudflare Tunnel..." -ForegroundColor Yellow
    Write-Host "   子域名: devsorcerer.linrane.top → localhost:3199" -ForegroundColor Gray
    
    $tunnelJob = Start-Job -Name "CloudflareTunnel" -ScriptBlock {
        & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --config "$env:USERPROFILE\.cloudflared\config.yml" run
    }
    
    # 等待 Tunnel 建立连接
    Start-Sleep -Seconds 5
    Write-Host "✓ Tunnel 已启动" -ForegroundColor Green
    Write-Host "🌍 访问地址: https://devsorcerer.linrane.top" -ForegroundColor Cyan
} else {
    Write-Host "🌍 本地访问: http://localhost:3199" -ForegroundColor Cyan
}

# 5. 打开浏览器
if (-not $Headless) {
    if (-not $NoTunnel) {
        Start-Process "https://devsorcerer.linrane.top"
    } else {
        Start-Process "http://localhost:3199"
    }
}

Write-Host "`n📊 服务状态:" -ForegroundColor Magenta
if (-not $NoTunnel) {
    Write-Host "  • Cloudflare Tunnel: 运行中 (作业 ID: $($tunnelJob.Id))" -ForegroundColor Gray
}
Write-Host "  • DevSorcerer Server: 运行中 (作业 ID: $($serverJob.Id))" -ForegroundColor Gray
Write-Host "  • 数据库: $PSScriptRoot\.vault\devsorcerer.sqlite" -ForegroundColor Gray
Write-Host "  • 嵌入模型: BGE-M3 (1024维)" -ForegroundColor Gray

Write-Host "`n🛑 停止服务: 按 Ctrl+C 或关闭此窗口" -ForegroundColor Yellow
Write-Host "📋 日志查看: Receive-Job -Id $($serverJob.Id) -Keep" -ForegroundColor Gray

# 保持脚本运行，捕获 Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n正在停止服务..." -ForegroundColor Yellow
    if ($tunnelJob) { Stop-Job -Job $tunnelJob -PassThru | Remove-Job -Force }
    if ($serverJob) { Stop-Job -Job $serverJob -PassThru | Remove-Job -Force }
    Write-Host "服务已停止" -ForegroundColor Green
}