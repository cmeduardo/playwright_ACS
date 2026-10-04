import fs from 'node:fs';
import { request, type FullConfig } from '@playwright/test';
import path from 'node:path';
import { AUTH_ADMIN, AUTH_CLIENTE, AUTH_DIR, BASE_URL, ROOT, USUARIOS } from './support/env';
import type { Sesion } from './support/tipos';

/** Borra el contenido de una carpeta sin eliminarla (en Docker puede ser un volumen montado). */
function vaciarCarpeta(carpeta: string): void {
  if (!fs.existsSync(carpeta)) return;
  for (const nombre of fs.readdirSync(carpeta)) {
    fs.rmSync(path.join(carpeta, nombre), { recursive: true, force: true });
  }
}

/**
 * Preparación única de la corrida:
 *  1. Reinicia la BD con schema.sql + seed.sql (datos de prueba controlados).
 *  2. Inicia sesión por API y guarda el storageState de admin y cliente (sin pasar por la UI).
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Cada corrida parte de resultados de Allure limpios (el reporte refleja solo la última ejecución).
  // (En los recorridos visuales no se tocan los resultados de la última corrida real.)
  if (!process.env.RECORRIDOS) vaciarCarpeta(path.join(ROOT, 'allure-results'));

  const api = await request.newContext({ baseURL: BASE_URL });
  const reset = await api.post('/api/test/reset');
  if (!reset.ok()) throw new Error(`No se pudo reiniciar la BD: ${reset.status()}`);

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const guardar = async (archivo: string, u: { email: string; password: string }): Promise<void> => {
    const res = await api.post('/api/auth/login', { data: { email: u.email, password: u.password } });
    const { token, user } = (await res.json()) as Sesion;
    const estado = {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: 'token', value: token },
            { name: 'user', value: JSON.stringify(user) },
          ],
        },
      ],
    };
    fs.writeFileSync(archivo, JSON.stringify(estado, null, 2));
  };
  await guardar(AUTH_ADMIN, USUARIOS.admin);
  await guardar(AUTH_CLIENTE, USUARIOS.cliente);
  await api.dispose();
}
