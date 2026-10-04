import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { leerJson } from '../support/datos';
import { sembrarSesion } from '../support/sesion';
import type { Producto } from '../support/tipos';

test(
  'CP-VIS-001 Regresión visual: login, catálogo, formulario de checkout y botón de pago [detecta BUG-005]',
  {
    tag: ['@visual', '@regression'],
    annotation: meta({
      epica: 'Calidad visual',
      feature: 'Regresión visual',
      req: 'RNF-04',
      severidad: 'normal',
      defecto: 'BUG-005',
    }),
  },
  async ({ page, loginPage, catalogPage, checkoutPage, carritoListo }) => {
    test.setTimeout(90_000);

    await test.step('1. Pantalla de login (visitante)', async () => {
      await loginPage.abrir();
      await expect(loginPage.titulo).toBeVisible();
      await expect.soft(page).toHaveScreenshot('login.png');
    });

    await test.step('2. Catálogo con datos congelados (mock) para que la imagen sea determinista', async () => {
      await page.route(/\/api\/products(\?.*)?$/, (route) =>
        route.fulfill({ json: leerJson<Producto[]>('productos-visual.json') }),
      );
      await page.route('**/api/products/categories', (route) =>
        route.fulfill({ json: ['Accesorios', 'Alimentos', 'Papelería', 'Tecnología'] }),
      );
      await catalogPage.abrir();
      await page.reload();
      await expect(catalogPage.tarjetas).toHaveCount(4);
      await expect.soft(page).toHaveScreenshot('catalogo.png', { fullPage: true });
    });

    await test.step('3. Checkout: formulario completo y botón de pago (cliente con carrito)', async () => {
      await sembrarSesion(page, { token: carritoListo.cliente.token, user: carritoListo.cliente.user });
      await checkoutPage.abrir();
      await page.reload();
      await expect(checkoutPage.botonPagar).toBeVisible();
      // Primero la región completa (con la página arriba) y después el botón, que desplaza la página al capturarse.
      await expect
        .soft(page.getByRole('main'))
        .toHaveScreenshot('checkout.png', { maxDiffPixelRatio: 0.0005 });
      await expect.soft(checkoutPage.botonPagar).toHaveScreenshot('boton-pagar.png');
    });
  },
);
