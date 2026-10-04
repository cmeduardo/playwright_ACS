const crypto = require('crypto');
const express = require('express');
const { db, hashPassword } = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!user || user.password_hash !== hashPassword(String(password))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  if (!user.active) return res.status(403).json({ error: 'Usuario bloqueado. Contacta al administrador' });
  res.json({ token: createSession(user.id), user: publicUser(user) });
});

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !EMAIL_RE.test(String(email || '')) || String(password || '').length < 8) {
    return res.status(400).json({ error: 'Datos inválidos (nombre, correo válido y contraseña de 8+ caracteres)' });
  }
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'El correo ya está registrado' });
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, String(email).toLowerCase(), hashPassword(String(password)));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: createSession(user.id), user: publicUser(user) });
});

router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

module.exports = router;
