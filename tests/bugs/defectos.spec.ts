import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { productoPorNombre } from '../support/productos';
import type { ApiClient } from '../support/api-client';
import type { Carrito } from '../support/tipos';

/**
 * Casos que DETECTAN los defectos intencionales de TiendaQA.
 *   BUGS=on  -> FALLAN (el defecto existe).   BUGS=off -> PASAN (corregido: prueba de regresión).
 * Usan aserciones "soft": el caso recorre todos sus pasos y reporta TODAS las diferencias juntas.
 * (BUG-005, visual, se detecta en tests/visual/visual.spec.ts: CP-VIS-001.)
 */
const RAPIDO = { timeout: 2500 };

async function vaciar(api: ApiClient): Promise<void> {
  const carrito = (await (await api.carrito()).json()) as Carrito;
  for (const item of carrito.items) await api.quitarDelCarrito(item.productId);
  await api.quitarCupon();
}

test(
  'CP-DEF-001 Cupones porcentuales: el descuento es exacto en cualquier monto, incluido el umbral de Q500 [detecta BUG-001]',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Defectos',
      feature: 'Cupones',
      req: 'RF-06',
      severidad: 'critical',
      defecto: 'BUG-001',
    }),
  },
  async ({ paginaCliente: page, clienteApi, cartPage }) => {
    test.setTimeout(90_000);

    await test.step('1. Interfaz: 2 × Audífonos (Q760) con BIENVENIDO10 deben descontar Q76 (10 %)', async () => {
      const audifonos = await productoPorNombre(clienteApi, 'Audífonos Bluetooth');
      await clienteApi.agregarAlCarrito(audifonos.id, 2);
      await page.goto('/#/carrito');
      await cartPage.aplicarCupon('BIENVENIDO10');
      await expect(cartPage.alerta('Cupón aplicado correctamente')).toBeVisible();
      await expect
        .soft(cartPage.descuento, 'descuento de BIENVENIDO10 sobre Q760')
        .toHaveText('-Q76.00', RAPIDO);
      await expect.soft(cartPage.total, 'total con descuento').toHaveText('Q684.00', RAPIDO);
    });

    await test.step('2. API, justo bajo el umbral: Q475 con BIENVENIDO10 descuenta Q47.50', async () => {
      await vaciar(clienteApi);
      await clienteApi.agregarAlCarrito((await productoPorNombre(clienteApi, 'Teclado Mecánico')).id, 1);
      await clienteApi.agregarAlCarrito(
        (await productoPorNombre(clienteApi, 'Cuaderno Universitario')).id,
        1,
      );
      const cupon = (await (await clienteApi.aplicarCupon('BIENVENIDO10')).json()) as Carrito;
      expect.soft(cupon.discount, 'descuento sobre Q475').toBe(47.5);
    });

    await test.step('3. API, en el umbral: Q500 con BIENVENIDO10 debe descontar Q50', async () => {
      await clienteApi.agregarAlCarrito(
        (await productoPorNombre(clienteApi, 'Cuaderno Universitario')).id,
        1,
      );
      const cupon = (await (await clienteApi.aplicarCupon('BIENVENIDO10')).json()) as Carrito;
      expect.soft(cupon.subtotal).toBe(500);
      expect.soft(cupon.discount, 'descuento sobre Q500').toBe(50);
    });

    await test.step('4. API: el Monitor (Q1,500) con VERANO20 debe descontar Q300 y totalizar Q1,200', async () => {
      await vaciar(clienteApi);
      await clienteApi.agregarAlCarrito((await productoPorNombre(clienteApi, 'Monitor 24 pulgadas')).id, 1);
      const cupon = (await (await clienteApi.aplicarCupon('VERANO20')).json()) as Carrito;
      expect.soft(cupon.discount, 'descuento de VERANO20 sobre Q1500').toBe(300);
      expect.soft(cupon.total, 'total').toBe(1200);
    });
  },
);

