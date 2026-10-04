import { test, expect, ENVIO_VALIDO, PAGO_VALIDO } from '../fixtures';
import { meta } from '../support/meta';

const sinDesborde = async (page: import('@playwright/test').Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test(
  'CP-MOV-001 Navegación móvil: menú hamburguesa y diseño sin desbordamiento',
  {
    tag: ['@mobile', '@regression'],
    annotation: meta({ epica: 'Móvil', feature: 'Diseño responsive', req: 'RNF-04', severidad: 'critical' }),
  },
  async ({ page, catalogPage, loginPage }) => {
    await catalogPage.abrir();
    const enlace = page.getByRole('link', { name: 'Iniciar sesión' });

    await test.step('1. El menú inicia colapsado y se abre con el botón hamburguesa', async () => {
      await expect(catalogPage.menuToggle).toBeVisible();
      await expect(catalogPage.menuToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(enlace).toBeHidden();
      await catalogPage.menuToggle.click();
      await expect(catalogPage.menuToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(enlace).toBeVisible();
    });

    await test.step('2. Se vuelve a cerrar con el mismo botón', async () => {
      await catalogPage.menuToggle.click();
      await expect(enlace).toBeHidden();
    });

    await test.step('3. Se navega desde el menú y este se cierra al cambiar de página', async () => {
      await catalogPage.irA('Iniciar sesión');
      await expect(loginPage.titulo).toBeVisible();
      await expect(enlace).toBeHidden();
    });

    await test.step('4. Catálogo y login no generan desplazamiento horizontal', async () => {
      expect(await sinDesborde(page)).toBe(true);
      await catalogPage.abrir();
      await expect(catalogPage.tarjetas.first()).toBeVisible();
      expect(await sinDesborde(page)).toBe(true);
    });
  },
);

test(
  'CP-MOV-002 Compra completa en un viewport móvil: del carrito al pedido confirmado',
  {
    tag: ['@mobile', '@smoke', '@regression'],
    annotation: meta({
      epica: 'Móvil',
      feature: 'Compra en móvil',
      req: 'RF-07, RNF-04',
      severidad: 'blocker',
    }),
  },
  async ({ page, carritoUI, cartPage, checkoutPage }) => {
    test.setTimeout(90_000);
    expect(carritoUI.carrito.items).toHaveLength(1);

    await test.step('1. Abrir el carrito y proceder al pago', async () => {
      await cartPage.abrir();
      await expect(cartPage.filas).toHaveCount(1);
      await cartPage.botonPagar.click();
      await expect(checkoutPage.titulo).toBeVisible();
      expect(await sinDesborde(page)).toBe(true);
    });

    await test.step('2. Llenar el formulario y pagar', async () => {
      await checkoutPage.completar(ENVIO_VALIDO, PAGO_VALIDO);
      await checkoutPage.botonPagar.scrollIntoViewIfNeeded();
      await checkoutPage.pagar();
      await expect(checkoutPage.confirmacion).toBeVisible();
    });

    await test.step('3. El pedido aparece en «Mis pedidos» (navegando por el menú móvil)', async () => {
      await checkoutPage.irA('Mis pedidos');
      await expect(page.getByTestId('order-row')).toHaveCount(1);
    });
  },
);
