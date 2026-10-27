# sync_manuals.ps1 - Copies the clean fixed manuals to the primary names
$files = @(
    @{ Src = "INVIFY_MANUAL_SCHOOL_MODE_FIXED.pdf"; Dst = "INVIFY_MANUAL_SCHOOL_MODE.pdf" },
    @{ Src = "INVIFY_MANUAL_SERVICE_MODE_FIXED.pdf"; Dst = "INVIFY_MANUAL_SERVICE_MODE.pdf" },
    @{ Src = "INVIFY_MASTER_MANUAL_FIXED.pdf"; Dst = "INVIFY_MASTER_MANUAL.pdf" }
)

foreach ($f in $files) {
    try {
        Copy-Item -Path $f.Src -Destination $f.Dst -Force -ErrorAction Stop
        Write-Host "✓ Updated $($f.Dst)" -ForegroundColor Green
    } catch {
        Write-Warning "! Could not overwrite $($f.Dst) - ensure it is closed in your PDF viewer / browser."
    }
}
