import { test, expect } from '../fixtures';
import { meta } from '../support/meta';

test(
  'CP-E2E-004 Carrito y cupones: cantidades, eliminación y reglas de cada cupón',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Compra',
      feature: 'Carrito y cupones',
      req: 'RF-05, RF-06',
      severidad: 'critical',
    }),
  },
  async ({ paginaCliente, catalogPage, cartPage }) => {
    test.setTimeout(90_000);
    expect(paginaCliente).toBeDefined();

    await test.step('1. Agregar dos productos distintos desde el catálogo', async () => {
      await catalogPage.abrir();
      await expect(catalogPage.contadorCarrito).toHaveText('0');
      await catalogPage.agregarAlCarrito('Cuaderno Universitario');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.agregarAlCarrito('Mouse Inalámbrico');
      await expect(catalogPage.contadorCarrito).toHaveText('2');
    });

    await test.step('2. Cambiar la cantidad del cuaderno a 4 recalcula el subtotal', async () => {
      await catalogPage.irA('Carrito');
      await expect(cartPage.filas).toHaveCount(2);
      await cartPage.cambiarCantidad('Cuaderno Universitario', 4);
      await expect(cartPage.subtotal).toHaveText('Q220.00');
    });

    await test.step('3. Eliminar el mouse deja solo el cuaderno', async () => {
      await cartPage.eliminar('Mouse Inalámbrico');
      await expect(cartPage.filas).toHaveCount(1);
      await expect(cartPage.subtotal).toHaveText('Q100.00');
    });

    await test.step('4. Cupones inexistente y expirado se rechazan sin descontar', async () => {
      await cartPage.aplicarCupon('NOEXISTE');
      await expect(cartPage.alerta('Cupón inválido o expirado')).toBeVisible();
      await cartPage.campoCupon.fill('');
      await cartPage.aplicarCupon('EXPIRADO5');
      await expect(cartPage.alerta('Cupón inválido o expirado')).toBeVisible();
      await expect(cartPage.descuento).toHaveText('-Q0.00');
    });

    await test.step('5. FIJO50 exige una compra mínima de Q200', async () => {
      await cartPage.campoCupon.fill('');
      await cartPage.aplicarCupon('FIJO50');
      await expect(cartPage.alerta('compra mínima de Q200.00')).toBeVisible();
    });

    await test.step('6. Al superar el mínimo (10 × Q25 = Q250) FIJO50 descuenta Q50', async () => {
      await cartPage.cambiarCantidad('Cuaderno Universitario', 10);
      await expect(cartPage.subtotal).toHaveText('Q250.00');
      await cartPage.aplicarCupon('FIJO50');
      await expect(cartPage.alerta('Cupón aplicado correctamente')).toBeVisible();
      await expect(cartPage.descuento).toHaveText('-Q50.00');
      await expect(cartPage.total).toHaveText('Q200.00');
    });

    await test.step('7. Otro cupón reemplaza al anterior: BIENVENIDO10 descuenta el 10 %', async () => {
      await cartPage.campoCupon.fill('');
      await cartPage.aplicarCupon('BIENVENIDO10');
      await expect(cartPage.descuento).toHaveText('-Q25.00');
      await expect(cartPage.total).toHaveText('Q225.00');
    });

    await test.step('8. Eliminar el último producto muestra el carrito vacío', async () => {
      await cartPage.eliminar('Cuaderno Universitario');
      await expect(cartPage.vacio).toContainText('Tu carrito está vacío');
    });
  },
);
