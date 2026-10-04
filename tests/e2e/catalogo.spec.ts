import { test, expect } from '../fixtures';
import { meta } from '../support/meta';

test(
  'CP-E2E-003 Catálogo: búsqueda, filtros combinados y estados vacíos',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Catálogo',
      feature: 'Búsqueda y filtros',
      req: 'RF-03, RF-04',
      severidad: 'critical',
    }),
  },
  async ({ catalogPage }) => {
    test.setTimeout(90_000);
    await catalogPage.abrir();

    await test.step('1. El catálogo muestra los productos con su precio', async () => {
      await expect(catalogPage.titulo).toBeVisible();
      await expect(catalogPage.tarjeta('Teclado Mecánico')).toContainText('Q450.00');
      await expect(catalogPage.tarjetas).not.toHaveCount(0);
    });

    await test.step('2. Búsqueda por nombre', async () => {
      await catalogPage.buscar('mouse');
      await expect(catalogPage.tarjetas).toHaveCount(1);
      await expect(catalogPage.tarjeta('Mouse Inalámbrico')).toBeVisible();
      await expect(catalogPage.contadorResultados).toHaveText('1 producto');
    });

    await test.step('3. La búsqueda ignora mayúsculas y tildes (CAFE → Café)', async () => {
      await catalogPage.buscador.fill('');
      await catalogPage.buscar('CAFE');
      await expect(catalogPage.tarjeta('Café de Antigua 500g')).toBeVisible();
    });

    await test.step('4. Sin coincidencias: estado vacío', async () => {
      await catalogPage.buscador.fill('');
      await catalogPage.buscar('unicornio');
      await expect(catalogPage.estadoVacio).toContainText('No se encontraron productos');
      await expect(catalogPage.contadorResultados).toHaveText('0 productos');
    });

    await test.step('5. Filtro por categoría: solo Papelería', async () => {
      await catalogPage.buscador.fill('');
      await catalogPage.categoria.selectOption('Papelería');
      await catalogPage.botonBuscar.click();
      await expect(catalogPage.tarjetas.first()).toBeVisible();
      for (const tarjeta of await catalogPage.tarjetas.all())
        await expect(tarjeta).toContainText('Papelería');
    });

    await test.step('6. Categoría + precio máximo + orden ascendente combinados', async () => {
      await catalogPage.categoria.selectOption('Tecnología');
      await catalogPage.precioMaximo.fill('500');
      await catalogPage.orden.selectOption('precio-asc');
      await catalogPage.botonBuscar.click();
      await expect(catalogPage.tarjeta('Monitor 24 pulgadas')).toHaveCount(0);
      await expect(catalogPage.tarjetas).toHaveCount(3);
      expect(await catalogPage.precios()).toEqual([120, 380, 450]);
    });
  },
);
