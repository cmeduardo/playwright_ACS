const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware');
const { buildCart } = require('./cart');

const router = express.Router();
router.use(requireAuth);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCheckout({ shipping = {}, payment = {} }) {
  const errors = {};
  if (!String(shipping.nombre || '').trim()) errors.nombre = 'El nombre es obligatorio';
  if (!EMAIL_RE.test(String(shipping.email || ''))) errors.email = 'Ingresa un correo válido';
  if (String(shipping.direccion || '').trim().length < 5) errors.direccion = 'La dirección debe tener al menos 5 caracteres';
  if (!/^\d{8}$/.test(String(shipping.telefono || ''))) errors.telefono = 'El teléfono debe tener 8 dígitos';
  if (!/^\d{16}$/.test(String(payment.tarjeta || '').replace(/\s/g, ''))) errors.tarjeta = 'La tarjeta debe tener 16 dígitos';
  const exp = String(payment.vencimiento || '');
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(exp);
  if (!m) errors.vencimiento = 'Usa el formato MM/AA';
  else if (2000 + Number(m[2]) < new Date().getFullYear() || (2000 + Number(m[2]) === new Date().getFullYear() && Number(m[1]) < new Date().getMonth() + 1)) {
    errors.vencimiento = 'La tarjeta está vencida';
  }
  if (!/^\d{3}$/.test(String(payment.cvv || ''))) errors.cvv = 'El CVV debe tener 3 dígitos';
  return errors;
}

function loadOrder(id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return null;
  const items = db.prepare('SELECT product_id AS productId, name, price, quantity FROM order_items WHERE order_id = ?').all(id);
  return { ...order, shipping: JSON.parse(order.shipping), items };
}

router.post('/', (req, res) => {
  const cart = buildCart(req.user.id);
  if (!cart.items.length) return res.status(400).json({ error: 'El carrito está vacío' });
  const errors = validateCheckout(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Datos de checkout inválidos', fields: errors });

  const card = String(req.body.payment.tarjeta).replace(/\s/g, '');
  if (card.endsWith('0002')) return res.status(402).json({ error: 'Pago rechazado: tarjeta declinada' });

  const outOfStock = cart.items.find((i) => i.quantity > i.stock);
  if (outOfStock) return res.status(409).json({ error: `Stock insuficiente para ${outOfStock.name}` });

  const create = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO orders (user_id, subtotal, discount, total, coupon, shipping) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, cart.subtotal, cart.discount, cart.total, cart.coupon, JSON.stringify(req.body.shipping));
    for (const i of cart.items) {
      db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)').run(
        info.lastInsertRowid, i.productId, i.name, i.price, i.quantity,
      );
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(i.quantity, i.productId);
    }
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE carts SET coupon = NULL WHERE user_id = ?').run(req.user.id);
    return info.lastInsertRowid;
  });
  res.status(201).json(loadOrder(create()));
});

router.get('/', (req, res) => {
  const all = req.query.all === '1' && req.user.role === 'admin';
  const rows = all
    ? db.prepare('SELECT id FROM orders ORDER BY id DESC').all()
    : db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json(rows.map((r) => loadOrder(r.id)));
});

router.get('/:id', (req, res) => {
  const order = loadOrder(req.params.id);
  if (!order || (order.user_id !== req.user.id && req.user.role !== 'admin')) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  res.json(order);
});

module.exports = router;
