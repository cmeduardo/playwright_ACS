const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  ROOT,
  PORT: Number(process.env.PORT || 3100),
  DB_FILE: process.env.DB_FILE || path.join(ROOT, 'db', 'tienda.db'),
  // BUGS=on (por defecto) activa los defectos intencionales; BUGS=off los corrige.
  BUGS: (process.env.BUGS || 'on').toLowerCase() !== 'off',
};
