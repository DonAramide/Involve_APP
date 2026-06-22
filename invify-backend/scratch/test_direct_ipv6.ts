import { Client } from 'pg';

const host = '2a05:d019:cf3:6a02:c25b:5387:41a8:8939'; // IPv6 address of db.rpcjelhacmkhzguljdgi.supabase.co
const passwords = [
  'postgres',
  'Password123!',
  'password123',
  'Quasar#Aramyde@369369369!',
  'your-super-secret-key-2026',
];

async function testPassword(password: string) {
  const client = new Client({
    host,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password,
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    console.log(`\n🎉 Success with password: ${password}`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`Failed with password "${password}": ${err.message}`);
    await client.end().catch(() => {});
    return false;
  }
}

async function run() {
  console.log('Testing direct IPv6 connections...');
  for (const pw of passwords) {
    const success = await testPassword(pw);
    if (success) process.exit(0);
  }
  console.log('All password attempts failed.');
}

run().catch(console.error);
