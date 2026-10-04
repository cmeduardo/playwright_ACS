# 03 — Requerimientos y trazabilidad

> Entrada del proceso de pruebas. La trazabilidad **Requerimiento → Caso → Script** se genera automáticamente con `npm run docs:casos` a partir de las annotations de los tests; no se edita a mano.

## 1. Requerimientos funcionales (RF)

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-01 | El usuario puede **iniciar sesión** con correo y contraseña. | Credenciales válidas entran al sistema (cliente → catálogo, admin → panel). Credenciales inválidas muestran «Credenciales inválidas». Un usuario bloqueado no entra. Los campos vacíos o con formato inválido muestran validación. | Alta |
| RF-02 | El usuario puede **cerrar sesión**. | Tras cerrar sesión se muestra el login y el token deja de ser válido (la API responde 401). | Alta |
| RF-03 | El visitante puede ver el **catálogo** y **buscar** productos. | Se listan los productos; la búsqueda ignora mayúsculas y tildes y acepta `ñ`, tildes y comillas sin errores; si no hay coincidencias se muestra un estado vacío. | Alta |
| RF-04 | El visitante puede **filtrar y ordenar** el catálogo. | Filtro por categoría y precio máximo; orden por precio y nombre. | Media |
| RF-05 | El cliente administra su **carrito**: agregar, cambiar cantidad y eliminar. | Totales correctos; cantidad entera entre 1 y 99; no se supera el stock; requiere sesión. | Alta |
| RF-06 | El cliente puede aplicar **cupones de descuento**. | BIENVENIDO10 (10 %), VERANO20 (20 %), FIJO50 (Q50 con compra mínima de Q200). Cupón inexistente o expirado se rechaza. El descuento porcentual es exacto en cualquier monto. | Alta |
| RF-07 | El cliente realiza el **checkout** con un formulario validado. | Campos obligatorios y formatos válidos (teléfono de 8 dígitos, tarjeta de 16, vencimiento MM/AA vigente, CVV de 3). Pago aprobado crea el pedido, vacía el carrito y descuenta el stock; tarjeta terminada en 0002 se rechaza con 402. | Alta |
| RF-08 | El administrador gestiona productos (**CRUD**). | Crear, editar y eliminar (con confirmación) con validaciones; un cliente no puede acceder. | Alta |
| RF-09 | El cliente consulta su **historial de pedidos**. | Se listan solo sus pedidos con productos, total y estado; sin pedidos se muestra un mensaje. | Media |

## 2. Requerimientos no funcionales (RNF)

| ID | Atributo | Requerimiento | Criterio de aceptación | Cobertura |
|---|---|---|---|---|
| RNF-01 | Compatibilidad | La aplicación funciona en Chromium, Firefox, WebKit y viewports móviles. | La suite web pasa en los 3 motores y las pruebas móviles en Pixel 7 e iPhone 14. | Transversal: cada caso web se ejecuta en 3 motores (ver [01](01-plan-de-pruebas.md) §6.4) |
| RNF-02 | Resiliencia | La interfaz maneja fallos de la API sin romperse. | Ante 500 se muestra un error con «Reintentar»; con respuesta lenta, un indicador de carga; con datos vacíos, un estado vacío. | CP-RED-001 |
| RNF-03 | Seguridad de acceso | Autenticación por token y autorización por rol. | Sin token → 401; cliente en operaciones de admin → 403; un cliente no ve pedidos ajenos (404); rutas protegidas redirigen al login. | CP-API-001, 003, 004 y 005; CP-E2E-002 y CP-E2E-007 |
| RNF-04 | Usabilidad y consistencia visual | Diseño responsive y apariencia estable. | Menú hamburguesa en móvil, sin desbordamiento horizontal; sin diferencias respecto a la línea base visual. | CP-MOV-001 y 002, CP-VIS-001 |
| RNF-05 | Accesibilidad | Cumple WCAG 2.1 niveles A y AA. | 0 violaciones de axe-core en login, catálogo, carrito, checkout y panel admin; todos los campos tienen etiqueta. | CP-A11Y-001, CP-DEF-004 |

