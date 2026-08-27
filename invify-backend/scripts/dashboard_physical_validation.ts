import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import {
  loadStagingEnv,
  requireStagingPublishableKey,
} from './lib/staging-supabase-env';

dotenv.config({ path: path.join(__dirname, '../.env.staging') });
const stagingEnv = loadStagingEnv();
const SUPABASE_URL = stagingEnv.STAGING_SUPABASE_URL || process.env.STAGING_SUPABASE_URL || '';
const SUPABASE_KEY = requireStagingPublishableKey(stagingEnv);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
