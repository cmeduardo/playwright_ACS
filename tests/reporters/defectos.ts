import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { codigoDefecto, REPORTES_DIR } from './bitacora-db';
import { fechaLocal, resumenError } from './formato';
import type { Ejecucion, RegistroPrueba } from './tipos';

interface EntradaCatalogo {
  titulo: string;
  componente: string;
  severidad: string;
  prioridad: string;
  requerimiento: string;
  pasos: string[];
  esperado: string;
  obtenido: string;
}

export const DEFECTOS_DIR = path.join(REPORTES_DIR, 'defectos');
const CATALOGO_RUTA = path.resolve(__dirname, '..', '..', 'test-data', 'defectos-catalogo.json');

const SEVERIDAD_ES: Record<string, string> = {
  blocker: 'Bloqueante',
  critical: 'Crítica',
  normal: 'Media',
  minor: 'Baja',
  trivial: 'Trivial',
};
const ORDEN_SEVERIDAD = ['Bloqueante', 'Crítica', 'Media', 'Baja', 'Trivial'];

function cargarCatalogo(): Record<string, EntradaCatalogo> {
  try {
    return JSON.parse(fs.readFileSync(CATALOGO_RUTA, 'utf8')) as Record<string, EntradaCatalogo>;
  } catch {
    return {};
  }
}

/** Clave del defecto: el defecto de referencia (BUG-00X) si la prueba lo declara; si no, el ID del caso. */
export const claveDefecto = (r: RegistroPrueba): string => r.defecto ?? r.id_caso;

const fecha = fechaLocal;
const RAIZ = path.resolve(__dirname, '..', '..');

/** Enlace relativo al .md del defecto para un archivo de evidencia (ruta relativa a la raíz del proyecto). */
const enlace = (rutaRaiz: string): string =>
  path.relative(DEFECTOS_DIR, path.join(RAIZ, rutaRaiz)).split(path.sep).join('/');

function extraerEsperadoObtenido(error: string | null): { esperado: string; obtenido: string } {
  const texto = error ?? '';
  const esperado = /Expected(?: string| pattern| substring)?:\s*(.+)/.exec(texto)?.[1]?.trim();
  const obtenido = /Received(?: string| pattern)?:\s*(.+)/.exec(texto)?.[1]?.trim();
  return {
    esperado: esperado
      ? `Valor esperado por la prueba: ${esperado}`
      : 'Según el criterio del caso de prueba.',
    obtenido: obtenido ? `Valor obtenido: ${obtenido}` : (texto.split('\n')[0] ?? 'Ver mensaje de error.'),
  };
}

const lineaEstado = (estado: string): string => `| Estado | **${estado}** |`;

