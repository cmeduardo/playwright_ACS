import { test as base, expect, ENVIO_VALIDO, PAGO_VALIDO } from '../fixtures';
import type { ApiClient } from '../support/api-client';
import { BUGS, USUARIOS } from '../support/env';
import type { Sesion } from '../support/tipos';
import type { CampoCheckout, CheckoutPage } from '../pages/CheckoutPage';
import type { Page, TestInfo } from '@playwright/test';
import { escribir, instalarEscenario, maximizarVentana, narrar, pausa, resaltar } from './ayudas';

export { expect, ENVIO_VALIDO, PAGO_VALIDO, BUGS, USUARIOS, escribir, narrar, pausa, resaltar };

// eslint-disable-next-line no-control-regex
const sinColor = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, '');

export const test = base.extend<{ escenario: void }>({
  escenario: [
    async ({ page }, use, testInfo) => {
      await maximizarVentana(page);
      await instalarEscenario(page, testInfo.title.split(' ')[0] ?? 'RECORRIDO', BUGS);
      await use();
      try {
        if (testInfo.status === testInfo.expectedStatus) {
          await narrar(page, 'Recorrido superado: la aplicación se comporta como se espera.', 'ok', 1800);
          return;
        }
        const lineas = sinColor(testInfo.error?.message ?? '')
          .split('\n')
          .map((l) => l.trim());
        const detalle = [
          lineas[0],
          lineas.find((l) => l.startsWith('Expected')),
          lineas.find((l) => l.startsWith('Received')),
        ]
          .filter(Boolean)
          .join('  ·  ');
        const n = testInfo.errors.length;
        await narrar(
          page,
          `RECORRIDO CON DEFECTOS (${n} ${n === 1 ? 'detectado' : 'detectados'}) — ${detalle}`,
          'error',
          5000,
        );
      } catch {
        /* la página ya se cerró (p. ej. por un tiempo agotado): no hay subtítulo que mostrar */
      }
    },
    { auto: true },
  ],
});

/** Subtítulo numerado: «Paso 2 de 5 · …». */
export const paso = (page: Page, n: number, total: number, texto: string): Promise<void> =>
  narrar(page, `Paso ${n} de ${total} · ${texto}`);

/** Cliente de API autenticado como Ana, con el carrito vacío y sin cupón (estado de partida de cada recorrido). */
export async function clienteAna(api: ApiClient): Promise<ApiClient> {
  const sesion = (await (
    await api.login(USUARIOS.cliente.email, USUARIOS.cliente.password)
  ).json()) as Sesion;
  const cliente = api.conToken(sesion.token);
  const carrito = (await (await cliente.carrito()).json()) as { items: { productId: number }[] };
  for (const item of carrito.items) await cliente.quitarDelCarrito(item.productId);
  await cliente.quitarCupon();
  return cliente;
}

/** Escribe en el formulario de checkout campo por campo, con teclas visibles. */
export async function escribirCheckout(
  checkout: CheckoutPage,
  datos: Partial<Record<CampoCheckout, string>>,
): Promise<void> {
  for (const [campo, valor] of Object.entries(datos) as [CampoCheckout, string][]) {
    await escribir(checkout.campo(campo), valor);
  }
}

/** Datos válidos de envío y pago en el formato del formulario. */
export const DATOS_VALIDOS: Record<CampoCheckout, string> = {
  nombre: ENVIO_VALIDO.nombre,
  email: ENVIO_VALIDO.email,
  direccion: ENVIO_VALIDO.direccion,
  telefono: ENVIO_VALIDO.telefono,
  tarjeta: PAGO_VALIDO.tarjeta,
  vencimiento: PAGO_VALIDO.vencimiento,
  cvv: PAGO_VALIDO.cvv,
};

/**
 * Agrupa aserciones "soft" de un paso: si alguna falla, muestra EN ESE MOMENTO un aviso de defecto detectado
 * (y el recorrido continúa); si todas pasan, muestra una confirmación breve.
 */
export async function comprobar(
  page: Page,
  info: TestInfo,
  que: string,
  verificaciones: () => Promise<void>,
): Promise<void> {
  const antes = info.errors.length;
  await verificaciones();
  if (info.errors.length > antes) {
    const lineas = sinColor(info.errors[info.errors.length - 1]?.message ?? '')
      .split('\n')
      .map((l) => l.trim());
    const detalle = [
      lineas.find((l) => l.startsWith('Expected')),
      lineas.find((l) => l.startsWith('Received')),
    ]
      .filter(Boolean)
      .join('  ·  ');
    await narrar(page, `DEFECTO DETECTADO — ${que}${detalle ? `: ${detalle}` : ''}`, 'error', 3500);
  } else {
    await narrar(page, `Correcto — ${que}`, 'ok', 900);
  }
}
