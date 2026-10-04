import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface DatosProductoForm {
  nombre: string;
  descripcion?: string;
  precio: string;
  categoria: string;
  stock: string;
}

export class AdminPage extends BasePage {
  readonly titulo: Locator;
  readonly filas: Locator;
  readonly formNombre: Locator;
  readonly formDescripcion: Locator;
  readonly formPrecio: Locator;
  readonly formCategoria: Locator;
  readonly formStock: Locator;
  readonly botonGuardar: Locator;
  readonly dialogoConfirmacion: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Panel de administración' });
    this.filas = page.getByTestId('admin-row');
    this.formNombre = page.getByLabel('Nombre', { exact: true });
    this.formDescripcion = page.getByLabel('Descripción');
    this.formPrecio = page.getByLabel('Precio (Q)');
    this.formCategoria = page.getByLabel('Categoría');
    this.formStock = page.getByLabel('Stock');
    this.botonGuardar = page.getByRole('button', { name: 'Guardar producto' });
    this.dialogoConfirmacion = page.getByRole('dialog');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/#/admin');
  }

  fila(nombre: string): Locator {
    return this.filas.filter({ hasText: nombre });
  }

  async llenarFormulario(d: Partial<DatosProductoForm>): Promise<void> {
    if (d.nombre !== undefined) await this.formNombre.fill(d.nombre);
    if (d.descripcion !== undefined) await this.formDescripcion.fill(d.descripcion);
    if (d.precio !== undefined) await this.formPrecio.fill(d.precio);
    if (d.categoria !== undefined) await this.formCategoria.fill(d.categoria);
    if (d.stock !== undefined) await this.formStock.fill(d.stock);
  }

  async crear(d: DatosProductoForm): Promise<void> {
    await this.llenarFormulario(d);
    await this.botonGuardar.click();
  }

  async editar(nombre: string, cambios: Partial<DatosProductoForm>): Promise<void> {
    await this.page.getByRole('button', { name: `Editar ${nombre}` }).click();
    await this.llenarFormulario(cambios);
    await this.botonGuardar.click();
  }

  async pedirEliminacion(nombre: string): Promise<void> {
    await this.page.getByRole('button', { name: `Eliminar ${nombre}` }).click();
  }

  async eliminar(nombre: string): Promise<void> {
    await this.pedirEliminacion(nombre);
    await this.dialogoConfirmacion.getByRole('button', { name: 'Confirmar eliminación' }).click();
  }
}
