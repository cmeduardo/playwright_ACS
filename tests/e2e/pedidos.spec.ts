import { test, expect, ENVIO_VALIDO, PAGO_VALIDO } from '../fixtures';
import { meta } from '../support/meta';
import { productoPorNombre } from '../support/productos';
import type { Pedido, Sesion } from '../support/tipos';

test(
  'CP-E2E-007 Pedidos: historial vacío y lleno, y aislamiento entre clientes',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Compra',
      feature: 'Historial de pedidos',
      req: 'RF-09, RNF-03',
      severidad: 'critical',
    }),
  },
  async ({ paginaCliente: page, clienteApi, adminApi, api }) => {
    test.setTimeout(90_000);
    let pedido: Pedido;

    await test.step('1. Un cliente sin compras ve el historial vacío', async () => {
      await page.goto('/#/pedidos');
      await expect(page.getByTestId('orders-empty')).toContainText('Aún no tienes pedidos');
    });

    await test.step('2. Tras comprar (por API), el pedido aparece con producto, total y estado', async () => {
      const botella = await productoPorNombre(clienteApi, 'Botella Térmica 1L');
      await clienteApi.agregarAlCarrito(botella.id, 2);
      const res = await clienteApi.crearPedido(ENVIO_VALIDO, PAGO_VALIDO);
      expect(res.status()).toBe(201);
      pedido = (await res.json()) as Pedido;
      await page.reload();
      const fila = page.getByTestId('order-row');
      await expect(fila).toHaveCount(1);
      await expect(fila.first()).toContainText('Botella Térmica 1L × 2');
      await expect(fila.first()).toContainText('Q300.00');
      await expect(fila.first()).toContainText('Pagado');
    });

    await test.step('3. Otro cliente no puede ver ese pedido, pero el administrador sí', async () => {
      const registro = await api.registrar('Otro Cliente', `otro.${Date.now()}@tiendaqa.test`, 'Prueba123!');
      const otro = api.conToken(((await registro.json()) as Sesion).token);
      expect(((await (await otro.pedidos()).json()) as unknown[]).length).toBe(0);
      expect((await otro.pedido(pedido.id)).status()).toBe(404);
      expect((await adminApi.pedido(pedido.id)).status()).toBe(200);
    });
  },
);
