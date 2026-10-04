# 07 — Configuración del ambiente

> Entrada del proceso de pruebas. Describe el hardware y software requeridos, las versiones, las variables de entorno, los navegadores y la instalación paso a paso en **Linux**, **Windows** y **Docker**.

## 1. Requisitos

### 1.1 Hardware

| Recurso | Mínimo | Recomendado | Medido en la máquina de desarrollo |
|---|---|---|---|
| CPU | 2 núcleos | 4 o más | 20 hilos |
| Memoria RAM | 4 GB | 8 GB | 23 GB |
| Disco libre | 3 GB | 5 GB | Navegadores 1.3 GB + `node_modules` 185 MB |
| Pantalla | — | Resolución que permita proyectar | — |

Este proyecto usa **4 *workers* por defecto** (2 en CI), porque ejecuta tres navegadores a la vez y más *workers* agotan la memoria de un equipo común (se comprobó: con 10 aparecieron cierres de página y `ERR_INSUFFICIENT_RESOURCES`). Con menos de 4 GB de RAM conviene `WORKERS=1`; con más memoria se puede subir (`WORKERS=8`).

### 1.2 Software y versiones

| Componente | Versión usada | Requisito |
|---|---|---|
| Sistema operativo | Debian 12 (Linux 6.1) | Windows 11+, macOS 14+, Debian 12/13 o Ubuntu 22.04/24.04 (según la documentación de Playwright) |
| **Node.js** | 22.17.1 | **22.x o superior** (Playwright 1.63 declara compatibilidad con Node 22, 24 y 26) |
| npm | 10.9.2 | Incluido con Node.js |
| **Playwright** (`@playwright/test`) | **1.63.0** | Se instala con `npm install` |
| TypeScript | 6.0.3 | Se instala con `npm install` |
| Express / better-sqlite3 | 5.2.1 / 13.0.3 | Aplicación bajo prueba (SUT) |
| `@axe-core/playwright` | 4.13.0 | Accesibilidad |
| `allure-playwright` / `allure` (CLI) | 3.13.0 / 3.20.0 | Reporte Allure (**no requiere Java**) |
| Chart.js | 4.5.1 | Dashboard |
| ESLint / Prettier | 10.12.0 / 3.9.9 | Calidad de código |
| Git | 2.39 o superior | Control de versiones |
| Docker (opcional) | 29.x | Ejecución en contenedor |

### 1.3 Navegadores (descargados por Playwright)

| Proyecto | Navegador / motor | Versión (Playwright 1.63.0) | Tamaño |
|---|---|---|---|
| `chromium`, `mobile-pixel7` | Chromium (Chrome for Testing) | 153.0.8010.12 | ≈ 650 MB (con *headless shell*) |
| `firefox` | Firefox (build de Playwright) | 155.0 | ≈ 306 MB |
| `webkit`, `mobile-iphone14` | WebKit (build de Playwright) | 26.6 | ≈ 294 MB |

Playwright usa **sus propios builds** de los navegadores (no el Chrome, Firefox ni Safari instalados en el equipo). Los móviles son **emulación** (viewport, user agent y touch), no dispositivos reales.

## 2. Variables de entorno

| Variable | Valor por defecto | Quién la lee | Descripción |
|---|---|---|---|
| `BUGS` | `on` | App y pruebas | `on` activa los 5 defectos intencionales; `off` los corrige |
| `PORT` | `3100` | App (`npm run app`) | Puerto de la aplicación en modo manual |
| `TEST_PORT` | `3101` | Playwright | Puerto de la app que levanta el `webServer` durante las pruebas |
| `DB_FILE` | `db/tienda.db` (pruebas: `db/tienda-test.db`) | App | Archivo SQLite |
| `CI` | (vacío) | Config de Playwright | Con valor: 2 reintentos, 2 workers y `forbidOnly` |
| `RETRIES` | `1` local · `2` con `CI` | Config | Reintentos de pruebas fallidas (el primer reintento genera la traza) |
| `WORKERS` | `4` (`2` con `CI`) | Config | Número de workers en paralelo |
| `ENTORNO_VISUAL` | (vacío) · `docker` en la imagen | Config | Sufijo de las líneas base visuales por entorno |
| `HOST_UID`, `HOST_GID` | `1000` | docker-compose | Usuario con el que corre el contenedor (ver §5) |
| `RECORRIDOS` | (vacío) | Config de Playwright | Con valor, crea solo el proyecto `recorridos` (navegador visible). Lo definen los scripts `navegador*` |
| `SLOWMO` | `500` | Recorridos visuales | Milisegundos de pausa entre acciones de Playwright |
| `RECORRIDOS_PAUSA` | `900` | Recorridos visuales | Milisegundos que cada subtítulo permanece en pantalla |
| `RECORRIDOS_ESCRITURA` | `55` | Recorridos visuales | Milisegundos entre letras al escribir |
| `RECORRIDOS_GRABAR` · `RECORRIDOS_HEADLESS` · `RECORRIDOS_FOTOS` | (vacío) | Recorridos visuales | Grabar video · ejecutar sin ventana · carpeta donde guardar una captura por paso |
| `RECORRIDOS_PANTALLA_COMPLETA` | (vacío) | Recorridos visuales | Pantalla completa tipo F11 en lugar de ventana maximizada (por defecto el navegador se abre maximizado) |

