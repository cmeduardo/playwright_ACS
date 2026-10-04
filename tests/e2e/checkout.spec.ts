import { test, expect, ENVIO_VALIDO, PAGO_VALIDO } from '../fixtures';
import { meta } from '../support/meta';

test(
  'CP-E2E-005 Checkout: validaciones, valores límite, tarjeta declinada y pago final',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Compra',
      feature: 'Checkout y pago',
      req: 'RF-07',
      severidad: 'blocker',
    }),
  },
  async ({ carritoUI, checkoutPage }) => {
    test.setTimeout(90_000);
    expect(carritoUI.carrito.items).toHaveLength(1); // 2 × Cuaderno Universitario = Q50.00
    await checkoutPage.abrir();
    await expect(checkoutPage.titulo).toBeVisible();

    await test.step('1. Formulario vacío: un mensaje por cada campo obligatorio', async () => {
      await checkoutPage.pagar();
      await expect(checkoutPage.mensajeError('nombre')).toHaveText('El nombre es obligatorio');
      await expect(checkoutPage.mensajeError('email')).toHaveText('Ingresa un correo válido');
      await expect(checkoutPage.mensajeError('direccion')).toHaveText(
        'La dirección debe tener al menos 5 caracteres',
      );
      await expect(checkoutPage.mensajeError('telefono')).toHaveText('El teléfono debe tener 8 dígitos');
      await expect(checkoutPage.mensajeError('tarjeta')).toHaveText('La tarjeta debe tener 16 dígitos');
      await expect(checkoutPage.mensajeError('vencimiento')).toHaveText('Usa el formato MM/AA');
      await expect(checkoutPage.mensajeError('cvv')).toHaveText('El CVV debe tener 3 dígitos');
    });

    await test.step('2. Valores límite: teléfono de 7 dígitos y tarjeta de 15 señalan solo esos campos', async () => {
      await checkoutPage.completar(
        { ...ENVIO_VALIDO, telefono: '5551234' },
        { ...PAGO_VALIDO, tarjeta: '411111111111111' },
      );
      await checkoutPage.pagar();
      await expect(checkoutPage.mensajeError('telefono')).toHaveText('El teléfono debe tener 8 dígitos');
      await expect(checkoutPage.mensajeError('tarjeta')).toHaveText('La tarjeta debe tener 16 dígitos');
      await expect(checkoutPage.mensajeError('nombre')).toHaveText('');
    });

    await test.step('3. Tarjeta declinada: se rechaza el pago y el carrito se conserva', async () => {
      await checkoutPage.completar(ENVIO_VALIDO, { ...PAGO_VALIDO, tarjeta: '4000000000000002' });
      await checkoutPage.pagar();
      await expect(checkoutPage.alerta('Pago rechazado')).toBeVisible();
      await expect(checkoutPage.confirmacion).toBeHidden();
      await expect(checkoutPage.contadorCarrito).toHaveText('2');
    });

    await test.step('4. Con una tarjeta válida el pago se completa y el carrito queda vacío', async () => {
      await checkoutPage.completar(ENVIO_VALIDO, PAGO_VALIDO);
      await checkoutPage.pagar();
      await expect(checkoutPage.confirmacion).toBeVisible();
      await expect(checkoutPage.totalPedido).toHaveText('Q50.00');
      await expect(checkoutPage.contadorCarrito).toHaveText('0');
    });
  },
);
