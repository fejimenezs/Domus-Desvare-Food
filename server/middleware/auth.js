// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from '../db/index.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// Middleware to authenticate a user via JWT
export async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization;
    // Check if Authorization header exists and starts with 'Bearer '
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);

    // Fetch user from database
    const dbRes = await query(
      'SELECT id, email, name, phone, role, created_at FROM users WHERE id=$1',
      [payload.userId]
    );
    const user = dbRes.rows[0];

    if (!user) return res.status(401).json({ error: 'User not found' });

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to require admin role
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'adm') return res.status(403).json({ error: 'Admin role required' });
  next();
}