test(
  'CP-DEF-002 Cantidades inválidas: negativas, cero y mayores a 99 deben rechazarse [detecta BUG-002]',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Defectos',
      feature: 'Carrito',
      req: 'RF-05',
      severidad: 'critical',
      defecto: 'BUG-002',
    }),
  },
  async ({ paginaCliente: page, clienteApi, cartPage }) => {
    test.setTimeout(90_000);
    const cuaderno = await productoPorNombre(clienteApi, 'Cuaderno Universitario');
    await clienteApi.agregarAlCarrito(cuaderno.id, 1);
    await page.goto('/#/carrito');

    await test.step('1. Interfaz: la cantidad -3 se rechaza con un mensaje y el total sigue en Q25', async () => {
      await cartPage.cambiarCantidad('Cuaderno Universitario', -3);
      await expect.soft(cartPage.total, 'total tras escribir -3').toHaveText('Q25.00', RAPIDO);
      await expect.soft(cartPage.alerta('La cantidad debe ser un entero entre 1 y 99')).toBeVisible(RAPIDO);
    });

    await test.step('2. Interfaz: la cantidad 0 también se rechaza', async () => {
      await cartPage.cambiarCantidad('Cuaderno Universitario', 0);
      await expect.soft(cartPage.total, 'total tras escribir 0').toHaveText('Q25.00', RAPIDO);
    });

    await test.step('3. API: -5, 0 y 100 responden 400 y el carrito queda vacío', async () => {
      await vaciar(clienteApi);
      expect.soft((await clienteApi.agregarAlCarrito(cuaderno.id, -5)).status(), 'cantidad -5').toBe(400);
      expect.soft((await clienteApi.agregarAlCarrito(cuaderno.id, 0)).status(), 'cantidad 0').toBe(400);
      expect.soft((await clienteApi.agregarAlCarrito(cuaderno.id, 100)).status(), 'cantidad 100').toBe(400);
      const carrito = (await (await clienteApi.carrito()).json()) as Carrito;
      expect.soft(carrito.items, 'carrito tras las cantidades inválidas').toHaveLength(0);
    });
  },
);

test(
  'CP-DEF-003 Búsqueda con caracteres especiales (tilde, ñ y comilla simple) no produce error [detecta BUG-003]',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Defectos',
      feature: 'Búsqueda',
      req: 'RF-03',
      severidad: 'critical',
      defecto: 'BUG-003',
    }),
  },
  async ({ api, catalogPage }) => {
    test.setTimeout(90_000);
    const busquedas: [string, string][] = [
      ['café', 'Café de Antigua 500g'],
      ['Ñandú', 'Mochila Ñandú'],
      ["D'Lujo", "Pantalón D'Lujo"],
    ];
    await catalogPage.abrir();

    for (const [termino, producto] of busquedas) {
      await test.step(`Interfaz: buscar «${termino}» muestra «${producto}»`, async () => {
        await catalogPage.buscador.fill('');
        await catalogPage.buscar(termino);
        await expect.soft(catalogPage.errorCatalogo, `error al buscar «${termino}»`).toBeHidden(RAPIDO);
        await expect.soft(catalogPage.tarjeta(producto)).toBeVisible(RAPIDO);
      });
    }

    await test.step('API: las mismas búsquedas responden 200', async () => {
      for (const q of ['café', 'Ñandú', "D'Lujo", 'tecnología']) {
        expect.soft((await api.productos({ q })).status(), `GET /api/products?q=${q}`).toBe(200);
      }
    });
  },
);

test(
  'CP-DEF-004 Todos los campos del checkout tienen una etiqueta accesible [detecta BUG-004]',
  {
    tag: ['@a11y', '@regression'],
    annotation: meta({
      epica: 'Defectos',
      feature: 'Accesibilidad del checkout',
      req: 'RNF-05',
      severidad: 'normal',
      defecto: 'BUG-004',
    }),
  },
  async ({ page, carritoUI, checkoutPage }) => {
    expect(carritoUI.carrito.items).toHaveLength(1);
    await checkoutPage.abrir();
    await expect(checkoutPage.titulo).toBeVisible();

    const etiquetas = [
      'Nombre completo',
      'Correo electrónico',
      'Dirección de entrega',
      'Teléfono (8 dígitos)',
      'Número de tarjeta',
      'Vencimiento (MM/AA)',
      'CVV',
    ];
    for (const etiqueta of etiquetas) {
      await test.step(`El campo «${etiqueta}» se encuentra por su etiqueta accesible`, async () => {
        await expect.soft(page.getByLabel(etiqueta), `campo con etiqueta «${etiqueta}»`).toBeVisible(RAPIDO);
      });
    }
  },
);
