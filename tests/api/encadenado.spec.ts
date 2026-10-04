import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { AUTH_ADMIN } from '../support/env';
import type { Producto } from '../support/tipos';

test.use({ storageState: AUTH_ADMIN });

test(
  'CP-INT-001 Integración API + UI: un producto creado por API se ve en el catálogo y desaparece al eliminarlo',
  {
    tag: ['@api', '@regression'],
    annotation: meta({
      epica: 'Integración',
      feature: 'API + UI',
      req: 'RF-03, RF-08',
      severidad: 'critical',
    }),
  },
  async ({ adminApi, catalogPage }, testInfo) => {
    const nombre = `Producto Encadenado ${testInfo.workerIndex}-${Date.now().toString(36)}`;
    const res = await adminApi.crearProducto({
      name: nombre,
      description: 'Creado por API',
      price: 88.8,
      category: 'Pruebas QA',
      stock: 3,
    });
    expect(res.status()).toBe(201);
    const creado = (await res.json()) as Producto;

    try {
      await test.step('La UI muestra el producto creado por API con su precio y stock', async () => {
        await catalogPage.abrir();
        await catalogPage.buscar(nombre);
        await expect(catalogPage.tarjetas).toHaveCount(1);
        await expect(catalogPage.tarjeta(nombre)).toContainText('Q88.80');
        await expect(catalogPage.tarjeta(nombre)).toContainText('Disponibles: 3');
      });
    } finally {
      expect((await adminApi.eliminarProducto(creado.id)).status()).toBe(204);
    }

    await test.step('Tras eliminarlo por API, la UI ya no lo muestra', async () => {
      await catalogPage.buscar(nombre);
      await expect(catalogPage.estadoVacio).toBeVisible();
    });
  },
);
