const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { ROOT, DB_FILE } = require('./config');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

function resetDatabase() {
  const schema = fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(ROOT, 'db', 'seed.sql'), 'utf8');
  db.exec(schema);
  db.exec(seed);
}

const hashPassword = (password) =>
  crypto.createHash('sha256').update(`tiendaqa:${password}`).digest('hex');

// Si la BD está vacía (primera ejecución) se inicializa con schema + seed.
const hasSchema = db.prepare("SELECT name FROM sqlite_master WHERE name = 'users'").get();
if (!hasSchema) resetDatabase();

module.exports = { db, resetDatabase, hashPassword };
