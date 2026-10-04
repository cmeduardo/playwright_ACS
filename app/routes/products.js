const express = require('express');
const { db } = require('../db');
const { BUGS } = require('../config');
const { requireAuth, requireAdmin } = require('../middleware');

const router = express.Router();

// Normaliza para búsquedas sin distinguir mayúsculas ni tildes ("cafe" encuentra "Café").
const normalize = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function validateProduct(body, partial = false) {
  const errors = [];
  const { name, price, stock, category } = body || {};
  if (!partial || name !== undefined) if (!name || !String(name).trim()) errors.push('El nombre es obligatorio');
  if (!partial || price !== undefined) if (typeof price !== 'number' || !(price >= 0)) errors.push('El precio debe ser un número mayor o igual a 0');
  if (!partial || stock !== undefined) if (!Number.isInteger(stock) || stock < 0) errors.push('El stock debe ser un entero mayor o igual a 0');
  if (!partial || category !== undefined) if (!category || !String(category).trim()) errors.push('La categoría es obligatoria');
  return errors;
}

router.get('/', (req, res) => {
  const { q, category, minPrice, maxPrice, sort } = req.query;

  // BUG-003: con BUGS=on la búsqueda se arma concatenando SQL y falla con ñ, tildes o comillas.
  if (BUGS && q && /[^\x00-\x7F]|'/.test(String(q))) {
    return res.status(500).json({ error: 'Error interno del servidor (SQLITE_ERROR: unrecognized token)' });
  }

  let rows = db.prepare('SELECT * FROM products ORDER BY id').all();
  if (q) {
    const needle = normalize(q);
    rows = rows.filter((p) => normalize(`${p.name} ${p.description}`).includes(needle));
  }
  if (category) rows = rows.filter((p) => p.category === category);
  if (minPrice !== undefined && minPrice !== '') rows = rows.filter((p) => p.price >= Number(minPrice));
  if (maxPrice !== undefined && maxPrice !== '') rows = rows.filter((p) => p.price <= Number(maxPrice));
  if (sort === 'precio-asc') rows.sort((a, b) => a.price - b.price);
  else if (sort === 'precio-desc') rows.sort((a, b) => b.price - a.price);
  else if (sort === 'nombre') rows.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  res.json(rows);
});

router.get('/categories', (_req, res) => {
  res.json(db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map((r) => r.category));
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(product);
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('. ') });
  const { name, description = '', price, category, stock, emoji = '📦' } = req.body;
  const info = db
    .prepare('INSERT INTO products (name, description, price, category, stock, emoji) VALUES (?, ?, ?, ?, ?, ?)')
    .run(String(name).trim(), description, price, String(category).trim(), stock, emoji);
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Producto no encontrado' });
  const errors = validateProduct(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors.join('. ') });
  const next = { ...current, ...req.body, id: current.id };
  db.prepare(
    'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, emoji = ? WHERE id = ?',
  ).run(next.name, next.description, next.price, next.category, next.stock, next.emoji, current.id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(current.id));
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Producto no encontrado' });
  res.status(204).end();
});

module.exports = router;
