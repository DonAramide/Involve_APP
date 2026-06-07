const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'C:/dev/Involve_APP/invify-backend/.env' });

const dbUrl = process.env.SUPABASE_URL 
  ? process.env.SUPABASE_URL.replace('http://', 'postgres://postgres:').replace('https://', 'postgres://postgres:') 
  : null;

// Actually, Supabase REST URL is not a postgres connection string. 
// Usually SUPABASE_DB_URL or DATABASE_URL is used for direct connection.
// Let's assume DATABASE_URL exists in .env
async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'
  });
  
  try {
    await client.connect();
    const sqlPath = 'C:/dev/Involve_APP/invify-backend/agent_system_phase7_migration.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('Migration executed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
run();
