import type { Locator, Page } from '@playwright/test';

/** Elementos comunes a todas las pantallas (barra superior y mensajes). */
export abstract class BasePage {
  readonly menuToggle: Locator;
  readonly contadorCarrito: Locator;
  readonly nombreUsuario: Locator;
  readonly botonCerrarSesion: Locator;

  constructor(protected readonly page: Page) {
    this.menuToggle = page.getByRole('button', { name: /(Abrir|Cerrar) menú/ });
    this.contadorCarrito = page.getByTestId('cart-count');
    this.nombreUsuario = page.getByTestId('user-name');
    this.botonCerrarSesion = page.getByRole('button', { name: 'Cerrar sesión' });
  }

  /** Alerta (role=alert) que contiene el texto indicado. */
  alerta(texto: string | RegExp): Locator {
    return this.page.getByRole('alert').filter({ hasText: texto });
  }

  /** Aviso temporal (role=status) que contiene el texto indicado. */
  aviso(texto: string | RegExp): Locator {
    return this.page.getByRole('status').filter({ hasText: texto });
  }

  /** En viewport móvil el menú está colapsado: se abre solo si el botón hamburguesa es visible. */
  async abrirMenuSiEsMovil(): Promise<void> {
    if (await this.menuToggle.isVisible()) {
      if ((await this.menuToggle.getAttribute('aria-expanded')) !== 'true') await this.menuToggle.click();
    }
  }

  async irA(enlace: 'Catálogo' | 'Carrito' | 'Mis pedidos' | 'Admin' | 'Iniciar sesión'): Promise<void> {
    await this.abrirMenuSiEsMovil();
    await this.page.getByRole('link', { name: new RegExp(`^${enlace}`) }).click();
  }

  async cerrarSesion(): Promise<void> {
    await this.abrirMenuSiEsMovil();
    await this.botonCerrarSesion.click();
  }
}
