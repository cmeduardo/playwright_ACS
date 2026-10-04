import type { Page } from '@playwright/test';
import type { Sesion } from './tipos';

/** Siembra la sesión (token y usuario) en el navegador y recarga, como si la persona ya hubiera iniciado sesión. */
export async function sembrarSesion(page: Page, sesion: Sesion): Promise<void> {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, sesion);
  await page.reload();
}

/** Deja el navegador sin sesión (como un visitante) y recarga. */
export async function cerrarSesionLocal(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
