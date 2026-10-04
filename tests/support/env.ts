import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..');
export const PUERTO = Number(process.env.TEST_PORT ?? 3101);
export const BASE_URL = `http://localhost:${PUERTO}`;
export const BUGS = (process.env.BUGS ?? 'on').toLowerCase() === 'off' ? 'off' : 'on';
export const DB_PRUEBAS = path.join(ROOT, 'db', 'tienda-test.db');
export const AUTH_DIR = path.join(ROOT, '.auth');
export const AUTH_ADMIN = path.join(AUTH_DIR, 'admin.json');
export const AUTH_CLIENTE = path.join(AUTH_DIR, 'cliente.json');

export const USUARIOS = {
  admin: { email: 'admin@tiendaqa.com', password: 'Admin123!', nombre: 'Administrador QA' },
  cliente: { email: 'ana@tiendaqa.com', password: 'Cliente123!', nombre: 'Ana Morales' },
  bloqueado: { email: 'bloqueado@tiendaqa.com', password: 'Cliente123!', nombre: 'Usuario Bloqueado' },
} as const;
