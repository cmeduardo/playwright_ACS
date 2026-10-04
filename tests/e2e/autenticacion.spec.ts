import { test, expect } from '../fixtures';
import { meta } from '../support/meta';
import { USUARIOS } from '../support/env';

test(
  'CP-E2E-002 Autenticación y control de acceso: credenciales, bloqueo, roles, cierre de sesión',
  {
    tag: ['@smoke', '@regression'],
    annotation: meta({
      epica: 'Autenticación',
      feature: 'Inicio de sesión y permisos',
      req: 'RF-01, RF-02, RF-08, RNF-03',
      severidad: 'blocker',
    }),
  },
  async ({ page, clienteNuevo, loginPage, catalogPage, adminPage }) => {
    test.setTimeout(90_000);
    await loginPage.abrir();

    await test.step('1. Contraseña incorrecta: se rechaza con un mensaje', async () => {
      await loginPage.iniciarSesion(USUARIOS.cliente.email, 'ClaveIncorrecta1!');
      await expect(loginPage.alerta('Credenciales inválidas')).toBeVisible();
      await expect(loginPage.titulo).toBeVisible();
    });

    await test.step('2. Formulario vacío: validaciones por campo', async () => {
      await loginPage.correo.fill('');
      await loginPage.contrasena.fill('');
      await loginPage.botonIngresar.click();
      await expect(loginPage.errorCorreo).toHaveText('Ingresa un correo válido');
      await expect(loginPage.errorContrasena).toHaveText('La contraseña es obligatoria');
    });

    await test.step('3. Usuario bloqueado: no puede entrar aunque la contraseña sea correcta', async () => {
      await loginPage.iniciarSesion(USUARIOS.bloqueado.email, USUARIOS.bloqueado.password);
      await expect(loginPage.alerta('Usuario bloqueado')).toBeVisible();
    });

    await test.step('4. Cliente válido: entra al catálogo', async () => {
      await loginPage.iniciarSesion(clienteNuevo.email, clienteNuevo.password);
      await expect(catalogPage.titulo).toBeVisible();
      await expect(loginPage.nombreUsuario).toContainText('Cliente QA');
    });

    await test.step('5. Un cliente no puede abrir el panel de administración', async () => {
      await adminPage.abrir();
      await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
      await expect(adminPage.titulo).toBeHidden();
    });

    await test.step('6. Cerrar sesión: vuelve al login y se oculta el carrito', async () => {
      await loginPage.cerrarSesion();
      await expect(loginPage.titulo).toBeVisible();
      await expect(loginPage.contadorCarrito).toBeHidden();
    });

    await test.step('7. Sin sesión, una ruta protegida redirige al login con aviso', async () => {
      await page.goto('/#/pedidos');
      await expect(loginPage.titulo).toBeVisible();
      await expect(loginPage.aviso('Inicia sesión para continuar')).toBeVisible();
    });

    await test.step('8. El administrador sí accede al panel', async () => {
      await loginPage.iniciarSesion(USUARIOS.admin.email, USUARIOS.admin.password);
      await expect(adminPage.titulo).toBeVisible();
      await expect(loginPage.nombreUsuario).toContainText('admin');
    });
  },
);
