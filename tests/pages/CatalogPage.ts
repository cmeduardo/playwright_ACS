import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { aNumero } from '../support/dinero';

export class CatalogPage extends BasePage {
  readonly titulo: Locator;
  readonly buscador: Locator;
  readonly botonBuscar: Locator;
  readonly categoria: Locator;
  readonly precioMaximo: Locator;
  readonly orden: Locator;
  readonly tarjetas: Locator;
  readonly contadorResultados: Locator;
  readonly estadoVacio: Locator;
  readonly errorCatalogo: Locator;
  readonly botonReintentar: Locator;
  readonly cargando: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Catálogo de productos' });
    this.buscador = page.getByLabel('Buscar productos');
    this.botonBuscar = page.getByRole('button', { name: 'Buscar', exact: true });
    this.categoria = page.getByLabel('Categoría');
    this.precioMaximo = page.getByLabel('Precio máximo (Q)');
    this.orden = page.getByLabel('Ordenar por');
    this.tarjetas = page.getByTestId('product-card');
    this.contadorResultados = page.getByTestId('result-count');
    this.estadoVacio = page.getByTestId('empty-state');
    this.errorCatalogo = page.getByTestId('catalog-error');
    this.botonReintentar = page.getByRole('button', { name: 'Reintentar' });
    this.cargando = page.getByText('Cargando productos…');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/#/catalogo');
  }

  async buscar(texto: string): Promise<void> {
    await this.buscador.fill(texto);
    await this.botonBuscar.click();
  }

  tarjeta(nombre: string): Locator {
    return this.tarjetas.filter({ has: this.page.getByRole('heading', { name: nombre }) });
  }

  async agregarAlCarrito(nombre: string): Promise<void> {
    await this.page.getByRole('button', { name: `Agregar ${nombre} al carrito` }).click();
  }

  /** Precios (Q) de todas las tarjetas visibles. */
  async precios(): Promise<number[]> {
    const textos = await this.tarjetas.locator('.price').allTextContents();
    return textos.map(aNumero);
  }
}
