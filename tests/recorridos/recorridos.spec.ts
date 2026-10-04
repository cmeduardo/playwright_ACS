/**
 * 10 recorridos VISUALES (npm run navegador): el navegador se ve interactuando.
 * Cubren las operaciones críticas de un e-commerce: compra, autenticación, catálogo, carrito/cupones y pago.
 *
 *   @recorrido-ok       5 recorridos limpios (pasan con o sin defectos).
 *   @recorrido-defecto  5 recorridos que detectan un defecto cada uno (BUG-001 a BUG-005):
 *                  FALLAN con BUGS=on y PASAN con BUGS=off.
 *
 * Solo existen con RECORRIDOS=1; no forman parte de la suite de regresión.
 */
import { AUTH_CLIENTE } from '../support/env';
import {
  test,
  expect,
  paso,
  comprobar,
  escribir,
  resaltar,
  clienteAna,
  escribirCheckout,
  DATOS_VALIDOS,
  USUARIOS,
} from './recorrido';

const RAPIDO = { timeout: 3000 };

// ---------------------------------------------------------------------------------------------------------------
// 001 · LIMPIO · Compra completa
// ---------------------------------------------------------------------------------------------------------------
test(
  'CP-REC-001 Compra completa: del inicio de sesión al pedido en el historial',
  { tag: ['@recorrido-ok'] },
  async ({ page, api, loginPage, catalogPage, cartPage, checkoutPage }) => {
    await clienteAna(api);
    await loginPage.abrir();

    await paso(page, 1, 7, 'Iniciar sesión como cliente (Ana Morales)');
    await escribir(loginPage.correo, USUARIOS.cliente.email);
    await escribir(loginPage.contrasena, USUARIOS.cliente.password);
    await loginPage.botonIngresar.click();
    await expect(catalogPage.titulo).toBeVisible();

    await paso(page, 2, 7, 'Buscar «mouse» en el catálogo');
    await escribir(catalogPage.buscador, 'mouse');
    await catalogPage.botonBuscar.click();
    await expect(catalogPage.tarjetas).toHaveCount(1);
    await resaltar(catalogPage.tarjeta('Mouse Inalámbrico'));

    await paso(page, 3, 7, 'Agregar el producto al carrito');
    await catalogPage.agregarAlCarrito('Mouse Inalámbrico');
    await expect(catalogPage.aviso('Producto agregado al carrito')).toBeVisible();
    await expect(catalogPage.contadorCarrito).toHaveText('1');

    await paso(page, 4, 7, 'En el carrito: subir la cantidad a 2 y aplicar el cupón BIENVENIDO10');
    await catalogPage.irA('Carrito');
    await cartPage.cambiarCantidad('Mouse Inalámbrico', 2);
    await expect(cartPage.subtotal).toHaveText('Q240.00');
    await escribir(cartPage.campoCupon, 'BIENVENIDO10');
    await cartPage.botonCupon.click();
    await expect(cartPage.descuento).toHaveText('-Q24.00');
    await resaltar(cartPage.total);

    await paso(page, 5, 7, 'Proceder al pago y llenar el formulario');
    await cartPage.botonPagar.click();
    await expect(checkoutPage.titulo).toBeVisible();
    await escribirCheckout(checkoutPage, DATOS_VALIDOS);

    await paso(page, 6, 7, 'Pagar ahora');
    await checkoutPage.pagar();
    await expect(checkoutPage.confirmacion).toBeVisible();
    await expect(checkoutPage.totalPedido).toHaveText('Q216.00');
    await resaltar(checkoutPage.numeroPedido);

    await paso(page, 7, 7, 'Comprobar el pedido en «Mis pedidos»');
    await checkoutPage.irA('Mis pedidos');
    await expect(page.getByTestId('order-row').first()).toContainText('Mouse Inalámbrico');
    await resaltar(page.getByTestId('order-row').first());
  },
);

