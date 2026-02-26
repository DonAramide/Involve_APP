# Build obfuscated APK with debug info split
Write-Host "🚀 Starting Obfuscated Build..." -ForegroundColor Cyan
flutter build apk --obfuscate --split-debug-info=./debug-info --split-per-abi
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build Complete! APKs are in build/app/outputs/flutter-apk/" -ForegroundColor Green
} else {
    Write-Host "❌ Build Failed!" -ForegroundColor Red
}
