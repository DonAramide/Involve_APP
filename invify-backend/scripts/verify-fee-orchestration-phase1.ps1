$ErrorActionPreference = "Stop"
$sb = Join-Path (Split-Path $PSScriptRoot -Parent) "supabase"
$name = "fee-orch-phase1-pg"

function Invoke-PsqlFile([string]$rel) {
  $path = Join-Path $sb $rel
  if (-not (Test-Path $path)) { throw "missing $path" }
  Write-Host "=== applying $rel ==="
  cmd.exe /c "docker exec -i $name psql -v ON_ERROR_STOP=1 -U postgres -d postgres < `"$path`""
  if ($LASTEXITCODE -ne 0) { throw "psql failed on $rel (exit $LASTEXITCODE)" }
}

docker rm -f $name 2>$null | Out-Null
docker run --name $name -e POSTGRES_PASSWORD=postgres -d postgres:16-alpine | Out-Null
try {
  $ready = $false
  foreach ($i in 1..40) {
    docker exec $name pg_isready -U postgres | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw "postgres did not become ready" }

  Invoke-PsqlFile "tests\fee_orchestration_phase1_stub.sql"
  Invoke-PsqlFile "migrations\20260926163000_fee_orchestration_phase1.sql"
  Invoke-PsqlFile "tests\fee_orchestration_phase1_verify.sql"
  Invoke-PsqlFile "rollbacks\20260926163000_fee_orchestration_phase1.sql"
  Invoke-PsqlFile "tests\fee_orchestration_phase1_after_rollback.sql"
  Write-Host "PHASE1_VERIFY_OK"
}
finally {
  docker rm -f $name | Out-Null
}
