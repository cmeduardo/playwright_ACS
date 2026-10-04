import { test, expect, ENVIO_VALIDO, PAGO_VALIDO } from '../fixtures';
import { meta } from '../support/meta';
import { leerCsv, leerJson, porCadaFila } from '../support/datos';
import { productoPorNombre } from '../support/productos';
import type { CampoCheckout } from '../pages/CheckoutPage';

const paso = (titulo: string, cuerpo: () => Promise<void>): Promise<void> => test.step(titulo, cuerpo);

interface CasoLogin {
  id: string;
  tipo: string;
  descripcion: string;
  email: string;
  password: string;
  esperado: 'catalogo' | 'admin' | 'error' | 'validacion';
  mensaje?: string;
}
interface CasoNegativo {
  id: string;
  tipo: string;
  descripcion: string;
  campo: CampoCheckout;
  valor: string;
  mensaje: string;
}
type CasoPositivo = Record<
  | 'id'
  | 'tipo'
  | 'descripcion'
  | 'nombre'
  | 'email'
  | 'direccion'
  | 'telefono'
  | 'tarjeta'
  | 'vencimiento'
  | 'cvv',
  string
>;
type CasoCupon = Record<
  | 'id'
  | 'cupon'
  | 'producto'
  | 'cantidad'
  | 'subtotal'
  | 'descuento'
  | 'total'
  | 'descripcion'
  | 'defecto_asociado',
  string
>;

test(
  'CP-DD-001 Login dirigido por datos: 8 combinaciones de credenciales (test-data/login.json)',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Autenticación',
      feature: 'Login dirigido por datos',
      req: 'RF-01',
      severidad: 'critical',
    }),
  },
  async ({ page, loginPage, catalogPage, adminPage }) => {
    test.setTimeout(120_000);
    const filas = leerJson<CasoLogin[]>('login.json');
    await porCadaFila(
      filas,
      (f) => `${f.id} [${f.tipo}] ${f.descripcion}`,
      async (f) => {
        await page.goto('/#/login');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await loginPage.iniciarSesion(f.email, f.password);
        if (f.esperado === 'catalogo') await expect(catalogPage.titulo).toBeVisible();
        else if (f.esperado === 'admin') await expect(adminPage.titulo).toBeVisible();
        else if (f.esperado === 'error') await expect(loginPage.alerta(f.mensaje ?? '')).toBeVisible();
        else await expect(page.getByText(f.mensaje ?? '', { exact: true })).toBeVisible();
      },
      paso,
    );
  },
);

test(
  'CP-DD-002 Checkout dirigido por datos: 8 entradas inválidas o límite y 3 compras válidas',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Compra',
      feature: 'Checkout dirigido por datos',
      req: 'RF-07',
      severidad: 'critical',
    }),
  },
  async ({ page, carritoUI, checkoutPage }) => {
    test.setTimeout(180_000);
    const negativos = leerJson<CasoNegativo[]>('checkout-negativos.json');
    const positivos = leerCsv<CasoPositivo>('checkout-positivos.csv');
    const abrir = async (): Promise<void> => {
      await page.goto('/#/checkout');
      await page.reload();
      await expect(checkoutPage.titulo).toBeVisible();
    };

    await porCadaFila(
      negativos,
      (f) => `${f.id} [${f.tipo}] ${f.descripcion}`,
      async (f) => {
        await abrir();
        await checkoutPage.completar(ENVIO_VALIDO, PAGO_VALIDO);
        await checkoutPage.campo(f.campo).fill(f.valor);
        await checkoutPage.pagar();
        await expect(checkoutPage.mensajeError(f.campo)).toHaveText(f.mensaje);
        await expect(page).toHaveURL(/#\/checkout/);
      },
      paso,
    );

    await porCadaFila(
      positivos,
      (f) => `${f.id} [${f.tipo}] ${f.descripcion}`,
      async (f) => {
        await carritoUI.api.agregarAlCarrito(carritoUI.producto.id, 1); // cada compra vacía el carrito
        await abrir();
        await checkoutPage.completar(
          { nombre: f.nombre, email: f.email, direccion: f.direccion, telefono: f.telefono },
          { tarjeta: f.tarjeta, vencimiento: f.vencimiento, cvv: f.cvv },
        );
        await checkoutPage.pagar();
        await expect(checkoutPage.confirmacion).toBeVisible();
      },
      paso,
    );
  },
);

test(
  'CP-DD-003 Cupones dirigidos por datos: 6 combinaciones de producto, cantidad y cupón',
  {
    tag: ['@regression'],
    annotation: meta({
      epica: 'Compra',
      feature: 'Cupones dirigidos por datos',
      req: 'RF-06',
      severidad: 'critical',
      defecto: 'BUG-001',
    }),
  },
  async ({ paginaCliente: page, clienteApi, cartPage }) => {
    test.setTimeout(120_000);
    const filas = leerCsv<CasoCupon>('cupones.csv');
    await porCadaFila(
      filas,
      (f) =>
        `${f.id} ${f.cupon} · ${f.producto} × ${f.cantidad}${f.defecto_asociado ? ` (${f.defecto_asociado})` : ''}`,
      async (f) => {
        const actual = (await (await clienteApi.carrito()).json()) as { items: { productId: number }[] };
        for (const item of actual.items) await clienteApi.quitarDelCarrito(item.productId);
        await clienteApi.quitarCupon();
        const producto = await productoPorNombre(clienteApi, f.producto);
        await clienteApi.agregarAlCarrito(producto.id, Number(f.cantidad));

        await page.goto('/#/carrito');
        await page.reload();
        await cartPage.aplicarCupon(f.cupon);
        await expect(cartPage.alerta('Cupón aplicado correctamente')).toBeVisible();
        await expect(cartPage.subtotal).toHaveText(`Q${f.subtotal}`);
        await expect(cartPage.descuento).toHaveText(`-Q${f.descuento}`);
        await expect(cartPage.total).toHaveText(`Q${f.total}`);
      },
      paso,
    );
  },
);
