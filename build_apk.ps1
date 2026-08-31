# Build release APK with dart defines from .env.apk-defines.json
Write-Host "🚀 Starting Build with .env.apk-defines.json..." -ForegroundColor Cyan
flutter build apk --release --dart-define-from-file=.env.apk-defines.json
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build Complete! APK is in build/app/outputs/flutter-apk/app-release.apk" -ForegroundColor Green
} else {
    Write-Host "❌ Build Failed!" -ForegroundColor Red
}
