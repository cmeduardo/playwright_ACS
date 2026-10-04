import type Database from 'better-sqlite3';
import { leerDefectos } from './bitacora-db';
import { fechaLocal, resumenError } from './formato';
import type { Ejecucion, EstadoPrueba, RegistroPrueba } from './tipos';

const pct = (a: number, b: number): string => (b === 0 ? '0.0 %' : `${((a / b) * 100).toFixed(1)} %`);
const seg = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;
const min = (ms: number): string => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
};
const ESTADOS: EstadoPrueba[] = ['Exitoso', 'Fallido', 'Inestable', 'Omitido'];

function conteo(rs: RegistroPrueba[]): Record<EstadoPrueba, number> {
  const c: Record<EstadoPrueba, number> = { Exitoso: 0, Fallido: 0, Inestable: 0, Omitido: 0 };
  for (const r of rs) c[r.estado]++;
  return c;
}

function tabla(encabezado: string[], filas: (string | number)[][]): string {
  return [
    `| ${encabezado.join(' | ')} |`,
    `|${encabezado.map(() => '---').join('|')}|`,
    ...filas.map((f) => `| ${f.join(' | ')} |`),
  ].join('\n');
}

/** Resumen de la ejecución anterior (para mostrar la evolución entre corridas). */
function comparacion(db: Database.Database, ej: Ejecucion): string {
  const previa = db
    .prepare('SELECT * FROM ejecuciones WHERE fecha_inicio < ? ORDER BY fecha_inicio DESC LIMIT 1')
    .get(ej.fecha_inicio) as Ejecucion | undefined;
  if (!previa) return '_No hay una ejecución anterior para comparar._';
  const d = (a: number, b: number): string => `${a - b >= 0 ? '+' : ''}${a - b}`;
  return `Comparación con la ejecución anterior **${previa.id_ejecucion}** (BUGS=${previa.modo_bugs}):

${tabla(
  ['Métrica', `Anterior (BUGS=${previa.modo_bugs})`, `Actual (BUGS=${ej.modo_bugs})`, 'Variación'],
  [
    ['Pruebas ejecutadas', previa.total, ej.total, d(ej.total, previa.total)],
    ['Exitosas', previa.exitosas, ej.exitosas, d(ej.exitosas, previa.exitosas)],
    ['Fallidas', previa.fallidas, ej.fallidas, d(ej.fallidas, previa.fallidas)],
    ['Tasa de éxito', pct(previa.exitosas, previa.total), pct(ej.exitosas, ej.total), '—'],
    ['Duración', min(previa.duracion_ms), min(ej.duracion_ms), '—'],
  ],
)}`;
}