// ---------------------------------------------------------------------------------------------------------------
// 002 · DEFECTO BUG-001 · Cupones porcentuales en compras grandes
// ---------------------------------------------------------------------------------------------------------------
test.describe('Con la sesión del cliente ya iniciada', () => {
  test.use({ storageState: AUTH_CLIENTE });

  test(
    'CP-REC-002 Cupones porcentuales en compras grandes: el descuento debe ser exacto (BUG-001)',
    { tag: ['@recorrido-defecto'] },
    async ({ page, api, catalogPage, cartPage }, info) => {
      await clienteAna(api);
      await catalogPage.abrir();

      await paso(page, 1, 3, 'Compra grande: Monitor de Q1,500 con el cupón BIENVENIDO10 (10 %)');
      await catalogPage.agregarAlCarrito('Monitor 24 pulgadas');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.irA('Carrito');
      await escribir(cartPage.campoCupon, 'BIENVENIDO10');
      await cartPage.botonCupon.click();
      await expect(cartPage.alerta('Cupón aplicado correctamente')).toBeVisible();
      await comprobar(page, info, 'el descuento debe ser -Q150.00 y el total Q1350.00', async () => {
        await resaltar(cartPage.descuento, 1500);
        await expect.soft(cartPage.descuento).toHaveText('-Q150.00', RAPIDO);
        await expect.soft(cartPage.total).toHaveText('Q1350.00', RAPIDO);
      });

      await paso(page, 2, 3, 'Otra compra: 2 audífonos (Q760) con el cupón VERANO20 (20 %)');
      await cartPage.eliminar('Monitor 24 pulgadas');
      await expect(cartPage.vacio).toBeVisible();
      await catalogPage.irA('Catálogo');
      await catalogPage.agregarAlCarrito('Audífonos Bluetooth');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.agregarAlCarrito('Audífonos Bluetooth');
      await expect(catalogPage.contadorCarrito).toHaveText('2');
      await catalogPage.irA('Carrito');
      await cartPage.campoCupon.fill(''); // el campo recuerda el cupón anterior
      await escribir(cartPage.campoCupon, 'VERANO20');
      await cartPage.botonCupon.click();
      await expect(cartPage.alerta('Cupón aplicado correctamente')).toBeVisible();
      await comprobar(page, info, 'el descuento debe ser -Q152.00 y el total Q608.00', async () => {
        await resaltar(cartPage.descuento, 1500);
        await expect.soft(cartPage.descuento).toHaveText('-Q152.00', RAPIDO);
        await expect.soft(cartPage.total).toHaveText('Q608.00', RAPIDO);
      });

      await paso(page, 3, 3, 'En el umbral: Teclado (Q450) + 2 cuadernos (Q50) = Q500 con BIENVENIDO10');
      await cartPage.eliminar('Audífonos Bluetooth');
      await expect(cartPage.vacio).toBeVisible();
      await catalogPage.irA('Catálogo');
      await catalogPage.agregarAlCarrito('Teclado Mecánico');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.agregarAlCarrito('Cuaderno Universitario');
      await expect(catalogPage.contadorCarrito).toHaveText('2');
      await catalogPage.agregarAlCarrito('Cuaderno Universitario');
      await expect(catalogPage.contadorCarrito).toHaveText('3');
      await catalogPage.irA('Carrito');
      await expect(cartPage.subtotal).toHaveText('Q500.00');
      await cartPage.campoCupon.fill('');
      await escribir(cartPage.campoCupon, 'BIENVENIDO10');
      await cartPage.botonCupon.click();
      await expect(cartPage.alerta('Cupón aplicado correctamente')).toBeVisible();
      await comprobar(page, info, 'el descuento debe ser -Q50.00', async () => {
        await resaltar(cartPage.descuento, 1500);
        await expect.soft(cartPage.descuento).toHaveText('-Q50.00', RAPIDO);
      });
    },
  );
});

