import { BuildVariantService } from '../src/config/build-variant';
import * as dotenv from 'dotenv';
dotenv.config();

const config = BuildVariantService.getInstance().getSupabaseConfig();
console.log('BuildVariantService getSupabaseConfig():');
console.log('url:', config.url);
console.log('key prefix:', config.key?.substring(0, 20));
console.log('serviceRoleKey prefix:', config.serviceRoleKey?.substring(0, 20));
