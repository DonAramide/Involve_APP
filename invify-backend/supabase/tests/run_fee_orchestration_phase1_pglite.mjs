const fs = require("fs");
const path = require("path");

async function main() {
  const { PGlite } = await import("@electric-sql/pglite");
  const sb = path.resolve(__dirname, "..");
  const pg = new PGlite();
  const files = [
    "tests/fee_orchestration_phase1_stub.sql",
    "migrations/20260926163000_fee_orchestration_phase1.sql",
    "tests/fee_orchestration_phase1_verify.sql",
    "rollbacks/20260926163000_fee_orchestration_phase1.sql",
    "tests/fee_orchestration_phase1_after_rollback.sql",
  ];
  for (const rel of files) {
    const sql = fs.readFileSync(path.join(sb, rel), "utf8");
    process.stdout.write(`=== applying ${rel} ===\n`);
    await pg.exec(sql);
  }
  process.stdout.write("PHASE1_VERIFY_OK\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
