import { test as base, expect, type Page } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiClient } from '../support/api-client';
import { USUARIOS } from '../support/env';
import { productoPorNombre } from '../support/productos';
import type { Carrito, DatosEnvio, DatosPago, Producto, Sesion } from '../support/tipos';
import { AdminPage } from '../pages/AdminPage';
import { CartPage } from '../pages/CartPage';
import { CatalogPage } from '../pages/CatalogPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { LoginPage } from '../pages/LoginPage';

export interface ClienteNuevo extends Sesion {
  email: string;
  password: string;
}

export const ENVIO_VALIDO: DatosEnvio = {
  nombre: 'Ana Morales',
  email: 'ana@correo.com',
  direccion: '5a avenida 10-20 zona 1, Guatemala',
  telefono: '55512345',
};
export const PAGO_VALIDO: DatosPago = { tarjeta: '4111111111111111', vencimiento: '12/35', cvv: '123' };

interface Fixtures {
  /** Cliente cliente-API autenticado (token propio) o sin token. */
  api: ApiClient;
  /** Usuario cliente recién registrado: cada test tiene su propio carrito y pedidos (aislamiento). */
  clienteNuevo: ClienteNuevo;
  /** Cliente de API autenticado como el cliente nuevo. */
  clienteApi: ApiClient;
  /** Cliente de API autenticado como administrador. */
  adminApi: ApiClient;
  /** `page` con la sesión del cliente nuevo ya iniciada (localStorage sembrado). */
  paginaCliente: Page;
  /** Cliente nuevo con un producto ya agregado al carrito (por API). */
  carritoListo: { cliente: ClienteNuevo; api: ApiClient; producto: Producto; carrito: Carrito };
  /** Igual que `carritoListo` pero con la página ya autenticada como ese cliente (para pruebas de UI). */
  carritoUI: { cliente: ClienteNuevo; api: ApiClient; producto: Producto; carrito: Carrito };
  loginPage: LoginPage;
  catalogPage: CatalogPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  adminPage: AdminPage;
  /** Fixture automática: publica la trazabilidad (annotations) como etiquetas de Allure. */
  trazabilidad: void;
}

export const test = base.extend<Fixtures>({
  trazabilidad: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, testInfo) => {
      const nota = (tipo: string): string | undefined =>
        testInfo.annotations.find((a) => a.type === tipo)?.description;
      const epica = nota('epica');
      const feature = nota('feature');
      const severidad = nota('severidad');
      const req = nota('requerimiento');
      const defecto = nota('defecto');
      if (epica) await allure.epic(epica);
      if (feature) await allure.feature(feature);
      if (severidad) await allure.severity(severidad);
      if (req) await allure.label('requerimiento', req);
      if (defecto) await allure.label('defecto', defecto);
      await use();
    },
    { auto: true },
  ],

  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  clienteNuevo: async ({ api }, use, testInfo) => {
    const email = `qa.${testInfo.workerIndex}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@tiendaqa.test`;
    const password = 'Prueba123!';
    const res = await api.registrar('Cliente QA', email, password);
    expect(res.status(), 'registro de cliente de prueba').toBe(201);
    const sesion = (await res.json()) as Sesion;
    await use({ ...sesion, email, password });
  },

  clienteApi: async ({ api, clienteNuevo }, use) => {
    await use(api.conToken(clienteNuevo.token));
  },

  adminApi: async ({ api }, use) => {
    const res = await api.login(USUARIOS.admin.email, USUARIOS.admin.password);
    expect(res.ok(), 'login de administrador por API').toBe(true);
    const { token } = (await res.json()) as Sesion;
    await use(api.conToken(token));
  },

  paginaCliente: async ({ page, clienteNuevo }, use) => {
    await page.addInitScript(
      ({ token, user }) => {
        // Se siembra solo una vez por pestaña: así un logout no se deshace al recargar.
        if (sessionStorage.getItem('__sembrado')) return;
        sessionStorage.setItem('__sembrado', '1');
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { token: clienteNuevo.token, user: clienteNuevo.user },
    );
    await use(page);
  },

  carritoListo: async ({ clienteNuevo, clienteApi }, use) => {
    const producto = await productoPorNombre(clienteApi, 'Cuaderno Universitario');
    const res = await clienteApi.agregarAlCarrito(producto.id, 2);
    expect(res.status()).toBe(201);
    await use({ cliente: clienteNuevo, api: clienteApi, producto, carrito: (await res.json()) as Carrito });
  },

  carritoUI: async ({ paginaCliente: _pagina, carritoListo }, use) => {
    await use(carritoListo);
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  catalogPage: async ({ page }, use) => use(new CatalogPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  adminPage: async ({ page }, use) => use(new AdminPage(page)),
});

export { expect };
