# PowerShell script to build Invify APK with automatic version & date tagging
#   .\build-apk.ps1 -Target local
#   .\build-apk.ps1 -Target staging
#   .\build-apk.ps1 -Target local -ApiUrl http://192.168.1.50:3004
#   .\build-apk.ps1 -Target local -BuildMode debug
param (
    [ValidateSet('local', 'usb', 'staging')]
    [string]$Target = 'staging',
    [string]$ApiUrl = '',
    [string]$BuildMode = 'release',
    [switch]$Unsigned = $false
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Building Invify Android APK ($BuildMode)  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$pubspec = Get-Content "pubspec.yaml" -Raw
$versionMatch = [regex]::Match($pubspec, 'version:\s*([0-9]+\.[0-9]+\.[0-9]+)')
$versionName = if ($versionMatch.Success) { $versionMatch.Groups[1].Value } else { "1.0.0" }
$dateStr = Get-Date -Format "yyyy-MM-dd"

$selectScript = Join-Path $PSScriptRoot 'scripts\select-app-target.ps1'
$defineFile = & $selectScript -Target $Target -ApiUrl $ApiUrl | Select-Object -Last 1
$definesArg = "--dart-define-from-file=$defineFile"

Write-Host "• App Version : $versionName" -ForegroundColor Yellow
Write-Host "• Build Date  : $dateStr" -ForegroundColor Yellow
Write-Host "• API Target  : $Target" -ForegroundColor Yellow
Write-Host "• Define file : $defineFile" -ForegroundColor Yellow
Write-Host "• Target APK  : invify-v${versionName}-${dateStr}.apk" -ForegroundColor Yellow
Write-Host ""

if ($Unsigned) {
    $env:BUILD_UNSIGNED = "true"
}

$buildCmd = "flutter build apk --$BuildMode $definesArg"
Write-Host "Executing: $buildCmd" -ForegroundColor Gray
Invoke-Expression $buildCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

$outputDir = "build/app/outputs/flutter-apk"
$datedApk = "$outputDir/invify-v${versionName}-${dateStr}-${Target}.apk"
$releaseApk = "$outputDir/app-release.apk"
$debugApk = "$outputDir/app-debug.apk"

$built = $null
if (Test-Path $releaseApk) { $built = $releaseApk }
elseif (Test-Path $debugApk) { $built = $debugApk }

if ($built) {
    Copy-Item $built $datedApk -Force
    Write-Host ""
    Write-Host "Build Succeeded!" -ForegroundColor Green
    Write-Host "Versioned APK generated at:" -ForegroundColor Green
    Write-Host "  -> $(Resolve-Path $datedApk)" -ForegroundColor White
} elseif (Test-Path $datedApk) {
    Write-Host ""
    Write-Host "Build Succeeded!" -ForegroundColor Green
    Write-Host "Versioned APK generated at:" -ForegroundColor Green
    Write-Host "  -> $(Resolve-Path $datedApk)" -ForegroundColor White
}