// ---------------------------------------------------------------------------------------------------------------
// 003 · LIMPIO · Autenticación y control de acceso
// ---------------------------------------------------------------------------------------------------------------
test(
  'CP-REC-003 Autenticación y control de acceso: credenciales, bloqueo, roles y cierre de sesión',
  { tag: ['@recorrido-ok'] },
  async ({ page, api, loginPage, catalogPage, adminPage }) => {
    const correo = `recorrido.${Date.now().toString(36)}@tiendaqa.test`;
    expect((await api.registrar('Cliente de Recorrido', correo, 'Prueba123!')).status()).toBe(201);
    await loginPage.abrir();

    await paso(page, 1, 6, 'Contraseña incorrecta: debe rechazarse con un mensaje claro');
    await escribir(loginPage.correo, USUARIOS.cliente.email);
    await escribir(loginPage.contrasena, 'ClaveIncorrecta1!');
    await loginPage.botonIngresar.click();
    await expect(loginPage.alerta('Credenciales inválidas')).toBeVisible();
    await resaltar(loginPage.alerta('Credenciales inválidas'), 1200);

    await paso(page, 2, 6, 'Formulario vacío: una validación por campo');
    await loginPage.correo.fill('');
    await loginPage.contrasena.fill('');
    await loginPage.botonIngresar.click();
    await expect(loginPage.errorCorreo).toHaveText('Ingresa un correo válido');
    await expect(loginPage.errorContrasena).toHaveText('La contraseña es obligatoria');

    await paso(page, 3, 6, 'Usuario bloqueado: no entra aunque la contraseña sea correcta');
    await loginPage.correo.fill('');
    await escribir(loginPage.correo, USUARIOS.bloqueado.email);
    await escribir(loginPage.contrasena, USUARIOS.bloqueado.password);
    await loginPage.botonIngresar.click();
    await expect(loginPage.alerta('Usuario bloqueado')).toBeVisible();
    await resaltar(loginPage.alerta('Usuario bloqueado'), 1200);

    await paso(page, 4, 6, 'Un cliente válido entra, pero no puede abrir el panel de administración');
    await loginPage.correo.fill('');
    await loginPage.contrasena.fill('');
    await escribir(loginPage.correo, correo);
    await escribir(loginPage.contrasena, 'Prueba123!');
    await loginPage.botonIngresar.click();
    await expect(catalogPage.titulo).toBeVisible();
    await adminPage.abrir();
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
    await resaltar(page.getByRole('heading', { name: 'Acceso denegado' }), 1200);

    await paso(page, 5, 6, 'Cerrar sesión y probar una ruta protegida: debe volver al login con un aviso');
    await loginPage.cerrarSesion();
    await expect(loginPage.titulo).toBeVisible();
    await page.goto('/#/pedidos');
    await expect(loginPage.aviso('Inicia sesión para continuar')).toBeVisible();
    await resaltar(loginPage.aviso('Inicia sesión para continuar'), 1200);

    await paso(page, 6, 6, 'El administrador sí accede a su panel');
    await loginPage.correo.fill('');
    await escribir(loginPage.correo, USUARIOS.admin.email);
    await escribir(loginPage.contrasena, USUARIOS.admin.password);
    await loginPage.botonIngresar.click();
    await expect(adminPage.titulo).toBeVisible();
    await resaltar(adminPage.titulo, 1200);
  },
);

