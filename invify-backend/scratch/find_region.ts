import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_REF = 'rpcjelhacmkhzguljdgi';
const SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

const REGIONS = [
  'eu-north-1', 'eu-central-2', 'me-central-1', 'af-south-1', 'ap-southeast-3', 'ap-northeast-3',
  'eu-west-2', 'eu-west-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2',
  'ca-central-1', 'eu-central-1', 'eu-west-3', 'sa-east-1'
];

async function testRegion(region: string) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
    host,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! Connected to region: ${region}`);
    await client.end();
    return true;
  } catch (err: any) {
    if (err.message.includes('tenant/user') && err.message.includes('not found')) {
      process.stdout.write(`.`);
    } else {
      console.log(`\nRegion ${region} failed with error: ${err.message}`);
    }
    await client.end().catch(() => {});
    return false;
  }
}

async function run() {
  console.log(`Probing pooler regions for project ${PROJECT_REF} with all regions...`);
  for (const region of REGIONS) {
    const success = await testRegion(region);
    if (success) {
      console.log(`Found it! Region is ${region}`);
      process.exit(0);
    }
  }
  console.log('\nFinished probe. None succeeded.');
}

run().catch(console.error);
