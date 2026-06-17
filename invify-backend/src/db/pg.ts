import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const dbQuery = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[PostgreSQL] executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[PostgreSQL] query error', text, error);
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};
