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

function Repair-FlutterAssetManifest {
    param(
        [Parameter(Mandatory = $true)][string]$ApkPath,
        [Parameter(Mandatory = $true)][string]$BuildMode
    )

    $src = Join-Path $PSScriptRoot "build\app\intermediates\flutter\$BuildMode\flutter_assets\AssetManifest.bin"
    if (-not (Test-Path $src)) {
        Write-Host "[Invify] AssetManifest.bin not found at $src" -ForegroundColor Yellow
        return
    }
    if (-not (Test-Path $ApkPath)) { return }

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $apkFull = (Resolve-Path $ApkPath).Path
    $entryName = "assets/flutter_assets/AssetManifest.bin"
    $zip = [System.IO.Compression.ZipFile]::Open($apkFull, [System.IO.Compression.ZipArchiveMode]::Update)
    try {
        $existing = $zip.GetEntry($entryName)
        if ($null -ne $existing) { $existing.Delete() }
        $newEntry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        $inStream = [System.IO.File]::OpenRead((Resolve-Path $src).Path)
        $outStream = $newEntry.Open()
        try {
            $inStream.CopyTo($outStream)
        } finally {
            $outStream.Dispose()
            $inStream.Dispose()
        }
    } finally {
        $zip.Dispose()
    }
    Write-Host "[Invify] Injected AssetManifest.bin into APK" -ForegroundColor Cyan

    $sdk = $env:ANDROID_SDK_ROOT
    if (-not $sdk) { $sdk = $env:ANDROID_HOME }
    if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
    if (-not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
        $msJdk = Get-ChildItem "C:\Program Files\Microsoft\jdk-*" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
        if ($msJdk) { $env:JAVA_HOME = $msJdk.FullName }
    }
    $apksigner = Get-ChildItem -Path (Join-Path $sdk "build-tools") -Filter "apksigner.bat" -Recurse -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    $ks = Join-Path $env:USERPROFILE ".android\debug.keystore"
    if ($apksigner -and (Test-Path $ks)) {
        & $apksigner.FullName sign --ks $ks --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey $apkFull
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[Invify] Re-signed APK with debug keystore" -ForegroundColor Cyan
        } else {
            Write-Host "[Invify] apksigner failed; install may be rejected" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[Invify] apksigner/debug.keystore not found; APK may need a debug re-sign" -ForegroundColor Yellow
    }
}

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
Write-Host "• Target APK  : invify-v${versionName}-${dateStr}-${Target}-${BuildMode}.apk" -ForegroundColor Yellow
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
$datedApk = "$outputDir/invify-v${versionName}-${dateStr}-${Target}-${BuildMode}.apk"
$releaseApk = "$outputDir/app-release.apk"
$debugApk = "$outputDir/app-debug.apk"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$apkModeDir = "build/app/outputs/apk/$BuildMode"
$flutterNamed = "$outputDir/app-$BuildMode.apk"

$candidates = @()
if (Test-Path $flutterNamed) { $candidates += Get-Item $flutterNamed }
$candidates += @(Get-ChildItem $apkModeDir -Filter "*.apk" -ErrorAction SilentlyContinue)
$newest = $candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$built = if ($newest) { $newest.FullName } else { $null }

if ($built) {
    Copy-Item $built $datedApk -Force
    $datedResolved = (Resolve-Path $datedApk).Path
    $flutterResolved = $null
    if (Test-Path $flutterNamed) {
        $flutterResolved = (Resolve-Path $flutterNamed).Path
    }
    if ($flutterResolved -and ($datedResolved -ne $flutterResolved) -and ((Resolve-Path $built).Path -ne $flutterResolved)) {
        Copy-Item $built $flutterNamed -Force
    }

    Repair-FlutterAssetManifest -ApkPath $datedResolved -BuildMode $BuildMode
    if ((Test-Path $flutterNamed) -and ((Resolve-Path $flutterNamed).Path -ne $datedResolved)) {
        Repair-FlutterAssetManifest -ApkPath (Resolve-Path $flutterNamed).Path -BuildMode $BuildMode
    }

    Write-Host ""
    Write-Host "Build Succeeded!" -ForegroundColor Green
    Write-Host "Install this APK:" -ForegroundColor Green
    Write-Host "  -> $(Resolve-Path $datedApk)" -ForegroundColor White
    Write-Host "Also at:" -ForegroundColor Gray
    Write-Host "  -> $(Resolve-Path $built)" -ForegroundColor Gray
} else {
    Write-Host "Build finished but no APK was found in $outputDir or $apkModeDir" -ForegroundColor Red
    exit 1
}

