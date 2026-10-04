import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { DatosEnvio, DatosPago } from '../support/tipos';

export type CampoCheckout = 'nombre' | 'email' | 'direccion' | 'telefono' | 'tarjeta' | 'vencimiento' | 'cvv';

const ETIQUETAS: Record<CampoCheckout, string> = {
  nombre: 'Nombre completo',
  email: 'Correo electrónico',
  direccion: 'Dirección de entrega',
  telefono: 'Teléfono (8 dígitos)',
  tarjeta: 'Número de tarjeta',
  vencimiento: 'Vencimiento (MM/AA)',
  cvv: 'CVV',
};

export class CheckoutPage extends BasePage {
  readonly titulo: Locator;
  readonly botonPagar: Locator;
  readonly total: Locator;
  /** Localizador ESTRICTO por etiqueta accesible (lo usa la prueba del defecto BUG-004). */
  readonly direccionPorEtiqueta: Locator;
  readonly confirmacion: Locator;
  readonly numeroPedido: Locator;
  readonly totalPedido: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Finalizar compra' });
    this.botonPagar = page.getByRole('button', { name: 'Pagar ahora' });
    this.total = page.getByTestId('total');
    this.direccionPorEtiqueta = page.getByLabel(ETIQUETAS.direccion);
    this.confirmacion = page.getByRole('heading', { name: '¡Pedido confirmado!' });
    this.numeroPedido = page.getByTestId('order-id');
    this.totalPedido = page.getByTestId('order-total');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/#/checkout');
  }

  /**
   * Campo del formulario. Se localiza por etiqueta; para "dirección" se cae al id para que el
   * resto de las pruebas no dependa del defecto BUG-004 (la etiqueta faltante).
   */
  campo(nombre: CampoCheckout): Locator {
    const porEtiqueta = this.page.getByLabel(ETIQUETAS[nombre]);
    return nombre === 'direccion' ? porEtiqueta.or(this.page.locator('#direccion')) : porEtiqueta;
  }

  mensajeError(nombre: CampoCheckout): Locator {
    return this.page.locator(`#error-${nombre}`);
  }

  async completar(envio: Partial<DatosEnvio>, pago: Partial<DatosPago>): Promise<void> {
    const valores: Partial<Record<CampoCheckout, string | undefined>> = { ...envio, ...pago };
    for (const nombre of Object.keys(ETIQUETAS) as CampoCheckout[]) {
      const valor = valores[nombre];
      if (valor !== undefined) await this.campo(nombre).fill(valor);
    }
  }

  async pagar(): Promise<void> {
    await this.botonPagar.click();
  }
}