Cómo establecerlas:

| Terminal | Ejemplo |
|---|---|
| Linux / macOS (bash) | `BUGS=off npm test` |
| Windows PowerShell | `$env:BUGS="off"; npm test` |
| Windows CMD | `set BUGS=off && npm test` |
| Cualquiera (con `cross-env`) | `npx cross-env BUGS=off npm test` |

## 3. Instalación en Linux (Debian / Ubuntu)

```bash
# 1. Node.js 22 (con nvm; también sirve NodeSource o el gestor de paquetes que prefieras)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22
node -v            # debe mostrar v22.x o superior

# 2. Obtener el proyecto (el repositorio es privado: hace falta tener acceso)
git clone https://github.com/cmeduardo/playwright_ACS.git && cd playwright_ACS

# 3. Dependencias del proyecto
npm install

# 4. Navegadores de Playwright (Chromium, Firefox y WebKit)
npx playwright install
#    Si faltan librerías del sistema (error al lanzar un navegador), con permisos de administrador:
sudo npx playwright install-deps        # o:  npx playwright install --with-deps

# 5. Base de datos de desarrollo y verificación
npm run db:reset
npm run typecheck && npm run lint
npm run test:smoke                       # 10 ejecuciones, ~15 segundos
```

> En la máquina de desarrollo (Debian 12) los tres navegadores funcionaron con `npx playwright install` sin instalar dependencias adicionales. Si tu distribución no es una de las soportadas, usa Docker (§5).

## 4. Instalación en Windows 10/11

Usa **PowerShell** (no CMD).

```powershell
# 1. Node.js 22 LTS y Git (con winget; o descarga los instaladores de nodejs.org y git-scm.com)
winget install OpenJS.NodeJS.LTS
winget install Git.Git
# Cierra y vuelve a abrir PowerShell para actualizar el PATH
node -v                                  # v22.x o superior

# 2. Obtener el proyecto
git clone https://github.com/cmeduardo/playwright_ACS.git
cd playwright_ACS

# 3. Dependencias
npm install

# 4. Navegadores de Playwright
npx playwright install

# 5. Base de datos y verificación
npm run db:reset
npm run typecheck
npm run test:smoke
```

Notas para Windows:
- **Ejecución de scripts bloqueada** (`la ejecución de scripts está deshabilitada`): `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **Variable `BUGS`:** `$env:BUGS="off"; npm test`. Para volver al valor por defecto: `Remove-Item Env:BUGS`.
- **`better-sqlite3`** es un módulo nativo: normalmente se descarga un binario precompilado. Si `npm install` intenta compilarlo y falla, instala *Visual Studio Build Tools* con la carga de trabajo «Desarrollo para el escritorio con C++» y Python 3, y repite `npm install`.
- **Rutas largas:** clona el repositorio cerca de la raíz (p. ej. `C:\qa\playwright-ACS`).
- **WSL2:** también funciona siguiendo la guía de Linux dentro de Ubuntu.
- Las líneas base visuales de este repositorio se generaron en Linux: en Windows regenera las tuyas con `npm run test:visual:update` o ejecuta `@visual` en Docker.

## 5. Opción con Docker

Ejecuta las pruebas con un ambiente idéntico para todo el equipo, sin instalar Node ni navegadores. Archivos: `Dockerfile`, `docker-compose.yml` y `.dockerignore` en la raíz.

| Archivo | Qué hace |
|---|---|
| `Dockerfile` | Parte de la imagen oficial `mcr.microsoft.com/playwright:v1.63.0-noble` (trae los 3 navegadores y sus dependencias), instala las herramientas de compilación que necesita `better-sqlite3`, ejecuta `npm ci` y copia el proyecto. Comando por defecto: `npm test`. |
| `docker-compose.yml` | Servicios: `pruebas` (suite), `visual-actualizar` (regenera líneas base de Docker) y `app` (solo la aplicación en el puerto 3100). Monta `reports/`, `playwright-report/`, `allure-results/` y `test-results/` para conservar los resultados en tu equipo. |

```bash
# Linux / macOS / WSL: el contenedor usa tu usuario para que los reportes no queden como propiedad de root
export HOST_UID=$(id -u) HOST_GID=$(id -g)

