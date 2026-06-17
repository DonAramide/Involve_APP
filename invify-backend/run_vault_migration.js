const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: 'C:/dev/Involve_APP/invify-backend/.env' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'
  });
  
  try {
    await client.connect();
    const sqlPath = 'C:/dev/Involve_APP/invify-backend/016_integration_vault_migration.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await client.end();
  }
}
run();
