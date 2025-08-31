// server/db/index.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://caseritosapp_db_user:SqSIlNWCymSTTTP3V2vqvCEXDlSOOoze@dpg-d2pu2kfdiees73cchnm0-a.ohio-postgres.render.com/caseritosapp_db',
  ssl: {
    rejectUnauthorized: false, // obligatorio para Render
  },
});

export async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('DB QUERY ERROR:', err.message, '\n', { text, params });
    throw err;
  }
}
