import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { aNumero } from '../support/dinero';

export class CartPage extends BasePage {
  readonly titulo: Locator;
  readonly filas: Locator;
  readonly vacio: Locator;
  readonly campoCupon: Locator;
  readonly botonCupon: Locator;
  readonly subtotal: Locator;
  readonly descuento: Locator;
  readonly total: Locator;
  readonly botonPagar: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Tu carrito' });
    this.filas = page.getByTestId('cart-row');
    this.vacio = page.getByTestId('cart-empty');
    this.campoCupon = page.getByLabel('Cupón de descuento');
    this.botonCupon = page.getByRole('button', { name: 'Aplicar cupón' });
    this.subtotal = page.getByTestId('subtotal');
    this.descuento = page.getByTestId('discount');
    this.total = page.getByTestId('total');
    this.botonPagar = page.getByRole('link', { name: 'Proceder al pago' });
  }

  async abrir(): Promise<void> {
    await this.page.goto('/#/carrito');
  }

  fila(nombre: string): Locator {
    return this.filas.filter({ hasText: nombre });
  }

  cantidad(nombre: string): Locator {
    return this.page.getByLabel(`Cantidad de ${nombre}`);
  }

  async cambiarCantidad(nombre: string, cantidad: number): Promise<void> {
    const campo = this.cantidad(nombre);
    await campo.fill(String(cantidad));
    await campo.blur(); // dispara el evento "change"
  }

  async eliminar(nombre: string): Promise<void> {
    await this.page.getByRole('button', { name: `Eliminar ${nombre} del carrito` }).click();
  }

  async aplicarCupon(codigo: string): Promise<void> {
    await this.campoCupon.fill(codigo);
    await this.botonCupon.click();
  }

  async montoTotal(): Promise<number> {
    return aNumero(await this.total.innerText());
  }
}
