// server/routes/users.js
import express from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();

// GET /api/users/me/history - returns bids made and purchases
router.get('/me/history', authenticate, async (req, res) => {
  try{
    const bids = await query('SELECT b.*, o.title as offer_title FROM bids b JOIN offers o ON o.id=b.offer_id WHERE b.user_id=$1 ORDER BY b.created_at DESC', [req.user.id]);
    const purchases = await query('SELECT o.* FROM offers o WHERE o.buyer_id=$1 ORDER BY o.sold_at DESC', [req.user.id]);
    res.json({ bids: bids.rows, purchases: purchases.rows });
  }catch(err){ console.error('GET /users/me/history error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// GET /api/users/me
router.get('/me', authenticate, async (req, res) => {
  res.json(req.user);
});

export default router;
