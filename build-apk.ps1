# PowerShell script to build Invify APK with automatic version & date tagging
#   .\build-apk.ps1 -Target local
#   .\build-apk.ps1 -Target staging
#   .\build-apk.ps1 -Target production
#   .\build-apk.ps1 -Target local -ApiUrl http://192.168.1.50:3004
#   .\build-apk.ps1 -Target local -BuildMode debug
param (
    [ValidateSet('local', 'usb', 'staging', 'production')]
    [string]$Target = 'staging',
    [string]$ApiUrl = '',
    [string]$BuildMode = 'release',
    [switch]$Unsigned = $false
)

$javaCandidates = @(
    'C:\dev\jdk-17',
    'C:\Program Files\Android\Android Studio\jbr',
    (Get-ChildItem "C:\Program Files\Microsoft\jdk-*" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName),
    $env:JAVA_HOME
) | Where-Object { $_ }
$resolvedJava = $javaCandidates | Where-Object {
    try { Test-Path (Join-Path $_ 'bin\java.exe') } catch { $false }
} | Select-Object -First 1
if ($resolvedJava) {
    $env:JAVA_HOME = $resolvedJava
    $env:PATH = "$resolvedJava\bin;" + $env:PATH
}

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
    if (-not $sdk) { $sdk = "C:\Android\Sdk" }
    if (-not (Test-Path $sdk)) { $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
    $javaCandidates = @(
        $env:JAVA_HOME,
        'C:\Program Files\Android\Android Studio\jbr',
        'C:\dev\jdk-17',
        (Get-ChildItem "C:\Program Files\Microsoft\jdk-*" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName)
    ) | Where-Object { $_ -and ($_ -notmatch '^[A-Z]:\\Program Files\\Android\\Android Studio1\\') }
    $resolvedJava = $javaCandidates | Where-Object {
        try { Test-Path (Join-Path $_ 'bin\java.exe') } catch { $false }
    } | Select-Object -First 1
    if ($resolvedJava) { $env:JAVA_HOME = $resolvedJava }
    $apksigner = Get-ChildItem -Path (Join-Path $sdk "build-tools") -Filter "apksigner.bat" -Recurse -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1

    # After ZIP mutation the APK signature is invalid and must be re-applied.
    # Production/staging MUST use the release keystore from android/key.properties.
    # Never fall back to the debug keystore for those targets.
    $keyPropsPath = Join-Path $PSScriptRoot "android\key.properties"
    $useReleaseSigning = ($Target -eq 'production' -or $Target -eq 'staging') -or (Test-Path $keyPropsPath)

    if ($Target -eq 'production' -or $Target -eq 'staging') {
        if (-not (Test-Path $keyPropsPath)) {
            throw "Refuse AssetManifest re-sign: android/key.properties missing for $Target (debug keystore forbidden)."
        }
    }

    if (-not $apksigner) {
        throw "apksigner not found under $sdk; cannot re-sign after AssetManifest repair."
    }

    if ($useReleaseSigning -and (Test-Path $keyPropsPath)) {
        $props = @{}
        Get-Content $keyPropsPath | ForEach-Object {
            if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
            $k, $v = $_.Split('=', 2)
            $props[$k.Trim()] = $v.Trim()
        }
        foreach ($required in @('storeFile', 'storePassword', 'keyAlias', 'keyPassword')) {
            if ([string]::IsNullOrWhiteSpace($props[$required])) {
                throw "android/key.properties missing required field: $required"
            }
        }
        $storeFile = $props['storeFile']
        if (-not [System.IO.Path]::IsPathRooted($storeFile)) {
            $storeFile = Join-Path (Join-Path $PSScriptRoot "android") $storeFile
        }
        if (-not (Test-Path $storeFile)) {
            throw "Release keystore file not found at configured storeFile path."
        }
        # Passwords via env-file style args only for this process; do not Write-Host them.
        & $apksigner.FullName sign `
            --ks $storeFile `
            --ks-pass ("pass:" + $props['storePassword']) `
            --ks-key-alias $props['keyAlias'] `
            --key-pass ("pass:" + $props['keyPassword']) `
            $apkFull
        if ($LASTEXITCODE -ne 0) {
            throw "Release apksigner failed after AssetManifest repair."
        }
        Write-Host "[Invify] Re-signed APK with release keystore (alias redacted)" -ForegroundColor Cyan
    } elseif ($Target -eq 'local' -or $Target -eq 'usb' -or $BuildMode -eq 'debug') {
        $ks = Join-Path $env:USERPROFILE ".android\debug.keystore"
        if (-not (Test-Path $ks)) {
            throw "debug.keystore not found for local/usb re-sign."
        }
        & $apksigner.FullName sign --ks $ks --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey $apkFull
        if ($LASTEXITCODE -ne 0) {
            throw "Debug apksigner failed after AssetManifest repair."
        }
        Write-Host "[Invify] Re-signed APK with debug keystore (local/usb only)" -ForegroundColor Yellow
    } else {
        throw "No safe signing path for AssetManifest re-sign (target=$Target)."
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
$extraKeyDefine = $null

if ($Target -eq 'production' -or $Target -eq 'staging') {
    $parsed = Get-Content $defineFile -Raw | ConvertFrom-Json
    $hasKey = ($parsed.PSObject.Properties.Name -contains 'SUPABASE_PUBLISHABLE_KEY') -and
        -not [string]::IsNullOrWhiteSpace([string]$parsed.SUPABASE_PUBLISHABLE_KEY) -and
        ([string]$parsed.SUPABASE_PUBLISHABLE_KEY -notmatch '^<.+>$')
    $envKeyName = if ($Target -eq 'production') { 'INVIFY_PROD_SUPABASE_PUBLISHABLE_KEY' } else { 'INVIFY_STAGING_SUPABASE_PUBLISHABLE_KEY' }
    $envKey = [Environment]::GetEnvironmentVariable($envKeyName)
    if (-not $hasKey -and [string]::IsNullOrWhiteSpace($envKey)) {
        Write-Host "$Target APK requires SUPABASE_PUBLISHABLE_KEY via config/app_targets/$Target.local.json" -ForegroundColor Red
        Write-Host "or env $envKeyName. See $Target.local.example.json." -ForegroundColor Red
        exit 2
    }
    if (-not $hasKey -and -not [string]::IsNullOrWhiteSpace($envKey)) {
        $extraKeyDefine = $envKey
    }
    # Hard gate: refuse cross-environment target files at build time.
    if ($Target -eq 'staging') {
        if ([string]$parsed.APP_ENV -ne 'staging') { Write-Host 'Refuse: APP_ENV must be staging' -ForegroundColor Red; exit 2 }
        if ([string]$parsed.API_BASE_URL -notmatch '^https://staging\.invify\.org/?$') { Write-Host 'Refuse: staging API_BASE_URL mismatch' -ForegroundColor Red; exit 2 }
        if ([string]$parsed.SUPABASE_URL -notmatch 'rpcjelhacmkhzguljdgi') { Write-Host 'Refuse: staging SUPABASE_URL mismatch' -ForegroundColor Red; exit 2 }
        if ([string]$parsed.API_BASE_URL -match 'api\.invify\.org' -or [string]$parsed.SUPABASE_URL -match 'jjixrywfnaijvahmvcwj') {
            Write-Host 'Refuse: staging target contains production markers' -ForegroundColor Red; exit 2
        }
    }
    if ($Target -eq 'production') {
        if ([string]$parsed.APP_ENV -ne 'production') { Write-Host 'Refuse: APP_ENV must be production' -ForegroundColor Red; exit 2 }
        if ([string]$parsed.API_BASE_URL -notmatch 'api\.invify\.org') { Write-Host 'Refuse: production API_BASE_URL mismatch' -ForegroundColor Red; exit 2 }
        if ([string]$parsed.SUPABASE_URL -notmatch 'jjixrywfnaijvahmvcwj') { Write-Host 'Refuse: production SUPABASE_URL mismatch' -ForegroundColor Red; exit 2 }
        if ([string]$parsed.API_BASE_URL -match 'staging\.invify\.org' -or [string]$parsed.SUPABASE_URL -match 'rpcjelhacmkhzguljdgi') {
            Write-Host 'Refuse: production target contains staging markers' -ForegroundColor Red; exit 2
        }
        $keyPropsGate = Join-Path $PSScriptRoot 'android\key.properties'
        if (-not (Test-Path $keyPropsGate)) {
            Write-Host 'Refuse: production release requires android/key.properties + authorised upload keystore.' -ForegroundColor Red
            Write-Host 'Debug signing is forbidden for production. See docs/releases/INVIFY_ANDROID_PRODUCTION_SIGNING_AUDIT.md' -ForegroundColor Red
            exit 2
        }
    }
}

Write-Host "• App Version : $versionName" -ForegroundColor Yellow
Write-Host "• Build Date  : $dateStr" -ForegroundColor Yellow
Write-Host "• API Target  : $Target" -ForegroundColor Yellow
Write-Host "• Define file : $defineFile" -ForegroundColor Yellow
Write-Host "• Target APK  : invify-v${versionName}-${dateStr}-${Target}-${BuildMode}.apk" -ForegroundColor Yellow
Write-Host ""

if ($Unsigned) {
    $env:BUILD_UNSIGNED = "true"
}

Write-Host "Executing: flutter build apk --$BuildMode --dart-define-from-file=<target>$(if ($extraKeyDefine) { ' + SUPABASE_PUBLISHABLE_KEY via env (redacted)' })" -ForegroundColor Gray
if ($null -ne $extraKeyDefine) {
    flutter build apk --$BuildMode --dart-define-from-file=$defineFile --dart-define=SUPABASE_PUBLISHABLE_KEY=$extraKeyDefine
} else {
    flutter build apk --$BuildMode --dart-define-from-file=$defineFile
}

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

