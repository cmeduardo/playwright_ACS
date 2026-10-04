# 06 — Guía de pruebas

> Entrada del proceso de pruebas. Reúne las convenciones del equipo, las buenas prácticas, lo que **no se tolera** y el procedimiento para agregar un test nuevo.

## 1. Estructura del repositorio de pruebas

```text
tests/
├── e2e/            7 casos funcionales de UI (compra, autenticación, catálogo, carrito, checkout, admin, pedidos)
├── data-driven/    3 casos dirigidos por datos (test-data/*.json y *.csv): cada fila es un paso
├── api/            5 casos de API con `request` + 1 de integración API + UI
├── network/        1 caso de mocking e interceptación de red (page.route)
├── visual/         1 caso de regresión visual (toHaveScreenshot)
├── a11y/           1 caso de accesibilidad (axe-core)
├── mobile/         2 casos responsive (Pixel 7 e iPhone 14)
├── bugs/           4 casos de detección de defectos intencionales
├── recorridos/     10 recorridos para ver el navegador trabajando (solo con RECORRIDOS=1)
├── pages/          Page Objects = componentes de prueba
├── fixtures/       Fixtures personalizadas (`test` y `expect` que se importan en los specs)
├── support/        Cliente de API, metadatos, datos, esquemas, utilidades de a11y
├── reporters/      Reporter de bitácora, informes, defectos y dashboard
└── global-setup.ts Reinicio de BD y `storageState`
```

## 2. Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo de prueba | `<módulo>.spec.ts`; datos dirigidos: `*.dd.spec.ts`; API: `*.api.spec.ts` | `carrito.spec.ts`, `datos.dd.spec.ts` |
| **ID del caso** | `CP-<ÁREA>-<NNN>` al inicio del título | `CP-E2E-004`, `CP-DEF-001` |
| Título | ID + frase en español que describe el **escenario completo** | `CP-E2E-004 Carrito y cupones: cantidades, eliminación y reglas de cada cupón` |
| Pasos | `test.step('N. Qué se hace y qué se espera', …)` dentro del caso | `1. Agregar dos productos desde el catálogo` |
| Defecto detectado | `[detecta BUG-00X]` en el título y annotation `defecto` | `CP-DEF-002 Cantidades inválidas… [detecta BUG-002]` |
| Page Object | `<Pantalla>Page` (clase) en `tests/pages/` | `CheckoutPage` |
| Métodos y locators | Español, verbos para acciones y sustantivos para locators | `aplicarCupon()`, `botonPagar` |
| Fixtures | Sustantivos en camelCase | `clienteNuevo`, `carritoUI` |
| Datos | Un archivo por conjunto en `test-data/`, con `id` por fila | `cupones.csv` |

Áreas de ID: `E2E`, `DD`, `API`, `INT`, `RED`, `VIS`, `A11Y`, `MOV` y `DEF`. **Criterio del proyecto:** pocos casos (25) pero completos: cada caso es un escenario de negocio con varios pasos y varios datos, no una verificación suelta.

## 3. Etiquetas

Se declaran en el segundo argumento de `test()` con `tag: [...]` y se ejecutan con `--grep`.

| Etiqueta | Significado | Comando |
|---|---|---|
| `@smoke` | Camino crítico; debe pasar siempre (aceptación rápida) | `npm run test:smoke` |
| `@regression` | Todo lo que se vuelve a ejecutar tras un cambio (todos los casos) | `npm run test:regression` |
| `@api` | Pruebas de API | `npm run test:api` |
| `@visual` | Regresión visual | `npm run test:visual` |
| `@a11y` | Accesibilidad | `npm run test:a11y` |
| `@mobile` | Viewport móvil | `npm run test:mobile` |

## 4. Trazabilidad por annotations: `meta()`

Cada test debe declarar su requerimiento, severidad, épica y feature. Esa información la leen Allure, la bitácora y el generador de documentos.

