@echo off
echo 🚀 Starting Build with .env.apk-defines.json...
flutter build apk --release --dart-define-from-file=.env.apk-defines.json
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build Complete! APK is in build\app\outputs\flutter-apk\app-release.apk
) else (
    echo ❌ Build Failed!
)
pause
