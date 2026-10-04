// Reinicia la base de datos con db/schema.sql + db/seed.sql  (npm run db:reset)
const fs = require('fs');
const { DB_FILE } = require('../app/config');

for (const suffix of ['', '-wal', '-shm']) {
  try {
    fs.rmSync(DB_FILE + suffix);
  } catch {
    /* no existía */
  }
}
const { db, resetDatabase } = require('../app/db');
resetDatabase();
const { n } = db.prepare('SELECT COUNT(*) AS n FROM products').get();
console.log(`✔ Base de datos reiniciada (${DB_FILE}) con ${n} productos.`);
