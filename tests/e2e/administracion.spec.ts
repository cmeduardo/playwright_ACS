import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { AUTH_ADMIN } from '../support/env';
import type { Producto } from '../support/tipos';

test.use({ storageState: AUTH_ADMIN });

test(
  'CP-E2E-006 Administración de productos: crear, editar, validar, cancelar y eliminar',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Administración',
      feature: 'CRUD de productos',
      req: 'RF-08',
      severidad: 'critical',
    }),
  },
  async ({ adminPage, adminApi }, testInfo) => {
    test.setTimeout(90_000);
    const nombre = `QA Admin ${testInfo.workerIndex}-${Date.now().toString(36)}`;
    await adminPage.abrir();
    await expect(adminPage.titulo).toBeVisible();

    try {
      await test.step('1. Crear un producto: aparece en la tabla con su precio', async () => {
        await adminPage.crear({
          nombre,
          descripcion: 'Producto de prueba',
          precio: '99.50',
          categoria: 'Pruebas QA',
          stock: '10',
        });
        await expect(adminPage.alerta('Producto creado correctamente')).toBeVisible();
        await expect(adminPage.fila(nombre)).toContainText('Q99.50');
      });

      await test.step('2. Editar precio y stock: la fila muestra los nuevos valores', async () => {
        await adminPage.editar(nombre, { precio: '25.75', stock: '42' });
        await expect(adminPage.alerta('Producto actualizado correctamente')).toBeVisible();
        await expect(adminPage.fila(nombre)).toContainText('Q25.75');
        await expect(adminPage.fila(nombre)).toContainText('42');
      });

      await test.step('3. Validaciones: nombre vacío y precio negativo', async () => {
        await adminPage.llenarFormulario({ nombre: '', precio: '10', categoria: 'Pruebas QA', stock: '1' });
        await adminPage.botonGuardar.click();
        await expect(adminPage.alerta('El nombre es obligatorio')).toBeVisible();
        await adminPage.llenarFormulario({ nombre: 'Producto inválido', precio: '-5' });
        await adminPage.botonGuardar.click();
        await expect(adminPage.alerta('El precio debe ser un número mayor o igual a 0')).toBeVisible();
      });

      await test.step('4. Cancelar la eliminación conserva el producto', async () => {
        await adminPage.pedirEliminacion(nombre);
        await expect(adminPage.dialogoConfirmacion).toBeVisible();
        await adminPage.dialogoConfirmacion.getByRole('button', { name: 'Cancelar' }).click();
        await expect(adminPage.dialogoConfirmacion).toBeHidden();
        await expect(adminPage.fila(nombre)).toBeVisible();
      });

      await test.step('5. Confirmar la eliminación lo quita de la tabla', async () => {
        await adminPage.eliminar(nombre);
        await expect(adminPage.alerta('Producto eliminado correctamente')).toBeVisible();
        await expect(adminPage.fila(nombre)).toHaveCount(0);
      });
    } finally {
      // Limpieza: si algún paso falló antes de eliminar, el producto no debe quedar en el catálogo.
      const lista = (await (await adminApi.productos()).json()) as Producto[];
      for (const p of lista.filter((x) => x.name === nombre)) await adminApi.eliminarProducto(p.id);
    }
  },
);
