# Prefer: .\build-apk.ps1 -Target staging   or   -Target local
& "$PSScriptRoot\build-apk.ps1" -Target staging -BuildMode release
exit $LASTEXITCODE