docker compose build pruebas                              # primera vez (descarga ≈ 2 GB; la imagen final pesa ≈ 3 GB)
BUGS=on  docker compose run --rm pruebas                  # suite completa con defectos activos
BUGS=off docker compose run --rm pruebas                  # regresión con defectos corregidos
docker compose run --rm pruebas npx playwright test --grep @smoke
docker compose run --rm visual-actualizar                 # (re)genera líneas base visuales de Docker
docker compose up app                                     # app en http://localhost:3100
```

En **Windows (PowerShell)** no existe `id -u`; deja los valores por defecto (`1000`), que funcionan con Docker Desktop:

```powershell
$env:BUGS="off"; docker compose run --rm pruebas
```

Resultados verificados en contenedor (Docker 29.8.1, mismo código): `BUGS=off` → **59 de 59 pasan**; `BUGS=on` → **40 pasan y 19 fallan** (los defectos esperados), idéntico a la ejecución local. Dentro del contenedor se define `CI=1` (2 reintentos y 2 workers), por lo que con `BUGS=on` tarda más (≈ 4.7 min frente a ≈ 47 s con `BUGS=off`) porque cada fallo se reintenta dos veces.

Las **capturas visuales** dependen de las tipografías del sistema, así que Docker tiene su propia línea base (`*-chromium-docker-linux.png`), separada de la del equipo local (`*-chromium-linux.png`) mediante `ENTORNO_VISUAL=docker`.

## 6. Verificación del ambiente (lista de comprobación)

| # | Comprobación | Comando | Resultado esperado |
|---|---|---|---|
| 1 | Versión de Node.js | `node -v` | `v22.x` o superior |
| 2 | Versión de Playwright | `npx playwright --version` | `Version 1.63.0` |
| 3 | Navegadores instalados | `npx playwright install --dry-run` | Muestra rutas de Chromium, Firefox y WebKit existentes |
| 4 | Tipado y estilo | `npm run typecheck && npm run lint` | Sin errores |
| 5 | Base de datos | `npm run db:reset` | «Base de datos reiniciada … con 12 productos» |
| 6 | Aplicación | `npm run app` y abrir <http://localhost:3100> | Se ve el catálogo; `/api/health` devuelve `{"status":"ok","bugs":"on"}` |
| 7 | Prueba rápida | `npm run test:smoke` | 10 exitosas |
| 8 | Listado de casos | `npx playwright test --list` | 59 pruebas en 19 archivos |

## 7. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `browserType.launch: Executable doesn't exist` | Faltan navegadores | `npx playwright install` |
| `Host system is missing dependencies` (Linux) | Faltan librerías del sistema | `sudo npx playwright install-deps` o usar Docker |
| `http://localhost:3101 is already used` | Hay otra ejecución o proceso en ese puerto | Cerrar el proceso o usar `TEST_PORT=3201` |
| `EADDRINUSE :3100` al levantar la app | Otro proceso usa el puerto | `PORT=3200 npm run app` |
| Fallan solo las pruebas `@visual` | La línea base no es de este sistema/tipografías | `npm run test:visual:update` (con la app en `BUGS=off`) |
| `npm install` falla en `better-sqlite3` | No hay binario precompilado y falta el compilador | Instalar herramientas de compilación (Windows: Build Tools; Linux: `build-essential`, `python3`) |
| `EACCES … unlink` en `test-results/` | Un contenedor creó archivos como root | `export HOST_UID=$(id -u) HOST_GID=$(id -g)` antes de `docker compose run`; para recuperar la propiedad: `docker run --rm -v "$PWD":/w alpine chown -R $(id -u):$(id -g) /w` |
| No aparecen bitácora ni informes | Se usó `--reporter=…` en la línea de comandos | Quitar la opción: sobrescribe los reporteres de la configuración |
| Las pruebas pasan con `BUGS=on` cuando deberían fallar | Se reutiliza una app anterior o la variable no llegó | Cerrar procesos de la app y verificar `/api/health` |
