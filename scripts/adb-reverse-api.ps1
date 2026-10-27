# Forward tablet localhost:3004 to this PC's Node API over USB.
# Usage: .\scripts\adb-reverse-api.ps1
#        .\scripts\adb-reverse-api.ps1 -Port 3004 -Device 5200432743e116ef
param(
    [int]$Port = 3004,
    [string]$Device = ''
)

$ErrorActionPreference = 'Stop'
$adbArgs = @()
if ($Device) { $adbArgs += @('-s', $Device) }

$devices = & adb @adbArgs devices 2>$null
$ready = @($devices | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' })
if ($ready.Count -eq 0) {
    Write-Host "No USB tablet found. Plug it in, accept USB debugging, then retry." -ForegroundColor Red
    exit 1
}

if (-not $Device -and $ready.Count -ge 1) {
    $Device = ($ready[0] -split '\s+')[0]
    $adbArgs = @('-s', $Device)
}

& adb @adbArgs reverse --remove-all 2>$null | Out-Null
& adb @adbArgs reverse "tcp:$Port" "tcp:$Port"
if ($LASTEXITCODE -ne 0) {
    Write-Host "adb reverse failed. Unplug/replug the tablet and retry." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "USB tunnel: tablet 127.0.0.1:$Port -> PC 127.0.0.1:$Port  (device $Device)" -ForegroundColor Green
& adb @adbArgs reverse --list