> **Nota:** RNF-01 se cubre de forma transversal y no tiene casos propios: lo verifica la matriz de ejecución, no un caso individual.

## 3. Defectos intencionales y requerimientos que violan

| Defecto | Requerimiento violado | Descripción breve |
|---|---|---|
| BUG-001 | RF-06 | Cupón porcentual con descuento doble desde Q500 |
| BUG-002 | RF-05 | El carrito acepta cantidades negativas |
| BUG-003 | RF-03 | Búsqueda con `ñ`, tildes o `'` devuelve error 500 |
| BUG-004 | RNF-05 | Campo «Dirección» sin `<label>` |
| BUG-005 | RNF-04 | Apariencia distinta del botón «Pagar ahora» |

Detalle en [09](09-hallazgo-de-defectos.md).

## 4. Trazabilidad

<!-- TRAZABILIDAD:INICIO -->
### Matriz Requerimiento → Casos de prueba → Scripts

| Requerimiento | Casos de prueba | N.º casos | Scripts (spec) |
|---|---|---|---|
| **RF-01** | CP-API-001, CP-DD-001, CP-E2E-001, CP-E2E-002 | 4 | `tests/api/auth.api.spec.ts`<br>`tests/data-driven/datos.dd.spec.ts`<br>`tests/e2e/autenticacion.spec.ts`<br>`tests/e2e/compra.spec.ts` |
| **RF-02** | CP-API-001, CP-E2E-002 | 2 | `tests/api/auth.api.spec.ts`<br>`tests/e2e/autenticacion.spec.ts` |
| **RF-03** | CP-API-002, CP-DEF-003, CP-E2E-001, CP-E2E-003, CP-INT-001, CP-RED-001 | 6 | `tests/api/encadenado.spec.ts`<br>`tests/api/productos.api.spec.ts`<br>`tests/bugs/defectos.spec.ts`<br>`tests/e2e/catalogo.spec.ts`<br>`tests/e2e/compra.spec.ts`<br>`tests/network/red.spec.ts` |
| **RF-04** | CP-API-002, CP-E2E-003 | 2 | `tests/api/productos.api.spec.ts`<br>`tests/e2e/catalogo.spec.ts` |
| **RF-05** | CP-API-004, CP-DEF-002, CP-E2E-001, CP-E2E-004, CP-RED-001 | 5 | `tests/api/carrito.api.spec.ts`<br>`tests/bugs/defectos.spec.ts`<br>`tests/e2e/carrito.spec.ts`<br>`tests/e2e/compra.spec.ts`<br>`tests/network/red.spec.ts` |
| **RF-06** | CP-API-004, CP-DD-003, CP-DEF-001, CP-E2E-001, CP-E2E-004 | 5 | `tests/api/carrito.api.spec.ts`<br>`tests/bugs/defectos.spec.ts`<br>`tests/data-driven/datos.dd.spec.ts`<br>`tests/e2e/carrito.spec.ts`<br>`tests/e2e/compra.spec.ts` |
| **RF-07** | CP-API-005, CP-DD-002, CP-E2E-001, CP-E2E-005, CP-MOV-002 | 5 | `tests/api/pedidos.api.spec.ts`<br>`tests/data-driven/datos.dd.spec.ts`<br>`tests/e2e/checkout.spec.ts`<br>`tests/e2e/compra.spec.ts`<br>`tests/mobile/movil.spec.ts` |
| **RF-08** | CP-API-003, CP-E2E-002, CP-E2E-006, CP-INT-001 | 4 | `tests/api/administracion.api.spec.ts`<br>`tests/api/encadenado.spec.ts`<br>`tests/e2e/administracion.spec.ts`<br>`tests/e2e/autenticacion.spec.ts` |
| **RF-09** | CP-API-005, CP-E2E-001, CP-E2E-007 | 3 | `tests/api/pedidos.api.spec.ts`<br>`tests/e2e/compra.spec.ts`<br>`tests/e2e/pedidos.spec.ts` |
| **RNF-02** | CP-RED-001 | 1 | `tests/network/red.spec.ts` |
| **RNF-03** | CP-API-001, CP-API-003, CP-API-004, CP-API-005, CP-E2E-002, CP-E2E-007, CP-RED-001 | 7 | `tests/api/administracion.api.spec.ts`<br>`tests/api/auth.api.spec.ts`<br>`tests/api/carrito.api.spec.ts`<br>`tests/api/pedidos.api.spec.ts`<br>`tests/e2e/autenticacion.spec.ts`<br>`tests/e2e/pedidos.spec.ts`<br>`tests/network/red.spec.ts` |
| **RNF-04** | CP-MOV-001, CP-MOV-002, CP-VIS-001 | 3 | `tests/mobile/movil.spec.ts`<br>`tests/visual/visual.spec.ts` |
| **RNF-05** | CP-A11Y-001, CP-DEF-004 | 2 | `tests/a11y/accesibilidad.spec.ts`<br>`tests/bugs/defectos.spec.ts` |

