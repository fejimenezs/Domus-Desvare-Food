
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from '../db/index.js';
dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
router.post('/register', async (req, res) => {
  try{
    const { email, password, name } = req.body;
    if(!email || !password) return res.status(400).json({ error: 'email y password son requeridos' });
    const exists = await query('SELECT id FROM users WHERE email=$1', [email]);
    if(exists.rowCount > 0) return res.status(400).json({ error: 'El usuario ya existe' });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const insert = await query(
      'INSERT INTO users(email, password, name) VALUES($1,$2,$3) RETURNING id, email, name, created_at',
      [email, hash, name || null]
    );
    const user = insert.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  }catch(err){
    console.error('Register error', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});
router.post('/login', async (req, res) => {
  try{
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ error: 'email y password son requeridos' });
    const dbRes = await query('SELECT id, email, password, name FROM users WHERE email=$1', [email]);
    const user = dbRes.rows[0];
    if(!user) return res.status(400).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  }catch(err){
    console.error('Login error', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});
export default router;
