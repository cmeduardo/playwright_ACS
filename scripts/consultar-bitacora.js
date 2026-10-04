// Ejecuta una consulta SQL (solo lectura) sobre reports/bitacora.db y la muestra como tabla.
//   npm run bitacora -- "SELECT id_ejecucion, modo_bugs, total, fallidas FROM ejecuciones"
const path = require('path');
const Database = require('better-sqlite3');

const sql = process.argv.slice(2).join(' ').trim();
if (!sql) {
  console.log('Uso: npm run bitacora -- "SELECT ... FROM test_logs"\nTablas: ejecuciones, test_logs, defectos');
  process.exit(1);
}
const archivo = path.resolve(__dirname, '..', 'reports', 'bitacora.db');
try {
  const db = new Database(archivo, { readonly: true, fileMustExist: true });
  console.table(db.prepare(sql).all());
} catch (e) {
  console.error(`No se pudo consultar la bitácora (${archivo}): ${e.message}`);
  process.exit(1);
}
