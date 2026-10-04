# 11 — Actualización de documentos

> Salida del proceso de pruebas. Registra las versiones de los artefactos y las reglas para mantenerlos actualizados cuando cambia el código, los requerimientos o los resultados.

## 1. Convención de versiones

`MAYOR.MENOR` (p. ej. `1.2`):
- **MAYOR**: cambio que altera el alcance o la estructura del documento.
- **MENOR**: ajuste de contenido, correcciones o regeneración de tablas.

Cada fila de la tabla de §3 documenta **qué cambió y por qué**, con fecha y responsable (rol).

## 2. Registro actual de versiones

| # | Documento | Tipo | Versión | Fecha | Origen del contenido |
|---|---|---|---|---|---|
| 00 | [Guía de funcionamiento del proyecto](00-guia-del-proyecto.md) | Guía | 2.0 | 2026-10-04 | Manual (diagramas Mermaid) |
| 01 | [Plan de pruebas](01-plan-de-pruebas.md) | Entrada | 2.0 | 2026-10-04 | Manual |
| 02 | [Casos de prueba](02-casos-de-prueba.md) + [CSV](casos-de-prueba.csv) | Entrada | 2.0 | 2026-10-04 | **Generado** (`npm run docs:casos`) |
| 03 | [Requerimientos y trazabilidad](03-requerimientos-y-trazabilidad.md) | Entrada | 2.0 | 2026-10-04 | Manual + bloque **generado** |
| 04 | [Modelo de diseño](04-modelo-de-diseno.md) | Entrada | 2.0 | 2026-10-04 | Manual (diagramas Mermaid) |
| 05 | [Datos de prueba](05-datos-de-prueba.md) | Entrada | 2.0 | 2026-10-04 | Manual |
| 06 | [Guía de pruebas](06-guia-de-pruebas.md) | Entrada | 2.0 | 2026-10-04 | Manual |
| 07 | [Configuración del ambiente](07-configuracion-ambiente.md) | Entrada | 2.0 | 2026-10-04 | Manual (verificado en Linux y Docker) |
| 08 | [Bitácora y reportes](08-bitacora-y-reportes.md) | Salida | 2.0 | 2026-10-04 | Manual |
| 09 | [Hallazgo de defectos](09-hallazgo-de-defectos.md) | Salida | 2.0 | 2026-10-04 | Manual + bloque **generado** |
| 10 | [Solicitudes de cambio](10-solicitud-de-cambios.md) | Salida | 2.0 | 2026-10-04 | Manual |
| 11 | Actualización de documentos (este) | Salida | 2.0 | 2026-10-04 | Manual |
| 12 | [Playwright: ventajas y limitaciones](12-playwright-ventajas-limitaciones.md) | Extra | 2.0 | 2026-10-04 | Manual |

## 3. Historial de cambios

