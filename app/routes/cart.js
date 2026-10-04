const express = require('express');
const { db } = require('../db');
const { BUGS } = require('../config');
const { requireAuth } = require('../middleware');

const router = express.Router();
router.use(requireAuth);

const toCents = (n) => Math.round(n * 100);
const fromCents = (c) => c / 100;

function calcDiscountCents(coupon, subtotalCents) {
  if (!coupon) return 0;
  if (coupon.type === 'fixed') return Math.min(toCents(coupon.value), subtotalCents);
  let pct = coupon.value;
  // BUG-001: con BUGS=on, en compras de Q500 o más el descuento porcentual se aplica doble.
  if (BUGS && subtotalCents >= 50000) pct *= 2;
  return Math.min(Math.round((subtotalCents * pct) / 100), subtotalCents);
}

function buildCart(userId) {
  const items = db
    .prepare(
      `SELECT ci.product_id AS productId, p.name, p.emoji, p.price, p.stock, ci.quantity
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ? ORDER BY ci.rowid`,
    )
    .all(userId)
    .map((i) => ({ ...i, subtotal: fromCents(toCents(i.price) * i.quantity) }));
  const cartRow = db.prepare('SELECT coupon FROM carts WHERE user_id = ?').get(userId);
  const coupon = cartRow?.coupon ? db.prepare('SELECT * FROM coupons WHERE code = ?').get(cartRow.coupon) : null;
  const subtotalCents = items.reduce((acc, i) => acc + toCents(i.price) * i.quantity, 0);
  const discountCents = calcDiscountCents(coupon, subtotalCents);
  return {
    items,
    coupon: coupon ? coupon.code : null,
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    total: fromCents(subtotalCents - discountCents),
  };
}

// BUG-002: con BUGS=on no se valida que la cantidad sea positiva.
function validQuantity(q) {
  if (!Number.isInteger(q)) return false;
  if (BUGS) return true;
  return q >= 1 && q <= 99;
}
const QTY_ERROR = 'La cantidad debe ser un entero entre 1 y 99';

router.get('/', (req, res) => res.json(buildCart(req.user.id)));

router.post('/items', (req, res) => {
  const { productId, quantity = 1 } = req.body || {};
  if (!validQuantity(quantity)) return res.status(400).json({ error: QTY_ERROR });
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  const existing = db
    .prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, product.id);
  const newQty = (existing?.quantity || 0) + quantity;
  if (!validQuantity(newQty)) return res.status(400).json({ error: QTY_ERROR });
  if (newQty > product.stock) return res.status(409).json({ error: `Stock insuficiente (disponible: ${product.stock})` });
  db.prepare(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
     ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = excluded.quantity`,
  ).run(req.user.id, product.id, newQty);
  res.status(201).json(buildCart(req.user.id));
});

router.patch('/items/:productId', (req, res) => {
  const { quantity } = req.body || {};
  if (!validQuantity(quantity)) return res.status(400).json({ error: QTY_ERROR });
  const item = db
    .prepare('SELECT 1 FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, req.params.productId);
  if (!item) return res.status(404).json({ error: 'El producto no está en el carrito' });
  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.productId);
  if (quantity > product.stock) return res.status(409).json({ error: `Stock insuficiente (disponible: ${product.stock})` });
  db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(
    quantity,
    req.user.id,
    req.params.productId,
  );
  res.json(buildCart(req.user.id));
});

router.delete('/items/:productId', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json(buildCart(req.user.id));
});

router.post('/coupon', (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Ingresa un código de cupón' });
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code);
  if (!coupon || !coupon.active) return res.status(404).json({ error: 'Cupón inválido o expirado' });
  const cart = buildCart(req.user.id);
  if (cart.subtotal < coupon.min_amount) {
    return res.status(400).json({ error: `El cupón requiere una compra mínima de Q${coupon.min_amount.toFixed(2)}` });
  }
  db.prepare('INSERT INTO carts (user_id, coupon) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET coupon = excluded.coupon').run(
    req.user.id,
    code,
  );
  res.json(buildCart(req.user.id));
});

router.delete('/coupon', (req, res) => {
  db.prepare('UPDATE carts SET coupon = NULL WHERE user_id = ?').run(req.user.id);
  res.json(buildCart(req.user.id));
});

module.exports = { router, buildCart };
