
import express from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();
router.get('/', authenticate, async (req, res) => {
  try{ const q = await query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]); res.json(q.rows); }
  catch(err){ console.error('GET /notifications error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.patch('/:id/read', authenticate, async (req, res) => {
  try{ await query('UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2', [parseInt(req.params.id), req.user.id]); res.json({ ok: true }); }
  catch(err){ console.error('PATCH /notifications/:id/read error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
export default router;
