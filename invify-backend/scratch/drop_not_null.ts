const { Client } = require('pg');
require('dotenv').config({ path: 'C:/dev/Involve_APP/invify-backend/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  console.log('Connecting using connection string...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database.');

    const sql = `
      ALTER TABLE public.commission_events ALTER COLUMN plan_id DROP NOT NULL;
      ALTER TABLE public.commission_events ALTER COLUMN agent_id DROP NOT NULL;
    `;
    await client.query(sql);
    console.log('Successfully dropped NOT NULL constraints on plan_id and agent_id in commission_events.');
  } catch (err: any) {
    console.error('Operation failed:', err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
