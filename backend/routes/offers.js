
import express from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();
async function createNotification(userId, payload){
  try{ await query('INSERT INTO notifications(user_id, payload) VALUES($1,$2)', [userId, payload]); }
  catch(err){ console.error('createNotification error', err.message); }
}
router.get('/', async (req, res) => {
  try{
    const { q, loc, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT o.*, u.email as seller_email, u.name as seller_name FROM offers o JOIN users u ON u.id=o.seller_id';
    const where = []; const params = [];
    if(q){ params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(o.description) LIKE $${params.length}`); }
    if(loc){ params.push(`%${loc.toLowerCase()}%`); where.push(`LOWER(o.location) LIKE $${params.length}`); }
    if(where.length) sql += ' WHERE ' + where.join(' AND ');
    params.push(limit); params.push(offset);
    sql += ` ORDER BY o.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const dbRes = await query(sql, params);
    res.json(dbRes.rows);
  }catch(err){ console.error('GET /offers error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.post('/', authenticate, async (req, res) => {
  try{
    const { description, price, qty = 1, location } = req.body;
    if(!description || price == null) return res.status(400).json({ error: 'description y price son requeridos' });
    const dbRes = await query('INSERT INTO offers(seller_id, description, price, qty, location) VALUES($1,$2,$3,$4,$5) RETURNING *', [req.user.id, description, price, qty, location || null]);
    res.status(201).json(dbRes.rows[0]);
  }catch(err){ console.error('POST /offers error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.get('/:id', async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const dbRes = await query('SELECT o.*, u.email as seller_email, u.name as seller_name FROM offers o JOIN users u ON u.id=o.seller_id WHERE o.id=$1', [id]);
    const offer = dbRes.rows[0];
    if(!offer) return res.status(404).json({ error: 'Oferta no encontrada' });
    const bidsRes = await query('SELECT b.*, u.email as user_email, u.name as user_name FROM bids b JOIN users u ON u.id=b.user_id WHERE b.offer_id=$1 ORDER BY b.created_at DESC', [id]);
    offer.bids = bidsRes.rows;
    res.json(offer);
  }catch(err){ console.error('GET /offers/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.post('/:id/bids', authenticate, async (req, res) => {
  try{
    const offerId = parseInt(req.params.id); const { price } = req.body;
    if(price == null) return res.status(400).json({ error: 'price es requerido' });
    const offRes = await query('SELECT * FROM offers WHERE id=$1', [offerId]);
    if(offRes.rowCount === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
    const offer = offRes.rows[0];
    const insert = await query('INSERT INTO bids(offer_id, user_id, price) VALUES($1,$2,$3) RETURNING *', [offerId, req.user.id, price]);
    await createNotification(offer.seller_id, { type: 'bid', message: `Nueva puja de $${price} en "${offer.description}"`, offer_id: offerId, bid_id: insert.rows[0].id, bidder_id: req.user.id });
    res.status(201).json(insert.rows[0]);
  }catch(err){ console.error('POST /offers/:id/bids error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.post('/:id/buy', authenticate, async (req, res) => {
  try{
    const offerId = parseInt(req.params.id);
    const off = await query('SELECT * FROM offers WHERE id=$1', [offerId]);
    if(off.rowCount === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
    const offer = off.rows[0];
    if(offer.status === 'sold') return res.status(400).json({ error: 'Oferta ya vendida' });
    let newQty = offer.qty - 1;
    if(newQty < 0) newQty = 0;
    if(newQty === 0){
      const upd = await query('UPDATE offers SET qty=0, status=$1, sold_at=now(), buyer_id=$2 WHERE id=$3 RETURNING *', ['sold', req.user.id, offerId]);
      await createNotification(offer.seller_id, { type: 'sale', message: `Tu oferta "${offer.description}" fue vendida por compra directa.`, buyer_id: req.user.id, offer_id: offerId });
      return res.json({ ok: true, offer: upd.rows[0] });
    }else{
      const upd = await query('UPDATE offers SET qty=$1 WHERE id=$2 RETURNING *', [newQty, offerId]);
      await createNotification(offer.seller_id, { type: 'partial_sale', message: `Se vendió 1 unidad de "${offer.description}". Quedan ${newQty}.`, buyer_id: req.user.id, offer_id: offerId });
      return res.json({ ok: true, offer: upd.rows[0] });
    }
  }catch(err){ console.error('POST /offers/:id/buy error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.post('/:id/bids/:bidId/accept', authenticate, async (req, res) => {
  try{
    const offerId = parseInt(req.params.id); const bidId = parseInt(req.params.bidId);
    const offR = await query('SELECT * FROM offers WHERE id=$1', [offerId]);
    if(offR.rowCount === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
    const offer = offR.rows[0];
    if(offer.seller_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    const bidR = await query('SELECT * FROM bids WHERE id=$1 AND offer_id=$2', [bidId, offerId]);
    if(bidR.rowCount === 0) return res.status(404).json({ error: 'Puja no encontrada' });
    const bid = bidR.rows[0];
    if(offer.status === 'sold') return res.status(400).json({ error: 'Oferta ya vendida' });
    await query('UPDATE bids SET accepted=true WHERE id=$1', [bidId]);
    let newQty = offer.qty - 1;
    if(newQty <= 0){
      await query('UPDATE offers SET qty=0, status=$1, sold_at=now(), buyer_id=$2 WHERE id=$3', ['sold', bid.user_id, offerId]);
    }else{
      await query('UPDATE offers SET qty=$1 WHERE id=$2', [newQty, offerId]);
    }
    await createNotification(bid.user_id, { type: 'bid_accepted', message: `Tu puja de $${bid.price} fue aceptada para la oferta "${offer.description}".`, offer_id: offerId, bid_id: bidId });
    await createNotification(offer.seller_id, { type: 'bid_confirmed', message: `Aceptaste la puja $${bid.price} para "${offer.description}".`, offer_id: offerId, bid_id: bidId });
    res.json({ ok: true });
  }catch(err){ console.error('POST /offers/:id/bids/:bidId/accept error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.put('/:id', authenticate, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const { description, price, qty, location } = req.body;
    const owner = await query('SELECT seller_id FROM offers WHERE id=$1', [id]);
    if(owner.rowCount===0) return res.status(404).json({ error: 'Oferta no encontrada' });
    if(owner.rows[0].seller_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    const updated = await query(`UPDATE offers SET description=COALESCE($1,description), price=COALESCE($2,price), qty=COALESCE($3,qty), location=COALESCE($4,location) WHERE id=$5 RETURNING *`, [description, price, qty, location, id]);
    res.json(updated.rows[0]);
  }catch(err){ console.error('PUT /offers/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
router.delete('/:id', authenticate, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const owner = await query('SELECT seller_id FROM offers WHERE id=$1', [id]);
    if(owner.rowCount===0) return res.status(404).json({ error: 'Oferta no encontrada' });
    if(owner.rows[0].seller_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    await query('DELETE FROM offers WHERE id=$1', [id]);
    res.json({ ok: true });
  }catch(err){ console.error('DELETE /offers/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});
export default router;
