# Resolves Flutter dart-define files for local LAN, USB, or staging.
#   .\scripts\select-app-target.ps1 -Target local
#   .\scripts\select-app-target.ps1 -Target usb
#   .\scripts\select-app-target.ps1 -Target staging
#   .\scripts\select-app-target.ps1 -Target local -ApiUrl http://192.168.1.50:3004
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('local', 'usb', 'staging')]
    [string]$Target,

    [string]$ApiUrl = '',
    [int]$Port = 3004,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$targetDir = Join-Path $repoRoot 'config\app_targets'
$stagingFile = Join-Path $targetDir 'staging.json'
$localFile = Join-Path $targetDir 'local.json'
$usbFile = Join-Path $targetDir 'usb.json'
$localExample = Join-Path $targetDir 'local.example.json'

function Get-LanIPv4 {
    $addrs = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.AddressState -eq 'Preferred' -and
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.InterfaceAlias -notlike '*WSL*' -and
            $_.InterfaceAlias -notlike '*vEthernet*' -and
            $_.InterfaceAlias -notlike '*Default Switch*' -and
            $_.InterfaceAlias -notlike '*Loopback*'
        })
    $wifi = $addrs | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1
    if ($wifi) { return $wifi.IPAddress }
    $lan = $addrs | Where-Object { $_.IPAddress -like '10.*' -or $_.IPAddress -like '192.168.*' } | Select-Object -First 1
    if ($lan) { return $lan.IPAddress }
    return $null
}

function Write-JsonTarget([string]$path, [string]$appEnv, [string]$apiTarget, [string]$url) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    $payload = [ordered]@{
        APP_ENV      = $appEnv
        API_TARGET   = $apiTarget
        API_BASE_URL = $url.TrimEnd('/')
    }
    $json = $payload | ConvertTo-Json -Compress:$false
    [System.IO.File]::WriteAllText($path, $json + "`n", [System.Text.UTF8Encoding]::new($false))
}

if ($Target -eq 'staging') {
    if (-not (Test-Path $stagingFile)) {
        throw "Missing $stagingFile"
    }
    if (-not $Quiet) {
        Write-Host "API target : staging" -ForegroundColor Cyan
        Write-Host "Define file: $stagingFile" -ForegroundColor Gray
        Write-Host "API URL    : https://staging.invify.org" -ForegroundColor Yellow
    }
    Write-Output $stagingFile
    return
}

if ($Target -eq 'usb') {
    Write-JsonTarget $usbFile 'development' 'local' "http://127.0.0.1:$Port"
    if (-not $Quiet) {
        Write-Host "API target : usb (adb reverse)" -ForegroundColor Cyan
        Write-Host "Define file: $usbFile" -ForegroundColor Gray
        Write-Host "API URL    : http://127.0.0.1:$Port" -ForegroundColor Yellow
        Write-Host "Tablet Wi-Fi can stay off. Keep USB debugging connected." -ForegroundColor Gray
    }
    Write-Output $usbFile
    return
}

$resolvedUrl = $ApiUrl.Trim()
if (-not $resolvedUrl) {
    $ip = Get-LanIPv4
    if (-not $ip) {
        if (Test-Path $localFile) {
            $existing = Get-Content $localFile -Raw | ConvertFrom-Json
            $resolvedUrl = [string]$existing.API_BASE_URL
        } elseif (Test-Path $localExample) {
            $existing = Get-Content $localExample -Raw | ConvertFrom-Json
            $resolvedUrl = [string]$existing.API_BASE_URL
        }
    } else {
        $resolvedUrl = "http://${ip}:${Port}"
    }
}

if (-not $resolvedUrl) {
    throw "Could not detect a LAN IP. Pass -ApiUrl http://YOUR_PC_IP:$Port"
}

if ($resolvedUrl -notmatch '^https?://') {
    $resolvedUrl = "http://$resolvedUrl"
}

Write-JsonTarget $localFile 'development' 'local' $resolvedUrl
if (-not $Quiet) {
    Write-Host "API target : local" -ForegroundColor Cyan
    Write-Host "Define file: $localFile" -ForegroundColor Gray
    Write-Host "API URL    : $resolvedUrl" -ForegroundColor Yellow
    Write-Host "Tablet must be on the same Wi-Fi as this PC. Backend on port $Port." -ForegroundColor Gray
}
Write-Output $localFile
