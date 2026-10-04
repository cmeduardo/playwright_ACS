import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { ESQUEMA_PRODUCTO, validarEsquema } from '../support/esquemas';
import type { Producto } from '../support/tipos';

test(
  'CP-API-002 Catálogo por API: listado, detalle, búsqueda y filtros',
  {
    tag: ['@api', '@regression'],
    annotation: meta({ epica: 'API', feature: 'Productos', req: 'RF-03, RF-04', severidad: 'critical' }),
  },
  async ({ api }) => {
    await test.step('El listado devuelve JSON con el esquema correcto', async () => {
      const res = await api.productos();
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/json');
      const productos = (await res.json()) as Producto[];
      expect(productos.length).toBeGreaterThanOrEqual(12);
      for (const p of productos) validarEsquema(p, ESQUEMA_PRODUCTO, `producto ${p.id}`);
    });

    await test.step('Detalle por id y 404 si no existe', async () => {
      const ok = await api.producto(2);
      expect(ok.status()).toBe(200);
      expect(((await ok.json()) as Producto).name).toBe('Teclado Mecánico');
      expect((await api.producto(999999)).status()).toBe(404);
    });

    await test.step('Búsqueda sin tildes ni mayúsculas', async () => {
      const productos = (await (await api.productos({ q: 'AUDIFONOS' })).json()) as Producto[];
      expect(productos.map((p) => p.name)).toContain('Audífonos Bluetooth');
    });

    await test.step('Filtros combinados: categoría, precio máximo y orden descendente', async () => {
      const res = await api.productos({ category: 'Tecnología', maxPrice: 500, sort: 'precio-desc' });
      const productos = (await res.json()) as Producto[];
      expect(productos.length).toBeGreaterThan(0);
      expect(productos.every((p) => p.category === 'Tecnología' && p.price <= 500)).toBe(true);
      const precios = productos.map((p) => p.price);
      expect(precios).toEqual([...precios].sort((a, b) => b - a));
    });
  },
);
