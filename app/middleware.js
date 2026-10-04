const { db } = require('./db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token de autenticación requerido' });
  const user = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.active FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token);
  if (!user || !user.active) return res.status(401).json({ error: 'Token inválido o expirado' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol administrador' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
