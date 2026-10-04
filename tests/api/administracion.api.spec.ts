import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { ESQUEMA_PRODUCTO, validarEsquema } from '../support/esquemas';
import type { Producto } from '../support/tipos';

test(
  'CP-API-003 Administración de productos por API: CRUD, permisos y validaciones',
  {
    tag: ['@api', '@regression'],
    annotation: meta({
      epica: 'API',
      feature: 'Administración de productos',
      req: 'RF-08, RNF-03',
      severidad: 'critical',
    }),
  },
  async ({ adminApi, clienteApi, api }, testInfo) => {
    const nombre = `Producto CRUD ${testInfo.workerIndex}-${Date.now().toString(36)}`;
    const datos = { name: nombre, description: 'desc', price: 19.99, category: 'Pruebas QA', stock: 7 };

    await test.step('Ciclo completo como administrador: crear, actualizar, consultar y eliminar', async () => {
      const crear = await adminApi.crearProducto(datos);
      expect(crear.status()).toBe(201);
      const creado = (await crear.json()) as Producto;
      validarEsquema(creado, ESQUEMA_PRODUCTO, 'producto creado');
      expect(creado).toMatchObject({ name: nombre, price: 19.99, stock: 7 });

      const actualizar = await adminApi.actualizarProducto(creado.id, { price: 29.99, stock: 3 });
      expect(actualizar.status()).toBe(200);
      expect(await actualizar.json()).toMatchObject({ id: creado.id, price: 29.99, stock: 3, name: nombre });
      expect(((await (await api.producto(creado.id)).json()) as Producto).price).toBe(29.99);

      expect((await adminApi.eliminarProducto(creado.id)).status()).toBe(204);
      expect((await api.producto(creado.id)).status()).toBe(404);
    });

    await test.step('Sin token 401 y como cliente 403 (crear y eliminar)', async () => {
      expect((await api.crearProducto(datos)).status()).toBe(401);
      expect((await clienteApi.crearProducto(datos)).status()).toBe(403);
      expect((await clienteApi.eliminarProducto(1)).status()).toBe(403);
    });

    await test.step('Validaciones: precio negativo, stock decimal y nombre vacío responden 400', async () => {
      expect((await adminApi.crearProducto({ ...datos, price: -1 })).status()).toBe(400);
      expect((await adminApi.crearProducto({ ...datos, stock: 1.5 })).status()).toBe(400);
      expect((await adminApi.crearProducto({ ...datos, name: '  ' })).status()).toBe(400);
    });
  },
);
