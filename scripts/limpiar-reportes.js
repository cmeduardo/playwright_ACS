// Borra bitácora, informes, defectos y resultados previos para comenzar desde cero.
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
for (const carpeta of ['reports', 'allure-results', 'allure-report', 'playwright-report', 'test-results']) {
  fs.rmSync(path.join(raiz, carpeta), { recursive: true, force: true });
}
console.log('✔ Reportes, bitácora y resultados anteriores eliminados.');