```ts
import { test, expect } from '../fixtures';
import { meta } from '../support/meta';

test('CP-E2E-004 Carrito y cupones: cantidades, eliminación y reglas de cada cupón', {
  tag: ['@regression'],
  annotation: meta({
    epica: 'Compra',
    feature: 'Carrito y cupones',
    req: 'RF-05, RF-06',      // ver docs/03
    severidad: 'critical',   // blocker | critical | normal | minor | trivial
    // defecto: 'BUG-001',   // solo si el caso detecta un defecto conocido
  }),
}, async ({ paginaCliente, catalogPage, cartPage }) => {
  await test.step('1. Agregar dos productos desde el catálogo', async () => {
    // ...
  });
});
```

## 5. Buenas prácticas

1. **Locators por rol, etiqueta o `data-testid`**: `getByRole('button', { name: 'Pagar ahora' })`, `getByLabel('Correo electrónico')`, `getByTestId('cart-count')`.
2. **Aserciones web-first** (`await expect(locator).toBeVisible()`), que reintentan hasta cumplirse o agotar el tiempo. No se leen valores para comparar de inmediato.
3. **Auto-waiting**: Playwright espera a que el elemento sea visible, estable, habilitado y reciba eventos antes de actuar.
4. **Un caso, un escenario de negocio**: el caso recorre un flujo completo en pasos (`test.step`) con nombre claro, de modo que el reporte indica exactamente en qué paso falló. Para varios fallos en un mismo caso se usan aserciones *soft* (`expect.soft`).
5. **Independencia**: cada test crea sus datos con fixtures (`clienteNuevo`) y funciona solo, en paralelo y en cualquier orden.
6. **Preparar por API, verificar por UI**: el estado inicial se crea por API (rápido y estable) y la UI se usa solo para lo que se prueba.
7. **Page Objects sin aserciones de negocio**: exponen locators y acciones; las aserciones se escriben en el test.
8. **Datos externos en `test-data/`**, no incrustados en el test, cuando hay varias variantes.
9. **Mensajes y resultados esperados en español**, tal como los ve el usuario.
10. **Usar `test.step`** para agrupar pasos largos y mejorar los reportes.
11. **Simular red con `page.route`** en lugar de depender de servicios externos o de fallos reales.
12. **Dejar los datos como estaban**: lo que un test crea de forma compartida (productos) se elimina al final.
13. **Revisar siempre con ambos modos**: un test nuevo debe pasar con `BUGS=off`; si detecta un defecto, debe fallar con `BUGS=on`.

## 6. Qué no se tolera

| Prohibido | Por qué | Alternativa |
|---|---|---|
| `page.waitForTimeout(…)`, `sleep` y esperas fijas | Hace los tests lentos e inestables. **ESLint lo bloquea** | Aserciones web-first y auto-waiting; esperar una respuesta o un evento concreto |
| Selectores frágiles: XPath largos, clases CSS de estilo, `nth-child` | Se rompen con cambios de diseño | `getByRole`, `getByLabel`, `getByTestId` |
| Tests que dependen de otros o del orden de ejecución | No se pueden paralelizar | Fixtures que preparan su propio estado |
| Datos compartidos y mutables entre tests | Provoca fallos intermitentes | Un cliente por prueba; nombres únicos |
| Reiniciar la BD en medio de la ejecución | Borra las sesiones de los demás tests | Solo se reinicia en `global-setup.ts` |
| `test.only` y `test.skip` sin justificación | Oculta fallos (`forbidOnly` falla en CI) | Corregir o documentar el motivo en [10](10-solicitud-de-cambios.md) |
| Aserciones débiles (`toBeTruthy` para todo) | No detectan defectos | Valores concretos: texto, estado HTTP, esquema |
| Sitios externos o servicios de terceros | No son deterministas | Mocking con `page.route` |
| Capturas de pantalla sin datos controlados | Falsos fallos visuales | Datos congelados (mock) y `animations: 'disabled'` |
| Credenciales reales o datos personales | Seguridad y privacidad | Datos sintéticos de `db/seed.sql` |

## 7. Cómo agregar pruebas (paso a paso)

Con 25 casos completos, lo habitual es **agregar un paso o una fila de datos a un caso existente**; solo se crea un caso nuevo para un escenario de negocio distinto.

