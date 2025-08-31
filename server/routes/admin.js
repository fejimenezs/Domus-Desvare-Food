// server/routes/admin.js
import express from 'express';
import { query } from '../db/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
const router = express.Router();

// List users
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try{
    const r = await query('SELECT id, email, name, phone, role, created_at FROM users ORDER BY created_at DESC');
    res.json(r.rows);
  }catch(err){ console.error('GET /admin/users error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// Edit user
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const { name, phone, role } = req.body;
    const up = await query('UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone), role=COALESCE($3,role) WHERE id=$4 RETURNING id, email, name, phone, role', [name, phone, role, id]);
    res.json(up.rows[0]);
  }catch(err){ console.error('PUT /admin/users/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// Delete user
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    await query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ ok: true });
  }catch(err){ console.error('DELETE /admin/users/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// Admin: list offers
router.get('/offers', authenticate, requireAdmin, async (req, res) => {
  try{
    const r = await query('SELECT o.*, u.name as seller_name FROM offers o JOIN users u ON u.id=o.seller_id ORDER BY o.created_at DESC');
    res.json(r.rows);
  }catch(err){ console.error('GET /admin/offers error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// Admin: delete offer
router.delete('/offers/:id', authenticate, requireAdmin, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    await query('DELETE FROM offers WHERE id=$1', [id]);
    res.json({ ok: true });
  }catch(err){ console.error('DELETE /admin/offers/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

export default router;
