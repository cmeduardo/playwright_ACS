import { test, expect, ENVIO_VALIDO, PAGO_VALIDO } from '../fixtures';
import { meta } from '../support/meta';

test(
  'CP-E2E-001 Compra completa: del inicio de sesión al pedido en el historial',
  {
    tag: ['@smoke', '@regression'],
    annotation: meta({
      epica: 'Compra',
      feature: 'Flujo de compra',
      req: 'RF-01, RF-03, RF-05, RF-06, RF-07, RF-09',
      severidad: 'blocker',
    }),
  },
  async ({ page, clienteNuevo, loginPage, catalogPage, cartPage, checkoutPage }) => {
    test.setTimeout(90_000);

    await test.step('1. Iniciar sesión por la interfaz con un cliente recién registrado', async () => {
      await loginPage.abrir();
      await loginPage.iniciarSesion(clienteNuevo.email, clienteNuevo.password);
      await expect(catalogPage.titulo).toBeVisible();
      await expect(loginPage.nombreUsuario).toContainText('Cliente QA');
    });

    await test.step('2. Buscar «mouse» y agregarlo al carrito', async () => {
      await catalogPage.buscar('mouse');
      await expect(catalogPage.tarjetas).toHaveCount(1);
      await catalogPage.agregarAlCarrito('Mouse Inalámbrico');
      await expect(catalogPage.aviso('Producto agregado al carrito')).toBeVisible();
      await expect(catalogPage.contadorCarrito).toHaveText('1');
    });

    await test.step('3. En el carrito: subir la cantidad a 2 y aplicar el cupón BIENVENIDO10', async () => {
      await catalogPage.irA('Carrito');
      await cartPage.cambiarCantidad('Mouse Inalámbrico', 2);
      await expect(cartPage.subtotal).toHaveText('Q240.00');
      await cartPage.aplicarCupon('BIENVENIDO10');
      await expect(cartPage.alerta('Cupón aplicado correctamente')).toBeVisible();
      await expect(cartPage.descuento).toHaveText('-Q24.00');
      await expect(cartPage.total).toHaveText('Q216.00');
    });

    await test.step('4. Pagar con datos válidos y ver el pedido confirmado', async () => {
      await cartPage.botonPagar.click();
      await expect(checkoutPage.titulo).toBeVisible();
      await checkoutPage.completar(ENVIO_VALIDO, PAGO_VALIDO);
      await checkoutPage.pagar();
      await expect(checkoutPage.confirmacion).toBeVisible();
      await expect(checkoutPage.numeroPedido).toHaveText(/#\d+/);
      await expect(checkoutPage.totalPedido).toHaveText('Q216.00');
      await expect(checkoutPage.contadorCarrito).toHaveText('0');
    });

    await test.step('5. El pedido aparece en «Mis pedidos» como Pagado', async () => {
      await checkoutPage.irA('Mis pedidos');
      const fila = page.getByTestId('order-row');
      await expect(fila).toHaveCount(1);
      await expect(fila.first()).toContainText('Mouse Inalámbrico');
      await expect(fila.first()).toContainText('Q216.00');
      await expect(fila.first()).toContainText('Pagado');
    });
  },
);
