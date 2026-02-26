@echo off
echo 🚀 Starting Obfuscated Build...
flutter build apk --obfuscate --split-debug-info=./debug-info --split-per-abi
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build Complete! APKs are in build\app\outputs\flutter-apk\
) else (
    echo ❌ Build Failed!
)
pause
