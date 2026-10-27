<#
.SYNOPSIS
  INVIFY — STAGING REAL-TIME MONITORING (read-only SSH wrapper)

.DESCRIPTION
  Streams scripts/staging-realtime-monitor.sh to the staging host over SSH.
  Nothing is written, installed, restarted, reloaded, or deployed on the server.

.PARAMETER Mode
  once  — one-shot diagnostic (default)
  watch — continuous real-time monitor

.PARAMETER Interval
  Watch refresh seconds (default 5). Ignored for -Mode once.
#>
[CmdletBinding()]
param(
    [ValidateSet('once', 'watch')]
    [string]$Mode = 'once',

    [ValidateRange(2, 120)]
    [int]$Interval = 5
)

$ErrorActionPreference = 'Stop'

$HostName = 'deploy@156.67.25.192'
$KeyPath = Join-Path $env:USERPROFILE '.ssh\invify-deploy-temp'
$ScriptPath = Join-Path $PSScriptRoot 'staging-realtime-monitor.sh'

if (-not (Test-Path -LiteralPath $ScriptPath)) {
    throw "Monitor script not found: $ScriptPath"
}
if (-not (Test-Path -LiteralPath $KeyPath)) {
    throw "Staging SSH key not found: $KeyPath"
}

$remoteArgs = if ($Mode -eq 'watch') {
    "--watch --interval $Interval"
} else {
    '--once'
}

Write-Host 'INVIFY — STAGING REAL-TIME MONITORING' -ForegroundColor Cyan
Write-Host "Environment : STAGING" -ForegroundColor Yellow
Write-Host "Mode        : $Mode" -ForegroundColor Cyan
Write-Host 'Policy      : READ-ONLY — no restart / reload / deploy / kill' -ForegroundColor DarkGray
Write-Host ''

$script = (Get-Content -LiteralPath $ScriptPath -Raw) -replace "`r`n", "`n" -replace "`r", "`n"
$script | ssh -i $KeyPath -o BatchMode=yes -o IdentitiesOnly=yes $HostName "tr -d '\r' | bash -s -- $remoteArgs"
