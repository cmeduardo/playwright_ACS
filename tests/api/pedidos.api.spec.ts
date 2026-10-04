import { test, expect, ENVIO_VALIDO, PAGO_VALIDO } from '../fixtures';
import { meta } from '../support/meta';
import { ESQUEMA_PEDIDO, validarEsquema } from '../support/esquemas';
import type { Pedido, Producto, Sesion } from '../support/tipos';

test(
  'CP-API-005 Pedidos por API: checkout, validaciones, pago rechazado y permisos',
  {
    tag: ['@api', '@smoke', '@regression'],
    annotation: meta({ epica: 'API', feature: 'Pedidos', req: 'RF-07, RF-09, RNF-03', severidad: 'blocker' }),
  },
  async ({ api, clienteApi, adminApi }) => {
    await test.step('Carrito vacío: el pedido se rechaza con 400', async () => {
      expect((await clienteApi.crearPedido(ENVIO_VALIDO, PAGO_VALIDO)).status()).toBe(400);
    });

    await test.step('Datos inválidos: 400 con el detalle por campo', async () => {
      await clienteApi.agregarAlCarrito(5, 1);
      const res = await clienteApi.crearPedido(
        { ...ENVIO_VALIDO, telefono: '123' },
        { ...PAGO_VALIDO, cvv: '1' },
      );
      expect(res.status()).toBe(400);
      const { fields } = (await res.json()) as { fields: Record<string, string> };
      expect(Object.keys(fields).sort()).toEqual(['cvv', 'telefono']);
    });

    await test.step('Tarjeta declinada: 402 y no se crea el pedido', async () => {
      const res = await clienteApi.crearPedido(ENVIO_VALIDO, { ...PAGO_VALIDO, tarjeta: '4000000000000002' });
      expect(res.status()).toBe(402);
      expect(((await (await clienteApi.pedidos()).json()) as unknown[]).length).toBe(0);
    });

    let pedido: Pedido;
    await test.step('Pedido válido: esquema, carrito vaciado y stock descontado', async () => {
      await clienteApi.quitarDelCarrito(5);
      const antes = (await (await api.producto(8)).json()) as Producto; // Botella Térmica
      await clienteApi.agregarAlCarrito(8, 2);
      const res = await clienteApi.crearPedido(ENVIO_VALIDO, PAGO_VALIDO);
      expect(res.status()).toBe(201);
      pedido = (await res.json()) as Pedido;
      validarEsquema(pedido, ESQUEMA_PEDIDO, 'pedido');
      expect(pedido).toMatchObject({ subtotal: 300, total: 300, status: 'Pagado' });
      expect(pedido.items).toEqual([expect.objectContaining({ productId: 8, quantity: 2 })]);
      expect(((await (await clienteApi.carrito()).json()) as { items: unknown[] }).items).toHaveLength(0);
      expect(((await (await api.producto(8)).json()) as Producto).stock).toBe(antes.stock - 2);
    });

    await test.step('Un cliente ajeno no ve el pedido (404); el administrador sí lo ve', async () => {
      const registro = await api.registrar('Intruso', `intruso.${Date.now()}@tiendaqa.test`, 'Prueba123!');
      const intruso = api.conToken(((await registro.json()) as Sesion).token);
      expect((await intruso.pedido(pedido.id)).status()).toBe(404);
      expect((await adminApi.pedido(pedido.id)).status()).toBe(200);
      const todos = (await (await adminApi.pedidos(true)).json()) as Pedido[];
      expect(todos.map((p) => p.id)).toContain(pedido.id);
    });
  },
);
