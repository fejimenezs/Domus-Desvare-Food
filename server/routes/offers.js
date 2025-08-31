// server/routes/offers.js
import express from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();

async function createNotification(userId, payload){
  try{ await query('INSERT INTO notifications(user_id, payload) VALUES($1,$2)', [userId, payload]); }
  catch(err){ console.error('createNotification error', err.message); }
}

// GET /api/offers - exclude sold
router.get('/', async (req, res) => {
  try{
    const { q, loc, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT o.id,o.title,o.description,o.price,o.qty,o.location,o.status,o.seller_id,o.created_at,u.name as seller_name FROM offers o JOIN users u ON u.id=o.seller_id WHERE o.status<>$1';
    const params = ['sold'];
    if(q){ params.push(`%${q.toLowerCase()}%`); sql += ` AND LOWER(o.description) LIKE $${params.length}`; }
    if(loc){ params.push(`%${loc.toLowerCase()}%`); sql += ` AND LOWER(o.location) LIKE $${params.length}`; }
    params.push(limit); params.push(offset);
    sql += ` ORDER BY o.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const dbRes = await query(sql, params);
    res.json(dbRes.rows);
  }catch(err){
    console.error('GET /offers error', err.message); res.status(500).json({ error: 'Error interno' });
  }
});

// POST create offer - any user can create
router.post('/', authenticate, async (req, res) => {
  try{
    const { title, description, price, qty = 1, location } = req.body;
    if(!title || !description || price == null) return res.status(400).json({ error: 'title, description y price son requeridos' });
    const dbRes = await query('INSERT INTO offers(seller_id, title, description, price, qty, location) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [req.user.id, title, description, price, qty, location || null]);
    res.status(201).json(dbRes.rows[0]);
  }catch(err){ console.error('POST /offers error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// GET offer detail with bids and seller phone
router.get('/:id', async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const dbRes = await query('SELECT o.*, u.name as seller_name, u.phone as seller_phone FROM offers o JOIN users u ON u.id=o.seller_id WHERE o.id=$1', [id]);
    const offer = dbRes.rows[0];
    if(!offer) return res.status(404).json({ error: 'Oferta no encontrada' });
    const bidsRes = await query('SELECT b.*, u.name as user_name, u.phone as user_phone FROM bids b JOIN users u ON u.id=b.user_id WHERE b.offer_id=$1 ORDER BY b.created_at DESC', [id]);
    offer.bids = bidsRes.rows;
    res.json(offer);
  }catch(err){ console.error('GET /offers/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// POST create bid - notify seller with bidder phone
router.post('/:id/bids', authenticate, async (req, res) => {
  try{
    const offerId = parseInt(req.params.id);
    const { price } = req.body;
    if(price == null) return res.status(400).json({ error: 'price es requerido' });
    const offRes = await query('SELECT * FROM offers WHERE id=$1', [offerId]);
    if(offRes.rowCount === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
    const offer = offRes.rows[0];
    const insert = await query('INSERT INTO bids(offer_id, user_id, price) VALUES($1,$2,$3) RETURNING *', [offerId, req.user.id, price]);
    // notify seller with bidder phone
    await createNotification(offer.seller_id, {
      type: 'bid',
      message: `New bid $${price} in "${offer.title}". Bidder's phone number: ${req.user.phone || 'Not reported'}`,
      offer_id: offerId,
      bid_id: insert.rows[0].id,
      bidder_id: req.user.id
    });
    res.status(201).json(insert.rows[0]);
  }catch(err){ console.error('POST /offers/:id/bids error', err.message); res.status(500).json({ error: 'Not reported' }); }
});

