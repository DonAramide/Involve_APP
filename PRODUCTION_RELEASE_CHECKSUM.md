# Production Release Checksum Verification

This document provides guidelines on how the integrity of the release package can be independently verified.

---

## 1. INDEPENDENT VERIFICATION

To verify the integrity of the generated release package, run the following command in the repository root:

```powershell
Get-FileHash -Path (Get-ChildItem -Path C:\dev\Involve_APP\production-release -File -Recurse) -Algorithm SHA256 | ForEach-Object {
    $relPath = $_.Path.Replace("C:\dev\Involve_APP\production-release\", "")
    "$($_.Hash)  $relPath"
}
```

Compare the output hashes against the contents of `PRODUCTION_RELEASE_SHA256.txt` to confirm that no files were modified or corrupted during transfer.
