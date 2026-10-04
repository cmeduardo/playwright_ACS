import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { ESQUEMA_CARRITO, validarEsquema } from '../support/esquemas';
import type { Carrito } from '../support/tipos';

test(
  'CP-API-004 Carrito y cupones por API: totales, stock, autenticación y reglas de cada cupón',
  {
    tag: ['@api', '@regression'],
    annotation: meta({
      epica: 'API',
      feature: 'Carrito y cupones',
      req: 'RF-05, RF-06, RNF-03',
      severidad: 'critical',
    }),
  },
  async ({ api, clienteApi }) => {
    await test.step('El carrito exige autenticación', async () => {
      expect((await api.carrito()).status()).toBe(401);
      expect((await api.agregarAlCarrito(1)).status()).toBe(401);
    });

    await test.step('Un cliente nuevo tiene el carrito vacío con el esquema correcto', async () => {
      const res = await clienteApi.carrito();
      expect(res.status()).toBe(200);
      const carrito = (await res.json()) as Carrito;
      validarEsquema(carrito, ESQUEMA_CARRITO, 'carrito');
      expect(carrito).toMatchObject({ items: [], subtotal: 0, discount: 0, total: 0 });
    });

    await test.step('Agregar, acumular, cambiar cantidad y quitar recalcula los totales', async () => {
      const agregar = await clienteApi.agregarAlCarrito(3, 2); // Mouse Q120
      expect(agregar.status()).toBe(201);
      expect(((await agregar.json()) as Carrito).subtotal).toBe(240);
      const sumar = await clienteApi.agregarAlCarrito(3, 1);
      expect(((await sumar.json()) as Carrito).items[0]?.quantity).toBe(3);
      const cambiar = await clienteApi.cambiarCantidad(3, 5);
      expect(((await cambiar.json()) as Carrito).total).toBe(600);
      const quitar = await clienteApi.quitarDelCarrito(3);
      expect(((await quitar.json()) as Carrito).items).toHaveLength(0);
    });

    await test.step('Producto inexistente 404 y stock insuficiente 409', async () => {
      expect((await clienteApi.agregarAlCarrito(999999, 1)).status()).toBe(404);
      expect((await clienteApi.agregarAlCarrito(10, 41)).status()).toBe(409); // Monitor: stock 40
    });

    await test.step('Cupones: mínimo del fijo, inexistente, expirado y porcentual en compra pequeña', async () => {
      await clienteApi.agregarAlCarrito(3, 1); // Q120
      expect((await clienteApi.aplicarCupon('FIJO50')).status()).toBe(400); // mínimo Q200
      expect((await clienteApi.aplicarCupon('NOEXISTE')).status()).toBe(404);
      expect((await clienteApi.aplicarCupon('EXPIRADO5')).status()).toBe(404);
      const ok = await clienteApi.aplicarCupon('bienvenido10'); // no distingue mayúsculas
      expect(ok.status()).toBe(200);
      expect(await ok.json()).toMatchObject({
        coupon: 'BIENVENIDO10',
        subtotal: 120,
        discount: 12,
        total: 108,
      });
    });
  },
);
