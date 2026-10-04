import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { analizarAccesibilidad } from '../support/a11y';
import { sembrarSesion } from '../support/sesion';
import type { Sesion, Usuario } from '../support/tipos';

test(
  'CP-A11Y-001 Accesibilidad WCAG 2.1 A/AA de las 5 pantallas principales (axe-core) [detecta BUG-004]',
  {
    tag: ['@a11y', '@regression'],
    annotation: meta({
      epica: 'Accesibilidad',
      feature: 'WCAG 2.1 (axe-core)',
      req: 'RNF-05',
      severidad: 'critical',
      defecto: 'BUG-004',
    }),
  },
  async (
    { page, loginPage, catalogPage, cartPage, checkoutPage, adminPage, carritoListo, adminApi },
    testInfo,
  ) => {
    test.setTimeout(120_000);
    const violaciones: string[] = [];
    const auditar = async (nombre: string): Promise<void> => {
      violaciones.push(...(await analizarAccesibilidad(page, testInfo, nombre)));
    };

    await test.step('1. Login y catálogo (visitante)', async () => {
      await loginPage.abrir();
      await expect(loginPage.titulo).toBeVisible();
      await auditar('login');
      await catalogPage.abrir();
      await expect(catalogPage.tarjetas.first()).toBeVisible();
      await auditar('catalogo');
    });

    await test.step('2. Carrito y checkout (cliente con un producto)', async () => {
      await sembrarSesion(page, { token: carritoListo.cliente.token, user: carritoListo.cliente.user });
      await cartPage.abrir();
      await page.reload();
      await expect(cartPage.filas).toHaveCount(1);
      await auditar('carrito');
      await checkoutPage.abrir();
      await page.reload();
      await expect(checkoutPage.titulo).toBeVisible();
      await auditar('checkout');
    });

    await test.step('3. Panel de administración (administrador)', async () => {
      // Se parte de una pantalla neutra: con otra sesión, el checkout vacío redirige al carrito y compite con #/admin.
      await catalogPage.abrir();
      const usuario = (await (await adminApi.yo()).json()) as Usuario;
      await sembrarSesion(page, { token: adminApi.token ?? '', user: usuario } satisfies Sesion);
      await adminPage.abrir();
      await page.reload();
      await expect(adminPage.titulo).toBeVisible();
      await auditar('admin');
    });

    expect(violaciones, 'Violaciones de accesibilidad (WCAG 2.1 A/AA)').toEqual([]);
  },
);
