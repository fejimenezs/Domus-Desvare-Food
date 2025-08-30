
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from '../db/index.js';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
export async function authenticate(req, res, next){
  try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith('Bearer ')){
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const dbRes = await query('SELECT id, email, name, created_at FROM users WHERE id=$1', [payload.userId]);
    const user = dbRes.rows[0];
    if(!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.user = user;
    next();
  }catch(err){
    console.error('Auth error', err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
}
