
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function query(text, params){
  try{
    const res = await pool.query(text, params);
    return res;
  }catch(err){
    console.error('DB QUERY ERROR:', err.message, '\n', { text, params });
    throw err;
  }
}
