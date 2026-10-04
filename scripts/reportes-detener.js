// Detiene los servidores de reportes que dejó npm run reportes:abrir.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const estado = path.resolve(__dirname, '..', 'reports', 'ciclo', 'servidores.json');
if (!fs.existsSync(estado)) {
  console.log('No hay servidores de reportes registrados.');
  process.exit(0);
}
const { pids } = JSON.parse(fs.readFileSync(estado, 'utf8'));
for (const pid of pids) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F']);
    else process.kill(-pid, 'SIGTERM'); // grupo de procesos (se lanzó con detached)
    console.log(`Detenido el proceso ${pid}`);
  } catch {
    console.log(`El proceso ${pid} ya no estaba activo`);
  }
}
fs.rmSync(estado, { force: true });
