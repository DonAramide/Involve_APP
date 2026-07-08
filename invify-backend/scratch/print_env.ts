import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { BuildVariantService } from '../src/config/build-variant';

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('BUILD_VARIANT:', process.env.BUILD_VARIANT);
const config = BuildVariantService.getInstance().getSupabaseConfig();
console.log('Supabase URL:', config.url);
console.log('Supabase Key length:', config.key?.length);
console.log('Supabase Service Key length:', config.serviceRoleKey?.length);
