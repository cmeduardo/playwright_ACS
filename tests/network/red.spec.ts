import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import type { Producto } from '../support/tipos';

const URL_PRODUCTOS = /\/api\/products(\?.*)?$/;

test(
  'CP-RED-001 Resiliencia de la interfaz: API caída, lenta, vacía, sin stock y sesión expirada (mocking de red)',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Resiliencia',
      feature: 'Mocking de red',
      req: 'RNF-02, RF-03, RF-05, RNF-03',
      severidad: 'critical',
    }),
  },
  async ({ paginaCliente: page, catalogPage, loginPage }) => {
    test.setTimeout(90_000);

    await test.step('1. API de productos caída (500): error visible y «Reintentar» funciona al recuperarse', async () => {
      let caida = true;
      await page.route(URL_PRODUCTOS, (route) =>
        caida ? route.fulfill({ status: 500, json: { error: 'Servicio no disponible' } }) : route.continue(),
      );
      await catalogPage.abrir();
      await expect(catalogPage.errorCatalogo).toContainText('No pudimos cargar el catálogo');
      await expect(catalogPage.tarjetas).toHaveCount(0);
      caida = false;
      await catalogPage.botonReintentar.click();
      await expect(catalogPage.errorCatalogo).toBeHidden();
      await expect(catalogPage.tarjeta('Teclado Mecánico')).toBeVisible();
      await page.unroute(URL_PRODUCTOS);
    });

    await test.step('2. Respuesta lenta: se muestra «Cargando…» hasta que llega la respuesta', async () => {
      // La respuesta se retiene hasta que el test la libera: sin sleeps ni tiempos fijos.
      let liberar!: () => void;
      const compuerta = new Promise<void>((resolver) => (liberar = resolver));
      await page.route(URL_PRODUCTOS, async (route) => {
        await compuerta;
        await route.continue();
      });
      await page.reload();
      await expect(catalogPage.cargando).toBeVisible();
      await expect(catalogPage.tarjetas).toHaveCount(0);
      liberar();
      await expect(catalogPage.cargando).toBeHidden();
      await expect(catalogPage.tarjeta('Teclado Mecánico')).toBeVisible();
      await page.unroute(URL_PRODUCTOS);
    });

    await test.step('3. Catálogo vacío y respuesta simulada con datos propios', async () => {
      await page.route(URL_PRODUCTOS, (route) => route.fulfill({ json: [] }));
      await page.reload();
      await expect(catalogPage.estadoVacio).toContainText('No se encontraron productos');
      await expect(catalogPage.contadorResultados).toHaveText('0 productos');
      await page.unroute(URL_PRODUCTOS);

      const mock: Producto[] = [
        {
          id: 901,
          name: 'Producto Simulado',
          description: 'Viene del mock',
          price: 1234.5,
          category: 'Mock',
          stock: 0,
          emoji: '',
        },
      ];
      await page.route(URL_PRODUCTOS, (route) => route.fulfill({ json: mock }));
      await page.reload();
      await expect(catalogPage.tarjeta('Producto Simulado')).toContainText('Q1234.50');
      await expect(catalogPage.tarjeta('Producto Simulado')).toContainText('Agotado');
      await expect(page.getByRole('button', { name: 'Agregar Producto Simulado al carrito' })).toBeDisabled();
      await page.unroute(URL_PRODUCTOS);
    });

    await test.step('4. Se verifica la petición que envía la búsqueda', async () => {
      await page.reload();
      const peticion = page.waitForRequest((r) => URL_PRODUCTOS.test(r.url()) && r.url().includes('q=mouse'));
      await catalogPage.buscar('mouse');
      expect(new URL((await peticion).url()).searchParams.get('q')).toBe('mouse');
    });

    await test.step('5. Error 409 al agregar al carrito: la interfaz informa y no cambia el contador', async () => {
      await page.route('**/api/cart/items', (route) =>
        route.fulfill({ status: 409, json: { error: 'Stock insuficiente (disponible: 0)' } }),
      );
      await catalogPage.buscador.fill('');
      await catalogPage.buscar('teclado');
      await catalogPage.agregarAlCarrito('Teclado Mecánico');
      await expect(catalogPage.aviso('Stock insuficiente')).toBeVisible();
      await expect(catalogPage.contadorCarrito).toHaveText('0');
      await page.unroute('**/api/cart/items');
    });

    await test.step('6. Sesión expirada (401) en el carrito: redirige al login con aviso', async () => {
      await page.route('**/api/cart', (route) =>
        route.fulfill({ status: 401, json: { error: 'Token inválido o expirado' } }),
      );
      await page.goto('/#/carrito');
      await expect(loginPage.titulo).toBeVisible();
      await expect(loginPage.aviso('Tu sesión expiró')).toBeVisible();
    });
  },
);