| Fecha | Versión de la suite | Documento(s) | Cambio | Motivo |
|---|---|---|---|---|
| 2026-10-03 | 1.0 | 01–12 | Creación inicial de los artefactos con contenido real del proyecto | Entrega de la Fase 4 |
| 2026-10-03 | 1.0 | 02, 03, 09 | Matriz de casos y trazabilidad **generadas desde el código**: 117 casos, 287 ejecuciones, 13 requerimientos con cobertura | Evitar que la documentación se desfase de los tests |
| 2026-10-03 | 1.0 | 07 | Docker verificado de extremo a extremo (287 de 287 con `BUGS=off`; 255 + 32 fallos esperados con `BUGS=on`); líneas base visuales separadas por entorno; `engines.node` pasa a `>=22` | Hallazgos al probar la imagen: `better-sqlite3` necesita compilador, volúmenes montados no se pueden borrar, tipografías distintas |
| 2026-10-03 | 1.0 | 10, 02 | SC-001 implementada: la UI restaura la cantidad válida; `CP-BUG-002` verifica que no se conserve `-3` | Mejora detectada en la ejecución de pruebas |
| 2026-10-03 | 1.0 | 08 | Allure 3 (sin Java) y script `npm run bitacora` para consultar la bitácora con SQL | Simplificar el ambiente |
| 2026-10-03 | 1.0 | 01, 06, 08 | Se agregan `README.md`, el flujo de GitHub Actions (`.github/workflows/playwright.yml`) y los scripts de ejecución (`ciclo:completo`, `test:bugs`, `test:fixed`, `traza`…) | Entrega de la Fase 5 |
| 2026-10-03 | 1.0 | 08, 09 | `ciclo:completo` automatiza el ciclo completo (BD → `BUGS=on` → defectos → `BUGS=off` → informe, dashboard y reportes) y verifica por sí mismo que con `BUGS=on` hay fallos y con `BUGS=off` ninguno | Reproducibilidad del ciclo de pruebas |
| 2026-10-03 | 1.0 | — | Retoques de CSS en la aplicación: botón «Aplicar cupón» en la misma línea que el campo y tipografía uniforme en «Cerrar sesión»; las líneas base visuales no cambian | Defectos de acabado detectados al generar las capturas del README |
| 2026-10-03 | 1.1 | 00, 07, 09 | Rediseño visual de TiendaQA a un estilo **minimalista monocromático** (serif grande, líneas finas, placeholders geométricos en SVG por categoría en lugar de emojis o iniciales), dashboard con la misma identidad y descripción actualizada de BUG-005 (gris `#a0a0a0`, forma de píldora). Las 4 pruebas visuales detectaron el cambio y se regeneraron sus líneas base (local y Docker) | Eliminar el aspecto de plantilla genérica |
| 2026-10-03 | 1.1 | 00, 07 | Guía de funcionamiento del proyecto (documento 00) y recorridos visuales con navegador visible y **ventana maximizada** (`npm run navegador`, proyecto `recorridos`, variables `SLOWMO`, `RECORRIDOS_*`) | Facilitar la comprensión del proyecto |
| 2026-10-03 | 1.2 | 00, 07 | `npm run navegador` pasa a ejecutarse **con defectos activos** y muestra 4 recorridos que fallan a la vista (`CP-REC-002`, `003`, `005` y `006`) y 2 que pasan; la versión en verde es `navegador:corregido`. Se agregan `CP-REC-005` (BUG-002) y `CP-REC-006` (BUG-005). Se completa la URL del repositorio en las instrucciones de instalación | Los recorridos deben mostrar casos donde falla |
| 2026-10-04 | 2.0 | 00–12, README | **Consolidación de la suite: de 117 casos (287 ejecuciones) a 25 casos completos (59 ejecuciones)**. Cada caso recorre un escenario de negocio con varios pasos (`test.step`); los datasets alimentan un solo caso por tema (cada fila es un paso); los defectos se detectan con aserciones *soft* que reportan todas las diferencias juntas. Mismos 13 requerimientos cubiertos y los 5 defectos detectados (19 ejecuciones fallan con `BUGS=on`; 59 de 59 pasan con `BUGS=off`). Se regeneran 02, 03 y el cuadro de 09 con `npm run docs:casos` | Facilitar la explicación y ajustarse al tiempo de la asignatura |
| 2026-10-04 | 2.0 | 00, README | Los recorridos del navegador pasan de 6 a **10 recorridos más completos: 5 limpios y 5 con defecto**, de las operaciones críticas de un e-commerce (compra, autenticación, catálogo, carrito/cupones y pago). Cada paso con defecto muestra su propio aviso «DEFECTO DETECTADO» sin detener el recorrido; se agregan `navegador:fallas` y `navegador:aciertos` | Mostrar casos limpios y con error de lo más fundamental del negocio |
| 2026-10-04 | 2.0 | 09 | Hallazgos de estabilidad resueltos: efecto hover con `filter`/`transform` y precarga de fuente que desestabilizaban WebKit, carrera en un script de accesibilidad y paralelismo por defecto reducido a 4 *workers* | Suite estable: 3 tandas completas por modo sin pruebas inestables |

## 4. Qué documento actualizar cuando algo cambia

| Si cambia… | Se actualiza… | Cómo |
|---|---|---|
| Un test (título, etiquetas, requerimiento) o se agrega uno | 02, 03, 09 (bloques generados) y el CSV | `npm run docs:casos` |
| El detalle de un caso (pasos, esperado) | `test-data/casos-detalle.json` → 02 | Editar el JSON y ejecutar `npm run docs:casos` |
| Un requerimiento (RF/RNF) | 03, 01 §4 y los `meta({ req })` afectados | Manual + `npm run docs:casos` |
| La aplicación (rutas, esquema, pantallas) | 04, 05 (si cambian datos), `app/openapi.json` | Manual |
| Datos semilla o archivos `test-data/` | 05 y, si cambia un resultado esperado, 02 | Manual |
| Convenciones o herramientas | 06, 07, README | Manual |
| Versiones de dependencias o de Node | 07 §1 y `package.json` | Manual |
| Resultados de una corrida de referencia | 08, 09 (cifras y IDs de ejecución) | Manual a partir del informe |
| Un defecto nuevo o un cambio decidido | 09, 10 | Manual (los `DEF-XXX.md` los genera el reporter) |
| Cualquiera de los anteriores | **11 (este documento)** | Agregar una fila al historial y subir la versión |

## 5. Procedimiento de actualización

1. Hacer el cambio (código, datos o documento).
2. Ejecutar `npm run typecheck && npm run lint`.
3. Si hubo cambios en los tests: `npm run docs:casos`.
4. Ejecutar la regresión completa (`BUGS=off`) y confirmar que se cumplen los criterios de salida.
5. Actualizar las versiones y el historial en este documento.
6. Hacer *commit* con un mensaje que cite el ID de la solicitud de cambio o del defecto (p. ej. `SC-002: validación en línea del checkout`).

## 6. Control de calidad de los documentos

| Verificación | Cómo se hace |
|---|---|
| Todo caso tiene requerimiento | `npm run docs:casos` informa los casos sin requerimiento |
| Todo caso tiene detalle | `npm run docs:casos` falla si falta una entrada en `casos-detalle.json` |
| Diagramas Mermaid válidos | Los 13 diagramas (documentos 01, 04, 05, 08, 09, 10 y 12) se renderizaron con la librería `mermaid` en un navegador real; `npm run docs:verificar` cuenta cuántos hay |
| Cifras coherentes con la suite | 25 casos / 59 ejecuciones (`npx playwright test --list`) y los resultados del informe de ejecución |
| Enlaces entre documentos y artefactos completos | `npm run docs:verificar`: comprueba que existen los documentos 00 a 12 y el CSV, que no hay enlaces relativos rotos y que los bloques generados no están vacíos |