### Cobertura inversa: Script → Casos

| Script | Casos | Tipo |
|---|---|---|
| `tests/a11y/accesibilidad.spec.ts` | CP-A11Y-001 | Accesibilidad |
| `tests/api/administracion.api.spec.ts` | CP-API-003 | API |
| `tests/api/auth.api.spec.ts` | CP-API-001 | API |
| `tests/api/carrito.api.spec.ts` | CP-API-004 | API |
| `tests/api/encadenado.spec.ts` | CP-INT-001 | Integración (API + UI) |
| `tests/api/pedidos.api.spec.ts` | CP-API-005 | API |
| `tests/api/productos.api.spec.ts` | CP-API-002 | API |
| `tests/bugs/defectos.spec.ts` | 4 (CP-DEF-001 … CP-DEF-004) | Detección de defecto |
| `tests/data-driven/datos.dd.spec.ts` | 3 (CP-DD-001 … CP-DD-003) | Funcional (data-driven) |
| `tests/e2e/administracion.spec.ts` | CP-E2E-006 | Funcional (E2E) |
| `tests/e2e/autenticacion.spec.ts` | CP-E2E-002 | Funcional (E2E) |
| `tests/e2e/carrito.spec.ts` | CP-E2E-004 | Funcional (E2E) |
| `tests/e2e/catalogo.spec.ts` | CP-E2E-003 | Funcional (E2E) |
| `tests/e2e/checkout.spec.ts` | CP-E2E-005 | Funcional (E2E) |
| `tests/e2e/compra.spec.ts` | CP-E2E-001 | Funcional (E2E) |
| `tests/e2e/pedidos.spec.ts` | CP-E2E-007 | Funcional (E2E) |
| `tests/mobile/movil.spec.ts` | 2 (CP-MOV-001 … CP-MOV-002) | Móvil / responsive |
| `tests/network/red.spec.ts` | CP-RED-001 | Resiliencia (mocking de red) |
| `tests/visual/visual.spec.ts` | CP-VIS-001 | Regresión visual |

**Verificación automática:** todos los casos tienen al menos un requerimiento asociado; 13 requerimientos con cobertura.
<!-- TRAZABILIDAD:FIN -->

## 5. Cómo mantener la trazabilidad
1. Cada test declara su requerimiento con `meta({ req: 'RF-XX', ... })` (ver [06](06-guia-de-pruebas.md)).
2. Al agregar o cambiar casos, ejecutar `npm run docs:casos`.
3. Registrar el cambio de versión en [11](11-actualizacion-documentos.md).
