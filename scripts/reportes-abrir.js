/**
 * Abre los reportes de la última ejecución (npm run reportes:abrir):
 *   - Dashboard (archivo local) · Reporte HTML de Playwright (puerto 9323) · Allure (puerto 4545)
 * Los servidores quedan en segundo plano; se detienen con npm run reportes:detener.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const estado = path.join(raiz, 'reports', 'ciclo', 'servidores.json');
const windows = process.platform === 'win32';

function abrirNavegador(destino) {
  const [cmd, args] = windows
    ? ['cmd', ['/c', 'start', '""', destino]]
    : process.platform === 'darwin' ? ['open', [destino]] : ['xdg-open', [destino]];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
  } catch {
    /* sin navegador disponible */
  }
}

function servir(nombre, comando, url) {
  const hijo = spawn(comando, { cwd: raiz, shell: true, detached: true, stdio: 'ignore' });
  hijo.unref();
  console.log(`  ${nombre}: ${url}`);
  return hijo.pid;
}

fs.mkdirSync(path.dirname(estado), { recursive: true });
const dashboard = path.join(raiz, 'reports', 'dashboard', 'index.html');
const pids = [];
console.log(`  Dashboard: file://${dashboard}`);
abrirNavegador(dashboard);
if (fs.existsSync(path.join(raiz, 'playwright-report'))) {
  pids.push(servir('Reporte Playwright', 'npx playwright show-report playwright-report --port 9323', 'http://localhost:9323'));
}
if (fs.existsSync(path.join(raiz, 'allure-report'))) {
  pids.push(servir('Reporte Allure', 'npx allure open allure-report --port 4545', 'http://localhost:4545'));
}
console.log('  Informe y defectos (Markdown): reports/informe-ejecucion.md · reports/defectos/');
fs.writeFileSync(estado, JSON.stringify({ pids, windows }));
