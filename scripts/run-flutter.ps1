# Run the tablet/desktop app against local LAN, USB reverse, or staging.
#   .\scripts\run-flutter.ps1 -Target local
#   .\scripts\run-flutter.ps1 -Target usb
#   .\scripts\run-flutter.ps1 -Target staging
param(
    [ValidateSet('local', 'usb', 'staging')]
    [string]$Target = 'local',
    [string]$ApiUrl = '',
    [string]$Device = '',
    [string]$ExtraArgs = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$defineFile = & (Join-Path $PSScriptRoot 'select-app-target.ps1') -Target $Target -ApiUrl $ApiUrl | Select-Object -Last 1

if ($Target -eq 'usb') {
    $reverse = Join-Path $PSScriptRoot 'adb-reverse-api.ps1'
    if ($Device) {
        & $reverse -Device $Device
    } else {
        & $reverse
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "USB tunnel is required for -Target usb. Fix adb, then retry." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

$flutterArgs = @('run', "--dart-define-from-file=$defineFile")
if ($Device) { $flutterArgs += @('-d', $Device) }
if ($ExtraArgs) { $flutterArgs += $ExtraArgs.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries) }

Write-Host "Executing: flutter $($flutterArgs -join ' ')" -ForegroundColor Gray
& flutter @flutterArgs
exit $LASTEXITCODE
