const { Client } = require('pg');
require('dotenv').config({ path: 'C:/dev/Involve_APP/invify-backend/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  console.log('Testing connection to:', connectionString.replace(/:([^:@]+)@/, ':***@'));
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'commission_events';
    `);
    console.log('Columns in commission_events:');
    console.log(res.rows);
  } catch (err: any) {
    console.error('Connection failed with error:', err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
