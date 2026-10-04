import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { USUARIOS } from '../support/env';
import { ESQUEMA_SESION, ESQUEMA_USUARIO, validarEsquema } from '../support/esquemas';

test(
  'CP-API-001 Autenticación: login, registro, token y cierre de sesión',
  {
    tag: ['@api', '@smoke', '@regression'],
    annotation: meta({
      epica: 'API',
      feature: 'Autenticación',
      req: 'RF-01, RF-02, RNF-03',
      severidad: 'blocker',
    }),
  },
  async ({ api, clienteApi, clienteNuevo }) => {
    await test.step('Login válido: 200, esquema, rol y formato del token', async () => {
      const res = await api.login(USUARIOS.cliente.email, USUARIOS.cliente.password);
      expect(res.status()).toBe(200);
      const cuerpo = await res.json();
      validarEsquema(cuerpo, ESQUEMA_SESION, 'sesion');
      validarEsquema(cuerpo.user, ESQUEMA_USUARIO, 'sesion.user');
      expect(cuerpo.user.role).toBe('cliente');
      expect(cuerpo.token).toMatch(/^[0-9a-f]{48}$/);
      expect(cuerpo.user).not.toHaveProperty('password_hash');
    });

    await test.step('Credenciales inválidas 401, usuario bloqueado 403, datos vacíos 400', async () => {
      expect((await api.login(USUARIOS.cliente.email, 'incorrecta')).status()).toBe(401);
      expect((await api.login(USUARIOS.bloqueado.email, USUARIOS.bloqueado.password)).status()).toBe(403);
      expect((await api.login('', '')).status()).toBe(400);
    });

    await test.step('Registro: 201 con rol cliente, duplicado 409 y datos inválidos 400', async () => {
      expect(clienteNuevo.user.role).toBe('cliente');
      expect((await api.registrar('Otro', clienteNuevo.email, 'Prueba123!')).status()).toBe(409);
      expect((await api.registrar('', 'no-es-correo', '123')).status()).toBe(400);
    });

    await test.step('/me exige token y devuelve el usuario autenticado', async () => {
      expect((await api.yo()).status()).toBe(401);
      const res = await clienteApi.yo();
      expect(res.status()).toBe(200);
      expect((await res.json()).email).toBe(clienteNuevo.email);
    });

    await test.step('Tras cerrar sesión el token deja de ser válido', async () => {
      expect((await clienteApi.logout()).status()).toBe(204);
      expect((await clienteApi.yo()).status()).toBe(401);
    });
  },
);