/** Crea o actualiza los defectos de esta ejecución y cierra los que ya no fallan. Devuelve los defectos tocados. */
export function procesarDefectos(
  db: Database.Database,
  ej: Ejecucion,
  registros: RegistroPrueba[],
): { abiertos: string[]; cerrados: string[] } {
  fs.mkdirSync(DEFECTOS_DIR, { recursive: true });
  const catalogo = cargarCatalogo();

  // Agrupa por clave todos los casos relacionados que se ejecutaron en esta corrida.
  const porClave = new Map<string, RegistroPrueba[]>();
  for (const r of registros.filter((x) => x.estado !== 'Omitido')) {
    const clave = claveDefecto(r);
    porClave.set(clave, [...(porClave.get(clave) ?? []), r]);
  }

  const abiertos: string[] = [];
  const cerrados: string[] = [];
  const ahora = fecha(ej.fecha_fin);

  const claves = [...porClave.entries()]
    .filter(([, rs]) => rs.some((r) => r.estado === 'Fallido'))
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [clave, rs] of claves) {
    const fallidos = rs.filter((r) => r.estado === 'Fallido');
    const info = catalogo[clave];
    const existente = db.prepare('SELECT * FROM defectos WHERE clave = ?').get(clave) as
      | {
          id_def: number;
          estado: string;
          historial: string;
          ejecucion_detectado: string;
          fecha_detectado: string;
        }
      | undefined;

    const severidadCaso =
      ORDEN_SEVERIDAD.find((s) => fallidos.some((r) => SEVERIDAD_ES[r.severidad ?? 'normal'] === s)) ??
      'Media';
    const severidad = info?.severidad ?? severidadCaso;
    const titulo = info?.titulo ?? fallidos[0]!.caso.replace(/^CP-[A-Z0-9-]+\s+/, '');

    let historial = existente?.historial ?? '';
    let idDef: number;
    if (!existente) {
      historial = `${ahora} — Detectado en la ejecución ${ej.id_ejecucion} (BUGS=${ej.modo_bugs}). Estado: Abierto.`;
      idDef = Number(
        db
          .prepare(
            `INSERT INTO defectos (clave, titulo, severidad, estado, ejecucion_detectado, fecha_detectado, historial)
             VALUES (?, ?, ?, 'Abierto', ?, ?, ?)`,
          )
          .run(clave, titulo, severidad, ej.id_ejecucion, ahora, historial).lastInsertRowid,
      );
    } else {
      idDef = existente.id_def;
      if (existente.estado === 'Cerrado') {
        historial += `\n${ahora} — Reabierto: el defecto reapareció en la ejecución ${ej.id_ejecucion}.`;
      } else {
        historial += `\n${ahora} — Sigue abierto en la ejecución ${ej.id_ejecucion}.`;
      }
      db.prepare(
        `UPDATE defectos SET titulo = ?, severidad = ?, estado = 'Abierto', ejecucion_cierre = NULL,
         fecha_cierre = NULL, historial = ? WHERE id_def = ?`,
      ).run(titulo, severidad, historial, idDef);
    }

    const codigo = codigoDefecto(idDef);
    abiertos.push(codigo);
    // Caso representativo: se prefiere uno de UI (Chromium) porque su traza de acciones es más descriptiva.
    const preferencia = ['chromium', 'firefox', 'webkit'];
    const ordenados = [...fallidos].sort(
      (a, b) =>
        (preferencia.indexOf(a.navegador) + 1 || 99) - (preferencia.indexOf(b.navegador) + 1 || 99) ||
        (b.pasos?.length ?? 0) - (a.pasos?.length ?? 0) ||
        a.id_caso.localeCompare(b.id_caso),
    );
    const primero = ordenados[0]!;
    const { esperado, obtenido } = extraerEsperadoObtenido(primero.error);
    const navegadores = [...new Set(fallidos.map((r) => r.navegador))].join(', ');
    // Evidencia: por cada navegador, el primer caso fallido (captura final, video y traza).
    const evidencias: string[] = [];
    for (const nav of [...new Set(ordenados.map((r) => r.navegador))]) {
      const caso = ordenados.find((r) => r.navegador === nav);
      const archivos = (caso?.evidencia?.split(';') ?? []).filter(
        (e) => /\/(screenshot\.png|video\.webm)$/.test(e) || e.endsWith('trace.zip') || e.endsWith('.json'),
      );
      evidencias.push(...archivos);
    }
    const carpetaEvidencias = `reports/evidencias/${ej.id_ejecucion}/`;

    const md = `# ${codigo} — ${titulo}

| Campo | Valor |
|---|---|
| ID | ${codigo} |
| Defecto de referencia | ${info ? clave : '—'} |
${lineaEstado('Abierto')}
| Severidad | ${severidad} |
| Prioridad | ${info?.prioridad ?? '—'} |
| Componente | ${info?.componente ?? '—'} |
| Requerimiento afectado | ${info?.requerimiento ?? primero.requerimiento ?? '—'} |
| Detectado en la ejecución | ${existente?.ejecucion_detectado ?? ej.id_ejecucion} (BUGS=${ej.modo_bugs}) |
| Fecha de detección | ${existente?.fecha_detectado ?? ahora} |
| Última verificación | ${ej.id_ejecucion} |
| Navegador(es) | ${navegadores} |

## Casos de prueba relacionados

| Caso | Navegador | Error |
|---|---|---|
${[...fallidos]
  .sort((a, b) => a.id_caso.localeCompare(b.id_caso) || a.navegador.localeCompare(b.navegador))
  .map((r) => `| ${r.id_caso} | ${r.navegador} | ${resumenError(r.error)} |`)
  .join('\n')}

## Pasos para reproducir

${(info?.pasos ?? primero.pasos?.slice(0, 12) ?? ['Ejecutar el caso ' + primero.id_caso]).map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Resultado esperado

${info?.esperado ?? esperado}

## Resultado obtenido

${info?.obtenido ?? obtenido}

## Mensaje de error de la prueba (${primero.id_caso}, ${primero.navegador})

\`\`\`text
${(primero.error ?? 'Sin mensaje').slice(0, 1500)}
\`\`\`

## Traza automática de acciones (Playwright)

${
  (primero.pasos ?? [])
    .slice(0, 25)
    .map((p) => `- ${p}`)
    .join('\n') || '- (sin pasos registrados)'
}

## Evidencia

${evidencias.length ? evidencias.map((e) => `- [${e.replace(carpetaEvidencias, '')}](${enlace(e)})`).join('\n') : '- (sin archivos adjuntos)'}

Todas las evidencias de la ejecución: \`${carpetaEvidencias}\`

> Abrir una traza en el Trace Viewer: \`npx playwright show-trace ${evidencias.find((e) => e.endsWith('trace.zip')) ?? '<ruta>/trace.zip'}\`

## Historial

${historial
  .split('\n')
  .map((l) => `- ${l}`)
  .join('\n')}
`;
    fs.writeFileSync(path.join(DEFECTOS_DIR, `${codigo}.md`), md);
  }

  // Cierre: defectos abiertos cuyos casos relacionados corrieron y ahora pasan.
  const abiertosBD = db.prepare("SELECT * FROM defectos WHERE estado = 'Abierto'").all() as {
    id_def: number;
    clave: string;
    historial: string;
  }[];
  for (const d of abiertosBD) {
    const rs = porClave.get(d.clave);
    if (!rs || rs.some((r) => r.estado === 'Fallido')) continue;
    const codigo = codigoDefecto(d.id_def);
    const historial = `${d.historial}\n${ahora} — Verificado y cerrado en la ejecución ${ej.id_ejecucion} (BUGS=${ej.modo_bugs}): ${rs.length} caso(s) relacionados pasan.`;
    db.prepare(
      `UPDATE defectos SET estado = 'Cerrado', ejecucion_cierre = ?, fecha_cierre = ?, historial = ? WHERE id_def = ?`,
    ).run(ej.id_ejecucion, ahora, historial, d.id_def);
    const archivo = path.join(DEFECTOS_DIR, `${codigo}.md`);
    if (fs.existsSync(archivo)) {
      let md = fs.readFileSync(archivo, 'utf8');
      md = md.replace(lineaEstado('Abierto'), lineaEstado(`Cerrado (verificado en ${ej.id_ejecucion})`));
      md = md.replace(
        /## Historial\n\n[\s\S]*$/,
        `## Historial\n\n${historial
          .split('\n')
          .map((l) => `- ${l}`)
          .join('\n')}\n`,
      );
      fs.writeFileSync(archivo, md);
    }
    cerrados.push(codigo);
  }
  return { abiertos, cerrados };
}
