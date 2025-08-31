// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from '../db/index.js';
dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

/* ----------------- RUTAS AUTH ----------------- */
router.post('/register', async (req, res) => {
  try{
    const { email, password, name, phone } = req.body;
    if(!email || !password) return res.status(400).json({ error: 'email y password son requeridos' });
    const exists = await query('SELECT id FROM users WHERE email=$1', [email]);
    if(exists.rowCount > 0) return res.status(400).json({ error: 'El usuario ya existe' });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const insert = await query(
      'INSERT INTO users(email, password, name, phone, role) VALUES($1,$2,$3,$4,$5) RETURNING id, email, name, phone, role, created_at',
      [email, hash, name || null, phone || null, 'user']
    );
    const user = insert.rows[0];
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role }, token });
  }catch(err){
    console.error('Register error', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/login', async (req, res) => {
  try{
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ error: 'email y password son requeridos' });
    const dbRes = await query('SELECT id, email, password, name, phone, role FROM users WHERE email=$1', [email]);
    const user = dbRes.rows[0];
    if(!user) return res.status(400).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role }, token });
  }catch(err){
    console.error('Login error', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ----------------- ensureAdmin ----------------- */
/*
  ensureAdmin(): crea o actualiza un usuario "adm" usando variables en .env:
  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE
  - Hashea la contraseña con bcrypt antes de guardar.
  - Exporta la función para llamarla desde server/index.js antes de escuchar.
*/
export async function ensureAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const plain = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Administrador';
    const phone = process.env.ADMIN_PHONE || null;
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

    if (!email || !plain) {
      console.log('ensureAdmin: ADMIN_EMAIL o ADMIN_PASSWORD no definidos en .env — se omite creación de admin.');
      return;
    }

    const hashed = await bcrypt.hash(plain, saltRounds);

    const r = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (r.rowCount === 0) {
      await query('INSERT INTO users (email, password, name, phone, role) VALUES ($1,$2,$3,$4,$5)', [
        email, hashed, name, phone, 'adm'
      ]);
      console.log(`ensureAdmin: usuario admin creado (${email})`);
    } else {
      await query('UPDATE users SET password=$1, role=$2, name=COALESCE($3,name), phone=COALESCE($4,phone) WHERE email=$5', [
        hashed, 'adm', name, phone, email
      ]);
      console.log(`ensureAdmin: usuario admin actualizado (${email})`);
    }
  } catch (err) {
    console.error('ensureAdmin error:', err);
  }
}

export default router;