export function generarInforme(db: Database.Database, ej: Ejecucion, registros: RegistroPrueba[]): string {
  const c = conteo(registros);
  const ejecutadas = registros.filter((r) => r.estado !== 'Omitido');
  const tasa = pct(c.Exitoso + c.Inestable, ejecutadas.length);
  const criticosFallidos = registros.filter(
    (r) => r.estado === 'Fallido' && ['blocker', 'critical'].includes(r.severidad ?? ''),
  );
  const aprobado = c.Fallido === 0;
  const defectos = leerDefectos(db);

  const navegadores = [...new Set(registros.map((r) => r.navegador))].sort();
  const porNavegador = navegadores.map((n) => {
    const rs = registros.filter((r) => r.navegador === n);
    const k = conteo(rs);
    const ejec = rs.length - k.Omitido;
    return [
      n,
      rs.length,
      k.Exitoso,
      k.Fallido,
      k.Inestable,
      k.Omitido,
      pct(k.Exitoso + k.Inestable, ejec),
      seg(rs.reduce((a, r) => a + r.duracion_ms, 0)),
    ];
  });

  const etiquetas = [...new Set(registros.flatMap((r) => r.etiquetas.split(' ').filter(Boolean)))].sort();
  const porEtiqueta = etiquetas.map((e) => {
    const rs = registros.filter((r) => r.etiquetas.split(' ').includes(e));
    const k = conteo(rs);
    return [e, rs.length, k.Exitoso, k.Fallido, pct(k.Exitoso + k.Inestable, rs.length - k.Omitido)];
  });

  const lentos = [...registros].sort((a, b) => b.duracion_ms - a.duracion_ms).slice(0, 10);
  const fallidos = registros.filter((r) => r.estado === 'Fallido');
  const defectosDe = (r: RegistroPrueba): string => {
    const d = defectos.find((x) => x.clave === (r.defecto ?? r.id_caso));
    return d ? d.codigo : '—';
  };

  return `# Informe de ejecución de pruebas — TiendaQA

> Generado automáticamente por \`tests/reporters/bitacora-reporter.ts\` · ${fechaLocal(ej.fecha_fin)}

## 1. Resumen ejecutivo

| Dato | Valor |
|---|---|
| ID de ejecución | **${ej.id_ejecucion}** |
| Aplicación bajo prueba | TiendaQA — **BUGS=${ej.modo_bugs}** (${ej.modo_bugs === 'on' ? 'defectos intencionales activos' : 'defectos corregidos'}) |
| Alcance | ${ej.alcance === 'completa' ? 'Suite completa (todos los proyectos)' : 'Parcial (subconjunto de pruebas)'} |
| Inicio / fin | ${fechaLocal(ej.fecha_inicio)} / ${fechaLocal(ej.fecha_fin)} |
| Tiempo total | ${min(ej.duracion_ms)} |
| Pruebas ejecutadas | ${ejecutadas.length} de ${registros.length} |
| **Tasa de éxito** | **${tasa}** |
| Playwright | ${ej.version_playwright} |
| Ambiente | ${ej.ambiente} |

**Veredicto:** ${aprobado ? '✅ **APROBADO** — todas las pruebas ejecutadas pasaron; se cumple el criterio de salida.' : `❌ **NO APROBADO** — ${c.Fallido} prueba(s) fallida(s), de las cuales ${criticosFallidos.length} son de severidad crítica o bloqueante.`}

## 2. Totales por estado

${tabla(
  ['Estado', 'Cantidad', '% del total'],
  ESTADOS.map((e) => [e, c[e], pct(c[e], registros.length)]),
)}

## 3. Resultados por navegador / proyecto

${tabla(['Proyecto', 'Total', 'Exitosas', 'Fallidas', 'Inestables', 'Omitidas', 'Tasa de éxito', 'Tiempo acumulado'], porNavegador)}

## 4. Resultados por etiqueta

${tabla(['Etiqueta', 'Total', 'Exitosas', 'Fallidas', 'Tasa de éxito'], porEtiqueta)}

## 5. Top 10 casos más lentos

${tabla(
  ['#', 'Caso', 'Proyecto', 'Duración', 'Estado'],
  lentos.map((r, i) => [i + 1, r.id_caso, r.navegador, seg(r.duracion_ms), r.estado]),
)}

## 6. Casos fallidos y defectos asociados

${
  fallidos.length
    ? tabla(
        ['Caso', 'Proyecto', 'Severidad', 'Defecto', 'Error (resumen)'],
        fallidos.map((r) => [
          r.id_caso,
          r.navegador,
          r.severidad ?? '—',
          defectosDe(r),
          resumenError(r.error, 110),
        ]),
      )
    : '_No hubo casos fallidos en esta ejecución._'
}

### Estado de los defectos en la bitácora

${
  defectos.length
    ? tabla(
        ['ID', 'Título', 'Severidad', 'Estado', 'Detectado en', 'Cerrado en'],
        defectos.map((d) => [
          d.codigo,
          d.titulo.replace(/\|/g, '\\|'),
          d.severidad,
          d.estado,
          d.ejecucion_detectado,
          d.ejecucion_cierre ?? '—',
        ]),
      )
    : '_Aún no hay defectos registrados._'
}

Los reportes de defecto individuales están en \`reports/defectos/\`.

## 7. Evolución entre ejecuciones

${comparacion(db, ej)}

## 8. Criterios de salida evaluados

${tabla(
  ['Criterio', 'Resultado'],
  [
    [
      '100 % de las pruebas @smoke exitosas',
      registros.filter((r) => r.etiquetas.includes('@smoke')).every((r) => r.estado !== 'Fallido')
        ? '✅ Cumple'
        : '❌ No cumple',
    ],
    [
      'Tasa de éxito global ≥ 95 %',
      Number.parseFloat(tasa) >= 95 ? `✅ Cumple (${tasa})` : `❌ No cumple (${tasa})`,
    ],
    [
      '0 defectos de severidad crítica o bloqueante abiertos',
      criticosFallidos.length === 0 ? '✅ Cumple' : `❌ No cumple (${criticosFallidos.length} caso(s))`,
    ],
  ],
)}

## 9. Artefactos de esta ejecución

- Bitácora SQLite: \`reports/bitacora.db\` (tabla \`test_logs\`)
- Dashboard: \`reports/dashboard/index.html\`
- Reporte HTML nativo: \`playwright-report/index.html\` · Allure: \`allure-report/index.html\`
- JUnit XML y JSON para CI: \`reports/junit.xml\`, \`reports/resultados.json\`
- Evidencias de fallos: \`reports/evidencias/${ej.id_ejecucion}/\`
`;
}
