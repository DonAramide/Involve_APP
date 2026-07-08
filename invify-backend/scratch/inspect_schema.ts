import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { BuildVariantService } from '../src/config/build-variant';

async function run() {
  const config = BuildVariantService.getInstance().getSupabaseConfig();
  const url = config.url;
  const key = config.serviceRoleKey;
  console.log('Fetching OpenAPI spec from PostgREST...');
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const spec = await res.json();
  
  if (spec.definitions?.tenants) {
    console.log('tenants columns:', spec.definitions.tenants.properties);
  } else {
    console.log('tenants is not defined in spec!');
  }
}
run();
