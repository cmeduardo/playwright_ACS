import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, BUGS, DB_PRUEBAS, PUERTO } from './tests/support/env';

const CI = !!process.env.CI;
// Las capturas dependen del sistema operativo y de las tipografías: cada entorno (host, docker, CI)
// mantiene su propia línea base. ENTORNO_VISUAL agrega un sufijo al nombre del archivo.
const ENTORNO_VISUAL = process.env.ENTORNO_VISUAL ? `-${process.env.ENTORNO_VISUAL}` : '';

// Recorridos visuales (npm run navegador): navegador visible, movimiento lento y un solo proyecto.
// Solo existe cuando se pide con RECORRIDOS=1: nunca forma parte de la suite ni de la bitácora.
const RECORRIDOS = !!process.env.RECORRIDOS;
const SLOWMO = Number(process.env.SLOWMO ?? 500);

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  globalSetup: './tests/global-setup.ts',
  fullyParallel: !RECORRIDOS,
  forbidOnly: CI,
  // Reintentos: en CI 2; en local 1 para que un fallo genere trace (trace: on-first-retry).
  retries: RECORRIDOS ? 0 : Number(process.env.RETRIES ?? (CI ? 2 : 1)),
  // Paralelismo moderado: 4 workers por defecto (con 3 navegadores a la vez, más workers agotan la memoria de un equipo común).
  workers: RECORRIDOS ? 1 : process.env.WORKERS ? Number(process.env.WORKERS) : CI ? 2 : 4,
  timeout: RECORRIDOS ? 240_000 : 30_000,
  expect: {
    timeout: RECORRIDOS ? 20_000 : 7_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' },
  },
  outputDir: 'test-results',
  snapshotPathTemplate: `{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}${ENTORNO_VISUAL}{-snapshotSuffix}{ext}`,

  reporter: RECORRIDOS
    ? [['list']]
    : [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        [
          'allure-playwright',
          {
            resultsDir: 'allure-results',
            detail: true,
            suiteTitle: false,
            environmentInfo: {
              Aplicacion: 'TiendaQA',
              BUGS: BUGS,
              Node: process.version,
              SO: process.platform,
            },
          },
        ],
        ['./tests/reporters/bitacora-reporter.ts'],
        ['junit', { outputFile: 'reports/junit.xml' }],
        ['json', { outputFile: 'reports/resultados.json' }],
      ],

  use: {
    baseURL: BASE_URL,
    locale: 'es-GT',
    timezoneId: 'America/Guatemala',
    testIdAttribute: 'data-testid',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: RECORRIDOS
    ? [
        {
          name: 'recorridos',
          testMatch: /recorridos\/.*\.spec\.ts/,
          use: {
            browserName: 'chromium',
            // Ventana completa (maximizada) del sistema, no una ventana pequeña: así se aprecia mejor cada paso.
            viewport: null,
            headless: !!process.env.RECORRIDOS_HEADLESS,
            launchOptions: { slowMo: SLOWMO, args: ['--start-maximized'] },
            video: process.env.RECORRIDOS_GRABAR ? 'on' : 'off',
            trace: 'off',
            screenshot: 'off',
            actionTimeout: 30_000,
          },
        },
      ]
    : [
        {
          name: 'api',
          testMatch: /api\/.*\.spec\.ts/,
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'chromium',
          testIgnore: [/api\//, /mobile\//, /recorridos\//],
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          // La regresión visual se ejecuta solo en Chromium (una línea base por motor).
          testIgnore: [/api\//, /mobile\//, /visual\//, /recorridos\//],
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          testIgnore: [/api\//, /mobile\//, /visual\//, /recorridos\//],
          use: { ...devices['Desktop Safari'] },
        },
        {
          name: 'mobile-pixel7',
          testMatch: /mobile\/.*\.spec\.ts/,
          use: { ...devices['Pixel 7'] },
        },
        {
          name: 'mobile-iphone14',
          testMatch: /mobile\/.*\.spec\.ts/,
          use: { ...devices['iPhone 14'] },
        },
      ],

  webServer: {
    command: 'node app/server.js',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: String(PUERTO), BUGS, DB_FILE: DB_PRUEBAS },
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