### 7.1 Agregar un paso a un caso existente

**Ejemplo:** comprobar que el cupón `VERANO20` descuenta Q24 sobre un Mouse Inalámbrico (Q120) dentro de `CP-E2E-004`.

1. Abre `tests/e2e/carrito.spec.ts` y ubica el caso (`CP-E2E-004`).
2. Agrega un `test.step` con un nombre que diga qué se hace y qué se espera:

```ts
await test.step('9. VERANO20 descuenta el 20 % del subtotal', async () => {
  await catalogPage.irA('Catálogo');
  await catalogPage.agregarAlCarrito('Mouse Inalámbrico');
  await catalogPage.irA('Carrito');
  await cartPage.aplicarCupon('VERANO20');
  await expect(cartPage.descuento).toHaveText('-Q24.00');
});
```

3. Si el paso usa locators nuevos, agrégalos al Page Object de `tests/pages/` (no escribas selectores en el test).
4. Actualiza los **pasos** y el **resultado esperado** del caso en `test-data/casos-detalle.json`.
5. Verifica y regenera: `npm run typecheck && npm run lint`, `BUGS=off npx playwright test -g "CP-E2E-004"` (y con `BUGS=on` si detecta un defecto) y `npm run docs:casos`.

### 7.2 Agregar una fila de datos

Agrega una línea al JSON/CSV de `test-data/` (p. ej. otro cupón en `cupones.csv`): el caso dirigido por datos (`CP-DD-003`) la ejecuta como un paso más y, si falla, la reporta por su ID.

### 7.3 Crear un caso nuevo (solo si es un escenario distinto)

1. Elige el requerimiento ([03](03-requerimientos-y-trazabilidad.md)) y el siguiente ID libre de su área (p. ej. `CP-E2E-008`).
2. Escríbelo en el archivo de su módulo (o crea `tests/<carpeta>/<modulo>.spec.ts`; la carpeta determina en qué proyectos corre) importando `test` y `expect` de `../fixtures`, no de `@playwright/test`.
3. Declara `tag` y `meta()` completos.
4. Agrega su detalle en `test-data/casos-detalle.json` con el mismo ID: si falta, `npm run docs:casos` falla.
5. Verifica, regenera los documentos con `npm run docs:casos`, **registra el cambio** en [11](11-actualizacion-documentos.md) y haz commit.

## 8. Ejecución y depuración

| Objetivo | Comando |
|---|---|
| Suite completa | `npm test` |
| Un caso por ID | `npx playwright test -g "CP-E2E-004"` |
| Un archivo / un navegador | `npx playwright test tests/e2e/carrito.spec.ts --project=chromium` |
| Ver el navegador | `npm run test:headed` |
| Modo UI (línea de tiempo, selector de locators) | `npm run test:ui` |
| Depurar paso a paso | `npx playwright test -g "CP-E2E-004" --debug` |
| Grabar un test con codegen | `npm run codegen` (con la app levantada en 3100) |
| Abrir la traza de un fallo | `npx playwright show-trace <ruta>/trace.zip` |
| Modo sin defectos | `BUGS=off npm test` (Linux/macOS) · `$env:BUGS="off"; npm test` (PowerShell) |

> No pases `--reporter=…` en la línea de comandos si quieres la bitácora y los informes: sobrescribe los reporteres de `playwright.config.ts`.

## 9. Revisión de código (lista de verificación)
- [ ] El título empieza con el ID y describe el resultado esperado.
- [ ] Tiene `tag` y `meta()` completos con el requerimiento correcto.
- [ ] No hay esperas fijas ni selectores frágiles.
- [ ] Es independiente (fixtures) y no deja datos compartidos modificados.
- [ ] Usa Page Objects y datos externos cuando corresponde.
- [ ] Pasa con `BUGS=off` (y falla con `BUGS=on` si detecta un defecto).
- [ ] `npm run typecheck`, `npm run lint` y `npm run format` sin cambios pendientes.
- [ ] Documentos regenerados y versión registrada.
