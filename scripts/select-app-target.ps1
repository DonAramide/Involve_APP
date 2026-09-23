# Resolves Flutter dart-define files for local LAN, USB, staging, or production.
#   .\scripts\select-app-target.ps1 -Target local
#   .\scripts\select-app-target.ps1 -Target usb
#   .\scripts\select-app-target.ps1 -Target staging
#   .\scripts\select-app-target.ps1 -Target production
#   .\scripts\select-app-target.ps1 -Target local -ApiUrl http://192.168.1.50:3004
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('local', 'usb', 'staging', 'production')]
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
$productionFile = Join-Path $targetDir 'production.json'
$productionLocalFile = Join-Path $targetDir 'production.local.json'
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

if ($Target -eq 'production') {
    # Prefer gitignored local file that includes SUPABASE_PUBLISHABLE_KEY when present.
    $chosen = $productionFile
    if (Test-Path $productionLocalFile) {
        $chosen = $productionLocalFile
    }
    if (-not (Test-Path $chosen)) {
        throw "Missing $chosen - create config/app_targets/production.json (or production.local.json from production.local.example.json)"
    }
    $parsed = Get-Content $chosen -Raw | ConvertFrom-Json
    if ([string]$parsed.APP_ENV -ne 'production') {
        throw "Production target file must set APP_ENV=production ($chosen)"
    }
    if ([string]$parsed.API_BASE_URL -notmatch 'api\.invify\.org') {
        throw "Production target API_BASE_URL must be https://api.invify.org ($chosen)"
    }
    if ($parsed.PSObject.Properties.Name -contains 'SUPABASE_URL') {
        if ([string]$parsed.SUPABASE_URL -notmatch 'jjixrywfnaijvahmvcwj') {
            throw "Production SUPABASE_URL must reference project jjixrywfnaijvahmvcwj ($chosen)"
        }
        if ([string]$parsed.SUPABASE_URL -match 'rpcjelhacmkhzguljdgi') {
            throw "Production target must not reference staging Supabase ($chosen)"
        }
    }
    if (-not $Quiet) {
        Write-Host "API target : production" -ForegroundColor Cyan
        Write-Host "Define file: $chosen" -ForegroundColor Gray
        Write-Host "API URL    : $([string]$parsed.API_BASE_URL)" -ForegroundColor Yellow
        if (-not ($parsed.PSObject.Properties.Name -contains 'SUPABASE_PUBLISHABLE_KEY') -or
            [string]::IsNullOrWhiteSpace([string]$parsed.SUPABASE_PUBLISHABLE_KEY) -or
            [string]$parsed.SUPABASE_PUBLISHABLE_KEY -match '^<.+>$') {
            Write-Host "NOTE: SUPABASE_PUBLISHABLE_KEY not set in define file - pass via env/CI or production.local.json" -ForegroundColor Yellow
        }
    }
    Write-Output $chosen
    return
}

if ($Target -eq 'staging') {
    $stagingLocalFile = Join-Path $targetDir 'staging.local.json'
    # Prefer gitignored local file that includes SUPABASE_PUBLISHABLE_KEY when present.
    $chosen = $stagingFile
    if (Test-Path $stagingLocalFile) {
        $chosen = $stagingLocalFile
    }
    if (-not (Test-Path $chosen)) {
        throw "Missing $chosen - create config/app_targets/staging.json (or staging.local.json from staging.local.example.json)"
    }
    $parsed = Get-Content $chosen -Raw | ConvertFrom-Json
    if ([string]$parsed.APP_ENV -ne 'staging') {
        throw "Staging target file must set APP_ENV=staging ($chosen)"
    }
    if ([string]$parsed.API_BASE_URL -notmatch '^https://staging\.invify\.org/?$') {
        throw "Staging target API_BASE_URL must be exactly https://staging.invify.org ($chosen)"
    }
    if ([string]$parsed.API_BASE_URL -match 'api\.invify\.org|app\.invify\.org|jjixrywfnaijvahmvcwj') {
        throw "Staging target must not reference production API/Supabase ($chosen)"
    }
    if (-not ($parsed.PSObject.Properties.Name -contains 'SUPABASE_URL') -or
        [string]::IsNullOrWhiteSpace([string]$parsed.SUPABASE_URL)) {
        throw "Staging target must include SUPABASE_URL ($chosen)"
    }
    if ([string]$parsed.SUPABASE_URL -notmatch 'rpcjelhacmkhzguljdgi') {
        throw "Staging SUPABASE_URL must reference project rpcjelhacmkhzguljdgi ($chosen)"
    }
    if ([string]$parsed.SUPABASE_URL -match 'jjixrywfnaijvahmvcwj') {
        throw "Staging target must not reference production Supabase ($chosen)"
    }
    if (-not $Quiet) {
        Write-Host "API target : staging" -ForegroundColor Cyan
        Write-Host "Define file: $chosen" -ForegroundColor Gray
        Write-Host "API URL    : $([string]$parsed.API_BASE_URL)" -ForegroundColor Yellow
        if (-not ($parsed.PSObject.Properties.Name -contains 'SUPABASE_PUBLISHABLE_KEY') -or
            [string]::IsNullOrWhiteSpace([string]$parsed.SUPABASE_PUBLISHABLE_KEY) -or
            [string]$parsed.SUPABASE_PUBLISHABLE_KEY -match '^<.+>$') {
            Write-Host "NOTE: SUPABASE_PUBLISHABLE_KEY not set in define file - pass via env/CI or staging.local.json" -ForegroundColor Yellow
        }
    }
    Write-Output $chosen
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