test.describe('Con la sesión del cliente ya iniciada (2)', () => {
  test.use({ storageState: AUTH_CLIENTE });

  // -------------------------------------------------------------------------------------------------------------
  // 004 · DEFECTO BUG-002 · Cantidades inválidas
  // -------------------------------------------------------------------------------------------------------------
  test(
    'CP-REC-004 Cantidades inválidas en el carrito: negativas, cero y excesivas deben rechazarse (BUG-002)',
    { tag: ['@recorrido-defecto'] },
    async ({ page, api, catalogPage, cartPage }, info) => {
      await clienteAna(api);
      await catalogPage.abrir();

      await paso(page, 1, 4, 'Agregar un cuaderno (Q25.00) al carrito');
      await catalogPage.agregarAlCarrito('Cuaderno Universitario');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.irA('Carrito');

      await paso(page, 2, 4, 'Escribir la cantidad -3: debe rechazarse y el total seguir en Q25.00');
      await cartPage.cambiarCantidad('Cuaderno Universitario', -3);
      await comprobar(page, info, 'cantidad -3', async () => {
        await resaltar(cartPage.total, 1500);
        await expect.soft(cartPage.total).toHaveText('Q25.00', RAPIDO);
        await expect.soft(cartPage.alerta('La cantidad debe ser un entero entre 1 y 99')).toBeVisible(RAPIDO);
      });

      await paso(page, 3, 4, 'Escribir la cantidad 0: tampoco tiene sentido comprar cero unidades');
      await cartPage.cambiarCantidad('Cuaderno Universitario', 0);
      await comprobar(page, info, 'cantidad 0', async () => {
        await resaltar(cartPage.total, 1500);
        await expect.soft(cartPage.total).toHaveText('Q25.00', RAPIDO);
      });

      await paso(page, 4, 4, 'Escribir la cantidad 100: supera el máximo de 99 por producto');
      await cartPage.cambiarCantidad('Cuaderno Universitario', 100);
      await comprobar(page, info, 'cantidad 100', async () => {
        await resaltar(cartPage.total, 1500);
        await expect.soft(cartPage.total).toHaveText('Q25.00', RAPIDO);
      });
    },
  );

  // -------------------------------------------------------------------------------------------------------------
  // 005 · LIMPIO · Catálogo
  // -------------------------------------------------------------------------------------------------------------
  test(
    'CP-REC-005 Catálogo: búsqueda, filtros combinados y estados vacíos',
    { tag: ['@recorrido-ok'] },
    async ({ page, catalogPage }) => {
      await catalogPage.abrir();
      await expect(catalogPage.tarjeta('Teclado Mecánico')).toBeVisible();

      await paso(page, 1, 4, 'Buscar por nombre: «mouse»');
      await escribir(catalogPage.buscador, 'mouse');
      await catalogPage.botonBuscar.click();
      await expect(catalogPage.tarjetas).toHaveCount(1);
      await expect(catalogPage.contadorResultados).toHaveText('1 producto');
      await resaltar(catalogPage.tarjeta('Mouse Inalámbrico'), 1200);

      await paso(page, 2, 4, 'La búsqueda ignora mayúsculas y tildes: «CAFE» encuentra «Café»');
      await catalogPage.buscador.fill('');
      await escribir(catalogPage.buscador, 'CAFE');
      await catalogPage.botonBuscar.click();
      await expect(catalogPage.tarjeta('Café de Antigua 500g')).toBeVisible();
      await resaltar(catalogPage.tarjeta('Café de Antigua 500g'), 1200);

      await paso(page, 3, 4, 'Sin coincidencias: debe mostrarse un estado vacío explicativo');
      await catalogPage.buscador.fill('');
      await escribir(catalogPage.buscador, 'unicornio');
      await catalogPage.botonBuscar.click();
      await expect(catalogPage.estadoVacio).toContainText('No se encontraron productos');
      await resaltar(catalogPage.estadoVacio, 1200);

      await paso(page, 4, 4, 'Filtros combinados: Tecnología, hasta Q500, de menor a mayor precio');
      await catalogPage.buscador.fill('');
      await catalogPage.categoria.selectOption('Tecnología');
      await escribir(catalogPage.precioMaximo, '500');
      await catalogPage.orden.selectOption('precio-asc');
      await catalogPage.botonBuscar.click();
      await expect(catalogPage.tarjetas).toHaveCount(3);
      await expect(catalogPage.tarjeta('Monitor 24 pulgadas')).toHaveCount(0);
      expect(await catalogPage.precios()).toEqual([120, 380, 450]);
      await resaltar(catalogPage.contadorResultados, 1500);
    },
  );

  // -------------------------------------------------------------------------------------------------------------
  // 006 · DEFECTO BUG-003 · Búsqueda con caracteres especiales
  // -------------------------------------------------------------------------------------------------------------
  test(
    'CP-REC-006 Búsqueda con caracteres especiales: tilde, ñ y comilla simple no deben dar error (BUG-003)',
    { tag: ['@recorrido-defecto'] },
    async ({ page, catalogPage }, info) => {
      await catalogPage.abrir();
      const busquedas: [string, string][] = [
        ['café', 'Café de Antigua 500g'],
        ['Ñandú', 'Mochila Ñandú'],
        ["D'Lujo", "Pantalón D'Lujo"],
      ];
      let n = 1;
      for (const [termino, producto] of busquedas) {
        await paso(page, n++, busquedas.length, `Buscar «${termino}» (debe aparecer «${producto}»)`);
        await catalogPage.buscador.fill('');
        await escribir(catalogPage.buscador, termino);
        await catalogPage.botonBuscar.click();
        await comprobar(page, info, `búsqueda «${termino}»`, async () => {
          await expect.soft(catalogPage.errorCatalogo).toBeHidden(RAPIDO);
          await expect.soft(catalogPage.tarjeta(producto)).toBeVisible(RAPIDO);
        });
      }
    },
  );

  // -------------------------------------------------------------------------------------------------------------
  // 007 · LIMPIO · Carrito y cupones
  // -------------------------------------------------------------------------------------------------------------
  test(
    'CP-REC-007 Carrito y cupones: cantidades, eliminación y reglas de cada cupón',
    { tag: ['@recorrido-ok'] },
    async ({ page, api, catalogPage, cartPage }) => {
      await clienteAna(api);
      await catalogPage.abrir();

      await paso(page, 1, 5, 'Agregar dos productos distintos');
      await catalogPage.agregarAlCarrito('Cuaderno Universitario');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.agregarAlCarrito('Mouse Inalámbrico');
      await expect(catalogPage.contadorCarrito).toHaveText('2');

      await paso(page, 2, 5, 'Subir los cuadernos a 4 y quitar el mouse');
      await catalogPage.irA('Carrito');
      await cartPage.cambiarCantidad('Cuaderno Universitario', 4);
      await expect(cartPage.subtotal).toHaveText('Q220.00');
      await cartPage.eliminar('Mouse Inalámbrico');
      await expect(cartPage.subtotal).toHaveText('Q100.00');

      await paso(page, 3, 5, 'Cupones inexistente y expirado: se rechazan sin descontar');
      await escribir(cartPage.campoCupon, 'NOEXISTE');
      await cartPage.botonCupon.click();
      await expect(cartPage.alerta('Cupón inválido o expirado')).toBeVisible();
      await cartPage.campoCupon.fill('');
      await escribir(cartPage.campoCupon, 'EXPIRADO5');
      await cartPage.botonCupon.click();
      await expect(cartPage.alerta('Cupón inválido o expirado')).toBeVisible();
      await expect(cartPage.descuento).toHaveText('-Q0.00');

      await paso(page, 4, 5, 'FIJO50 exige una compra mínima de Q200: con Q100 no aplica');
      await cartPage.campoCupon.fill('');
      await escribir(cartPage.campoCupon, 'FIJO50');
      await cartPage.botonCupon.click();
      await expect(cartPage.alerta('compra mínima de Q200.00')).toBeVisible();
      await resaltar(cartPage.alerta('compra mínima de Q200.00'), 1200);

      await paso(page, 5, 5, 'Al subir a 10 cuadernos (Q250) FIJO50 sí aplica: descuento de Q50');
      await cartPage.cambiarCantidad('Cuaderno Universitario', 10);
      await expect(cartPage.subtotal).toHaveText('Q250.00');
      await escribir(cartPage.campoCupon, 'FIJO50');
      await cartPage.botonCupon.click();
      await expect(cartPage.descuento).toHaveText('-Q50.00');
      await expect(cartPage.total).toHaveText('Q200.00');
      await resaltar(cartPage.total, 1500);
    },
  );

  // -------------------------------------------------------------------------------------------------------------
  // 008 · DEFECTO BUG-004 · Etiquetas accesibles del checkout
  // -------------------------------------------------------------------------------------------------------------
  test(
    'CP-REC-008 Accesibilidad del checkout: cada campo debe tener una etiqueta accesible (BUG-004)',
    { tag: ['@recorrido-defecto'] },
    async ({ page, api, catalogPage, cartPage, checkoutPage }, info) => {
      await clienteAna(api);
      await catalogPage.abrir();

      await paso(page, 1, 3, 'Agregar un producto y abrir el checkout');
      await catalogPage.agregarAlCarrito('Cuaderno Universitario');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.irA('Carrito');
      await cartPage.botonPagar.click();
      await expect(checkoutPage.titulo).toBeVisible();

      await paso(page, 2, 3, 'Localizar cada campo por su etiqueta, como lo haría una tecnología de apoyo');
      const campos: [string, string][] = [
        ['Nombre completo', DATOS_VALIDOS.nombre],
        ['Correo electrónico', DATOS_VALIDOS.email],
        ['Dirección de entrega', DATOS_VALIDOS.direccion],
        ['Teléfono (8 dígitos)', DATOS_VALIDOS.telefono],
      ];
      for (const [etiqueta, valor] of campos) {
        const porEtiqueta = page.getByLabel(etiqueta);
        await comprobar(page, info, `el campo «${etiqueta}» tiene etiqueta accesible`, async () => {
          await expect.soft(porEtiqueta).toBeVisible(RAPIDO);
        });
        const encontrado = (await porEtiqueta.count()) > 0;
        // Si no tiene etiqueta, la persona lo ve igual: se escribe por su id para continuar el recorrido.
        await escribir(encontrado ? porEtiqueta : page.locator('#direccion'), valor);
      }

      await paso(page, 3, 3, 'Completar la tarjeta y comprobar que el resto de campos sí son accesibles');
      await comprobar(page, info, 'los campos de pago tienen etiqueta accesible', async () => {
        await expect.soft(page.getByLabel('Número de tarjeta')).toBeVisible(RAPIDO);
        await expect.soft(page.getByLabel('Vencimiento (MM/AA)')).toBeVisible(RAPIDO);
        await expect.soft(page.getByLabel('CVV')).toBeVisible(RAPIDO);
      });
    },
  );

  // -------------------------------------------------------------------------------------------------------------
  // 009 · LIMPIO · Checkout robusto
  // -------------------------------------------------------------------------------------------------------------
  test(
    'CP-REC-009 Checkout robusto: validaciones, valores límite, tarjeta declinada y pago final',
    { tag: ['@recorrido-ok'] },
    async ({ page, api, catalogPage, cartPage, checkoutPage }) => {
      await clienteAna(api);
      await catalogPage.abrir();
      await catalogPage.agregarAlCarrito('Cuaderno Universitario');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.irA('Carrito');
      await cartPage.botonPagar.click();
      await expect(checkoutPage.titulo).toBeVisible();

      await paso(page, 1, 5, 'Pagar con el formulario vacío: un mensaje por cada campo');
      await checkoutPage.pagar();
      await expect(checkoutPage.mensajeError('nombre')).toHaveText('El nombre es obligatorio');
      await expect(checkoutPage.mensajeError('tarjeta')).toHaveText('La tarjeta debe tener 16 dígitos');
      await expect(checkoutPage.mensajeError('cvv')).toHaveText('El CVV debe tener 3 dígitos');
      await resaltar(checkoutPage.mensajeError('nombre'), 1200);

      await paso(
        page,
        2,
        5,
        'Valores límite: teléfono de 7 dígitos y tarjeta de 15 señalan solo esos campos',
      );
      await escribirCheckout(checkoutPage, {
        ...DATOS_VALIDOS,
        telefono: '5551234',
        tarjeta: '411111111111111',
      });
      await checkoutPage.pagar();
      await expect(checkoutPage.mensajeError('telefono')).toHaveText('El teléfono debe tener 8 dígitos');
      await expect(checkoutPage.mensajeError('tarjeta')).toHaveText('La tarjeta debe tener 16 dígitos');
      await expect(checkoutPage.mensajeError('nombre')).toHaveText('');
      await resaltar(checkoutPage.mensajeError('telefono'), 1200);

      await paso(page, 3, 5, 'Tarjeta declinada por el banco (termina en 0002): el pago se rechaza');
      await checkoutPage.campo('telefono').fill('');
      await escribir(checkoutPage.campo('telefono'), DATOS_VALIDOS.telefono);
      await checkoutPage.campo('tarjeta').fill('');
      await escribir(checkoutPage.campo('tarjeta'), '4000000000000002');
      await checkoutPage.pagar();
      await expect(checkoutPage.alerta('Pago rechazado')).toBeVisible();
      await expect(checkoutPage.contadorCarrito).toHaveText('1');
      await resaltar(checkoutPage.alerta('Pago rechazado'), 1500);

      await paso(page, 4, 5, 'Corregir la tarjeta y pagar de nuevo');
      await checkoutPage.campo('tarjeta').fill('');
      await escribir(checkoutPage.campo('tarjeta'), DATOS_VALIDOS.tarjeta);
      await checkoutPage.pagar();
      await expect(checkoutPage.confirmacion).toBeVisible();
      await expect(checkoutPage.totalPedido).toHaveText('Q25.00');
      await resaltar(checkoutPage.numeroPedido, 1200);

      await paso(page, 5, 5, 'El carrito queda vacío y el pedido figura como Pagado');
      await expect(checkoutPage.contadorCarrito).toHaveText('0');
      await checkoutPage.irA('Mis pedidos');
      await expect(page.getByTestId('order-row').first()).toContainText('Pagado');
      await resaltar(page.getByTestId('order-row').first(), 1200);
    },
  );

  // -------------------------------------------------------------------------------------------------------------
  // 010 · DEFECTO BUG-005 · Aspecto del botón de pago
  // -------------------------------------------------------------------------------------------------------------
  test(
    'CP-REC-010 Botón de pago: debe conservar su aspecto aprobado y completar la compra (BUG-005)',
    { tag: ['@recorrido-defecto'] },
    async ({ page, api, catalogPage, cartPage, checkoutPage }, info) => {
      await clienteAna(api);
      await catalogPage.abrir();

      await paso(page, 1, 3, 'Agregar un teclado (Q450.00) y abrir el checkout');
      await catalogPage.agregarAlCarrito('Teclado Mecánico');
      await expect(catalogPage.contadorCarrito).toHaveText('1');
      await catalogPage.irA('Carrito');
      await cartPage.botonPagar.click();
      await expect(checkoutPage.titulo).toBeVisible();
      await escribirCheckout(checkoutPage, DATOS_VALIDOS);

      await paso(
        page,
        2,
        3,
        'El botón «Pagar ahora» debe ser negro, de esquinas rectas y con letras sin separar',
      );
      await page.mouse.move(4, 4); // fuera del botón, para no medir su estado :hover
      await resaltar(checkoutPage.botonPagar, 1800);
      await comprobar(page, info, 'color y forma del botón de pago', async () => {
        await expect.soft(checkoutPage.botonPagar).toHaveCSS('background-color', 'rgb(15, 15, 15)', RAPIDO);
        await expect.soft(checkoutPage.botonPagar).toHaveCSS('border-top-left-radius', '0px', RAPIDO);
        await expect.soft(checkoutPage.botonPagar).toHaveCSS('letter-spacing', 'normal', RAPIDO);
      });

      await paso(page, 3, 3, 'Aunque se vea distinto, el pago debe funcionar: pagar y verificar el pedido');
      await checkoutPage.pagar();
      await expect(checkoutPage.confirmacion).toBeVisible();
      await expect(checkoutPage.totalPedido).toHaveText('Q450.00');
      await resaltar(checkoutPage.numeroPedido, 1200);
    },
  );
});
