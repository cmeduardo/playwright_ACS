/**
 * Abre en el Trace Viewer la traza de un caso fallido de la última ejecución con defectos
 * (npm run traza). Por defecto CP-DEF-001 en Chromium; se puede indicar otro caso y navegador:
 *   npm run traza -- CP-DEF-003 firefox
 */
const { spawnSync } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');

const raiz = path.resolve(__dirname, '..');
const [caso = 'CP-DEF-001', navegador = 'chromium'] = process.argv.slice(2);
let evidencia;
try {
  const db = new Database(path.join(raiz, 'reports', 'bitacora.db'), { readonly: true, fileMustExist: true });
  evidencia = db
    .prepare("SELECT evidencia FROM test_logs WHERE id_caso = ? AND navegador = ? AND estado = 'Fallido' ORDER BY inicio DESC LIMIT 1")
    .get(caso, navegador)?.evidencia;
  db.close();
} catch (e) {
  console.error(`No hay bitácora (${e.message}). Ejecuta primero: npm run test:bugs`);
  process.exit(1);
}
const traza = (evidencia ?? '').split(';').find((e) => e.endsWith('trace.zip'));
if (!traza) {
  console.error(`No hay una traza de fallo para ${caso} en ${navegador}. Ejecuta primero: npm run test:bugs`);
  process.exit(1);
}
console.log(`Abriendo ${traza}`);
process.exit(spawnSync('npx', ['playwright', 'show-trace', traza], { cwd: raiz, stdio: 'inherit', shell: true }).status ?? 0);
