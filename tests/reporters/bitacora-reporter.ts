import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import { abrirBitacora, guardarEjecucion, REPORTES_DIR } from './bitacora-db';
import { procesarDefectos } from './defectos';
import { generarDashboard } from './dashboard';
import { generarInforme } from './informe';
import type { Ejecucion, EstadoPrueba, RegistroPrueba } from './tipos';

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;
const limpiar = (s: string): string => s.replace(ANSI, '');
const RAIZ = path.resolve(__dirname, '..', '..');
const relativa = (p: string): string => path.relative(RAIZ, p).split(path.sep).join('/');

function idEjecucion(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `EJ-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Pasos automáticos de una prueba (acciones de Playwright y test.step) para reproducir un fallo. */
function pasosDe(steps: TestStep[], profundidad = 0, salida: string[] = []): string[] {
  for (const s of steps) {
    if (s.category === 'test.step' || s.category === 'pw:api') {
      salida.push(`${'  '.repeat(profundidad)}${s.title}`.trimEnd());
    }
    if (s.category === 'test.step') pasosDe(s.steps, profundidad + 1, salida);
  }
  return salida;
}

function estadoDe(test: TestCase): EstadoPrueba {
  switch (test.outcome()) {
    case 'expected':
      return 'Exitoso';
    case 'flaky':
      return 'Inestable';
    case 'skipped':
      return 'Omitido';
    default:
      return 'Fallido';
  }
}

/**
 * Reporter personalizado: registra la BITÁCORA en SQLite, genera el informe de ejecución en Markdown,
 * un reporte de defecto por cada fallo y el dashboard HTML. Es la "salida" principal del proceso de pruebas.
 */
export default class BitacoraReporter implements Reporter {
  private config!: FullConfig;
  private suite!: Suite;
  private inicio = new Date();

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.inicio = new Date();
  }

  /** Copia las evidencias (captura, video, traza, adjuntos) para que sobrevivan a la siguiente corrida. */
  private guardarEvidencia(idEj: string, carpeta: string, resultados: TestResult[]): string | null {
    const destino = path.join(REPORTES_DIR, 'evidencias', idEj, carpeta);
    const guardadas = new Set<string>();
    resultados.forEach((res, intento) => {
      for (const a of res.attachments) {
        const nombre = `${intento > 0 ? `intento${intento}-` : ''}${a.name.replace(/[^\w.-]+/g, '_')}`;
        const extension = path.extname(a.path ?? '') || (a.contentType.includes('json') ? '.json' : '');
        const archivo = nombre.endsWith(extension) ? nombre : `${nombre}${extension}`;
        const ruta = path.join(destino, archivo);
        try {
          if (a.path && fs.existsSync(a.path)) {
            fs.mkdirSync(destino, { recursive: true });
            fs.copyFileSync(a.path, ruta);
            guardadas.add(relativa(ruta));
          } else if (a.body && a.contentType.startsWith('application/json')) {
            fs.mkdirSync(destino, { recursive: true });
            fs.writeFileSync(ruta, a.body);
            guardadas.add(relativa(ruta));
          }
        } catch {
          /* la evidencia es opcional: nunca debe romper el reporte */
        }
      }
    });
    return guardadas.size ? [...guardadas].join(';') : null;
  }

  async onEnd(resultado: FullResult): Promise<void> {
    const fin = new Date();
    const idEj = idEjecucion(this.inicio);
    const modo = (process.env.BUGS ?? 'on').toLowerCase() === 'off' ? 'off' : 'on';
    const registros: RegistroPrueba[] = [];

    for (const test of this.suite.allTests()) {
      const ultimo = test.results.at(-1);
      if (!ultimo && test.outcome() !== 'skipped') continue;
      const estado = estadoDe(test);
      const idCaso = /^(CP-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)/.exec(test.title)?.[1] ?? test.title.slice(0, 30);
      const nota = (tipo: string): string | null =>
        test.annotations.find((a) => a.type === tipo)?.description ?? null;
      const navegador = test.parent.project()?.name ?? 'desconocido';
      const inicioPrueba = ultimo?.startTime ?? this.inicio;
      const duracion = ultimo?.duration ?? 0;
      const fallo = estado === 'Fallido' || estado === 'Inestable';
      const errorCrudo = test.results.map((r) => r.error ?? r.errors[0]).findLast((e) => e !== undefined);

      registros.push({
        id_ejecucion: idEj,
        id_caso: idCaso,
        caso: test.title,
        navegador,
        estado,
        inicio: inicioPrueba.toISOString(),
        fin: new Date(inicioPrueba.getTime() + duracion).toISOString(),
        duracion_ms: Math.round(duracion),
        error:
          fallo && errorCrudo
            ? limpiar(errorCrudo.message ?? errorCrudo.value ?? 'Error sin mensaje').slice(0, 2000)
            : null,
        evidencia: fallo
          ? this.guardarEvidencia(idEj, `${navegador}__${idCaso}`.replace(/[^\w.-]+/g, '_'), test.results)
          : null,
        etiquetas: test.tags.join(' '),
        requerimiento: nota('requerimiento'),
        severidad: nota('severidad'),
        defecto: nota('defecto'),
        intentos: test.results.length || 1,
        archivo: relativa(test.location.file),
        pasos: ultimo ? pasosDe(ultimo.steps).map(limpiar) : [],
      });
    }

    const cuenta = (e: EstadoPrueba): number => registros.filter((r) => r.estado === e).length;
    const argumentos = process.argv.slice(2).join(' ');
    const parcial = /--grep|-g\b|--project|--last-failed|--only-changed|tests\/|\.spec\.ts|--shard/.test(
      argumentos,
    );
    const ejecucion: Ejecucion = {
      id_ejecucion: idEj,
      fecha_inicio: this.inicio.toISOString(),
      fecha_fin: fin.toISOString(),
      duracion_ms: Math.round(resultado.duration ?? fin.getTime() - this.inicio.getTime()),
      modo_bugs: modo,
      alcance: parcial ? 'parcial' : 'completa',
      total: registros.length,
      exitosas: cuenta('Exitoso'),
      fallidas: cuenta('Fallido'),
      inestables: cuenta('Inestable'),
      omitidas: cuenta('Omitido'),
      version_playwright: this.config.version,
      ambiente: `Node ${process.version} · ${os.type()} ${os.release()} · ${os.cpus().length} CPU`,
    };

    // Nada que registrar: sin pruebas, o modo --list (ninguna prueba llegó a ejecutarse).
    if (registros.length === 0 || this.suite.allTests().every((t) => t.results.length === 0)) return;

    try {
      const db = abrirBitacora();
      guardarEjecucion(db, ejecucion, registros);
      const { abiertos, cerrados } = procesarDefectos(db, ejecucion, registros);
      const informe = generarInforme(db, ejecucion, registros);
      fs.mkdirSync(path.join(REPORTES_DIR, 'historial'), { recursive: true });
      fs.writeFileSync(path.join(REPORTES_DIR, 'informe-ejecucion.md'), informe);
      fs.writeFileSync(path.join(REPORTES_DIR, 'historial', `informe-${idEj}.md`), informe);
      db.close();
      generarDashboard();
      console.log(
        `\n[bitácora] ${idEj} (BUGS=${modo}): ${ejecucion.exitosas} exitosas, ${ejecucion.fallidas} fallidas, ${ejecucion.inestables} inestables, ${ejecucion.omitidas} omitidas` +
          `\n[bitácora] defectos abiertos: ${abiertos.join(', ') || 'ninguno'} · cerrados: ${cerrados.join(', ') || 'ninguno'}` +
          `\n[bitácora] reports/informe-ejecucion.md · reports/dashboard/index.html`,
      );
    } catch (e) {
      console.error('[bitácora] No se pudo generar la bitácora/informes:', e);
    }
  }
}