// POST buy now - prevent seller buying own product
router.post('/:id/buy', authenticate, async (req, res) => {
  try{
    const offerId = parseInt(req.params.id);
    const off = await query('SELECT * FROM offers WHERE id=$1', [offerId]);
    if(off.rowCount === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
    const offer = off.rows[0];
    if(offer.seller_id === req.user.id) return res.status(400).json({ error: 'No puedes comprar tu propio producto' });
    if(offer.status === 'sold') return res.status(400).json({ error: 'Oferta ya vendida' });
    let newQty = offer.qty - 1; if(newQty < 0) newQty = 0;
    if(newQty === 0){
      const upd = await query('UPDATE offers SET qty=0, status=$1, sold_at=now(), buyer_id=$2 WHERE id=$3 RETURNING *', ['sold', req.user.id, offerId]);
      // notify seller with buyer phone
      await createNotification(offer.seller_id, {
        type: 'sale',
        message: `Tu oferta "${offer.title}" fue vendida por compra directa. Teléfono del comprador: ${req.user.phone || 'Not reported'}`,
        buyer_id: req.user.id,
        offer_id: offerId
      });
      // notify buyer with seller phone
      const seller = await query('SELECT phone FROM users WHERE id=$1', [offer.seller_id]);
      await createNotification(req.user.id, {
        type: 'purchase',
        message: `Compraste "${offer.title}". Teléfono del vendedor: ${seller.rows[0]?.phone || 'Not reported'}`,
        offer_id: offerId
      });
      return res.json({ ok: true, offer: upd.rows[0] });
    }else{
      const upd = await query('UPDATE offers SET qty=$1 WHERE id=$2 RETURNING *', [newQty, offerId]);
      await createNotification(offer.seller_id, {
        type: 'partial_sale',
        message: `You bought 1 unit of "${offer.title}". Available ${newQty}. Buyer's phone: ${req.user.phone || 'Not reported'}`,
        buyer_id: req.user.id,
        offer_id: offerId
      });
      await createNotification(req.user.id, {
        type: 'purchase_partial',
        message: `You bought 1 unit of "${offer.title}". Seller's phone: ${(await query('SELECT phone FROM users WHERE id=$1',[offer.seller_id])).rows[0]?.phone || 'Not reported'}`,
        offer_id: offerId
      });
      return res.json({ ok: true, offer: upd.rows[0] });
    }
  }catch(err){ console.error('POST /offers/:id/buy error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// POST accept bid - only seller can accept; notify buyer with seller phone
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
    // notify buyer with seller phone
    const sellerPhone = (await query('SELECT phone FROM users WHERE id=$1',[offer.seller_id])).rows[0]?.phone || 'No indicado';
    await createNotification(bid.user_id, {
      type: 'bid_accepted',
      message: `Your bid $${bid.price} was accepted for "${offer.title}". Seller's phone: ${sellerPhone}`,
      offer_id: offerId, bid_id: bidId
    });
    // notify seller with buyer phone
    const buyerPhone = (await query('SELECT phone FROM users WHERE id=$1',[bid.user_id])).rows[0]?.phone || 'No reported';
    await createNotification(offer.seller_id, {
      type: 'bid_confirmed',
      message: `You accepted the bid $${bid.price} for "${offer.title}". Buyer's phone: ${buyerPhone}`,
      offer_id: offerId, bid_id: bidId
    });
    res.json({ ok: true });
  }catch(err){ console.error('POST /offers/:id/bids/:bidId/accept error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// PUT update offer
router.put('/:id', authenticate, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const { title, description, price, qty, location } = req.body;
    const owner = await query('SELECT seller_id FROM offers WHERE id=$1', [id]);
    if(owner.rowCount===0) return res.status(404).json({ error: 'Oferta no encontrada' });
    if(owner.rows[0].seller_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
    const updated = await query(
      `UPDATE offers SET title=COALESCE($1,title), description=COALESCE($2,description), price=COALESCE($3,price), qty=COALESCE($4,qty), location=COALESCE($5,location) WHERE id=$6 RETURNING *`,
      [title, description, price, qty, location, id]
    );
    res.json(updated.rows[0]);
  }catch(err){ console.error('PUT /offers/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

// DELETE offer
router.delete('/:id', authenticate, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const owner = await query('SELECT seller_id FROM offers WHERE id=$1', [id]);
    if(owner.rowCount===0) return res.status(404).json({ error: 'Oferta no encontrada' });
    if(owner.rows[0].seller_id !== req.user.id && req.user.role !== 'adm') return res.status(403).json({ error: 'No autorizado' });
    await query('DELETE FROM offers WHERE id=$1', [id]);
    res.json({ ok: true });
  }catch(err){ console.error('DELETE /offers/:id error', err.message); res.status(500).json({ error: 'Error interno' }); }
});

export default router;
