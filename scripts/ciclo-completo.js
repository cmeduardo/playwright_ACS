/**
 * Ciclo completo del proceso de pruebas (npm run ciclo:completo):
 *   1. Limpia reportes y reinicia la BD
 *   2. Ejecuta la suite con BUGS=on  -> fallos esperados, genera DEF-XXX
 *   3. Ejecuta la suite con BUGS=off -> regresión en verde, cierra los DEF-XXX
 *   4. Genera informe, dashboard comparativo y reporte Allure, y abre los reportes
 * Opciones:  --no-abrir (o NO_ABRIR=1)  no abre los reportes
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const raiz = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const abrir = !args.includes('--no-abrir') && !process.env.NO_ABRIR;
const ciclo = path.join(raiz, 'reports', 'ciclo');

const titulo = (t) => console.log(`\n\x1b[1m\x1b[36m━━━ ${t} ━━━\x1b[0m`);
function ejecutar(comando, env = {}) {
  console.log(`\x1b[2m$ ${comando}\x1b[0m`);
  return spawnSync(comando, { cwd: raiz, stdio: 'inherit', shell: true, env: { ...process.env, ...env } }).status ?? 1;
}
const copiar = (de, a) => fs.cpSync(path.join(raiz, de), path.join(raiz, a), { recursive: true, force: true });

titulo('1/6 Preparación: limpiar reportes y reiniciar la base de datos');
ejecutar('node scripts/limpiar-reportes.js');
ejecutar('node scripts/db-reset.js');

titulo('2/6 Ejecución con defectos (BUGS=on): se esperan fallos');
const codigoOn = ejecutar('npx playwright test', { BUGS: 'on' });
fs.mkdirSync(ciclo, { recursive: true });
copiar('playwright-report', 'reports/ciclo/playwright-report-bugs');
ejecutar('npx allure generate allure-results -o reports/ciclo/allure-report-bugs');

titulo('3/6 Defectos generados');
const defectos = path.join(raiz, 'reports', 'defectos');
for (const f of fs.existsSync(defectos) ? fs.readdirSync(defectos).sort() : []) {
  const t = fs.readFileSync(path.join(defectos, f), 'utf8');
  const estado = /\| Estado \| \*\*(.+?)\*\* \|/.exec(t)?.[1];
  console.log(`  ${f.replace('.md', '')}  [${estado}]  ${/^# (.+)$/m.exec(t)?.[1].replace(/^DEF-\d+ — /, '')}`);
}

titulo('4/6 Ejecución con defectos corregidos (BUGS=off): regresión');
const codigoOff = ejecutar('npx playwright test', { BUGS: 'off' });

titulo('5/6 Reportes: Allure y dashboard');
ejecutar('npx allure generate allure-results -o allure-report');
ejecutar('npx tsx scripts/dashboard.ts');

titulo('6/6 Resumen comparativo (bitácora)');
const db = new Database(path.join(raiz, 'reports', 'bitacora.db'), { readonly: true });
const ejecuciones = db.prepare("SELECT id_ejecucion, modo_bugs AS bugs, total, exitosas, fallidas, ROUND(100.0*exitosas/total,1) AS tasa, ROUND(duracion_ms/1000.0,1) AS segundos FROM ejecuciones ORDER BY fecha_inicio").all();
console.table(ejecuciones);
console.table(db.prepare("SELECT 'DEF-' || substr('000' || id_def, -3) AS defecto, clave, severidad, estado, ejecucion_detectado AS detectado, ejecucion_cierre AS cerrado FROM defectos ORDER BY id_def").all());
db.close();

const on = ejecuciones.find((e) => e.bugs === 'on');
const off = ejecuciones.find((e) => e.bugs === 'off');
const correcto = codigoOn !== 0 && on?.fallidas > 0 && codigoOff === 0 && off?.fallidas === 0;
console.log(correcto
  ? `\n\x1b[32m✔ Ciclo correcto: ${on.fallidas} fallos con BUGS=on → 0 fallos con BUGS=off.\x1b[0m`
  : '\n\x1b[31m✘ Resultado inesperado: con BUGS=on debían fallar pruebas y con BUGS=off todas debían pasar.\x1b[0m');

if (abrir) {
  titulo('Abriendo reportes (se detienen con: npm run reportes:detener)');
  ejecutar('node scripts/reportes-abrir.js');
} else {
  console.log('\nReportes: npm run reportes:abrir   (dashboard + Playwright + Allure)');
}
process.exit(correcto ? 0 : 1);
