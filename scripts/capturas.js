/**
 * Genera capturas de la aplicación y del dashboard para el README.
 *   node scripts/capturas.js   ->  docs/img/*.png
 * Levanta una copia temporal de TiendaQA (BUGS=off, BD temporal, puerto 3199).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('@playwright/test');

const raiz = path.resolve(__dirname, '..');
const PUERTO = 3199;
const base = `http://localhost:${PUERTO}`;
const salidas = [path.join(raiz, 'docs', 'img')];
salidas.forEach((d) => fs.mkdirSync(d, { recursive: true }));

async function esperarApp() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      /* aún no responde */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('La aplicación temporal no inició');
}

async function api(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return res.json();
}

(async () => {
  const bd = path.join(os.tmpdir(), `tiendaqa-capturas-${Date.now()}.db`);
  const servidor = spawn(process.execPath, ['app/server.js'], {
    cwd: raiz,
    env: { ...process.env, PORT: String(PUERTO), BUGS: 'off', DB_FILE: bd },
    stdio: 'ignore',
  });
  const navegador = await chromium.launch();
  try {
    await esperarApp();
    const guardar = async (pagina, nombre, completa = true) => {
      for (const d of salidas) await pagina.screenshot({ path: path.join(d, nombre), fullPage: completa });
      console.log(`  ✔ ${nombre}`);
    };
    const sesion = async (correo, clave) => api('/api/auth/login', { metodo: 'POST', cuerpo: { email: correo, password: clave } });
    const nueva = async (ctx, s) =>
      ctx.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }, s);

    // Catálogo (visitante)
    let ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 }, locale: 'es-GT' });
    let pag = await ctx.newPage();
    await pag.goto(`${base}/#/catalogo`);
    await pag.getByTestId('product-card').first().waitFor();
    await guardar(pag, 'app-catalogo.png');
    await ctx.close();

    // Carrito con cupón (cliente)
    const ana = await sesion('ana@tiendaqa.com', 'Cliente123!');
    await api('/api/cart/items', { metodo: 'POST', token: ana.token, cuerpo: { productId: 4, quantity: 2 } });
    await api('/api/cart/items', { metodo: 'POST', token: ana.token, cuerpo: { productId: 3, quantity: 1 } });
    await api('/api/cart/coupon', { metodo: 'POST', token: ana.token, cuerpo: { code: 'BIENVENIDO10' } });
    ctx = await navegador.newContext({ viewport: { width: 1280, height: 760 }, locale: 'es-GT' });
    await nueva(ctx, ana);
    pag = await ctx.newPage();
    await pag.goto(`${base}/#/carrito`);
    await pag.getByTestId('cart-row').first().waitFor();
    await guardar(pag, 'app-carrito.png');
    await pag.goto(`${base}/#/checkout`);
    await pag.getByRole('button', { name: 'Pagar ahora' }).waitFor();
    await guardar(pag, 'app-checkout.png');
    await ctx.close();

    // Panel admin
    const admin = await sesion('admin@tiendaqa.com', 'Admin123!');
    ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-GT' });
    await nueva(ctx, admin);
    pag = await ctx.newPage();
    await pag.goto(`${base}/#/admin`);
    await pag.getByTestId('admin-row').first().waitFor();
    await guardar(pag, 'app-admin.png');
    await ctx.close();

    // Dashboard (si existe)
    const dashboard = path.join(raiz, 'reports', 'dashboard', 'index.html');
    if (fs.existsSync(dashboard)) {
      ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
      pag = await ctx.newPage();
      await pag.goto('file://' + dashboard);
      await pag.locator('canvas').first().waitFor();
      await pag.waitForFunction(() => document.querySelectorAll('canvas').length >= 6);
      await pag.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 600))));
      await guardar(pag, 'dashboard.png');
      await ctx.close();
    }
  } finally {
    await navegador.close();
    servidor.kill();
    for (const sufijo of ['', '-wal', '-shm']) fs.rmSync(bd + sufijo, { force: true });
  }
})().catch((e) => {
  console.error('Error al generar capturas:', e.message);
  process.exit(1);
});
