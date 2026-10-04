import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly titulo: Locator;
  readonly correo: Locator;
  readonly contrasena: Locator;
  readonly botonIngresar: Locator;
  readonly errorCorreo: Locator;
  readonly errorContrasena: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Iniciar sesión' });
    this.correo = page.getByLabel('Correo electrónico');
    this.contrasena = page.getByLabel('Contraseña');
    this.botonIngresar = page.getByRole('button', { name: 'Ingresar' });
    this.errorCorreo = page.locator('#error-email');
    this.errorContrasena = page.locator('#error-password');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/#/login');
  }

  async iniciarSesion(email: string, password: string): Promise<void> {
    await this.correo.fill(email);
    await this.contrasena.fill(password);
    await this.botonIngresar.click();
  }
}
