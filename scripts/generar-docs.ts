/**
 * Genera los artefactos de documentación que deben coincidir con el código:
 *   - docs/casos-de-prueba.csv            (matriz de casos en CSV)
 *   - docs/02-casos-de-prueba.md          (matriz de casos en Markdown)
 *   - docs/03-requerimientos-y-trazabilidad.md  (bloque entre marcadores TRAZABILIDAD)
 *   - docs/09-hallazgo-de-defectos.md     (bloque entre marcadores DEFECTOS-CASOS)
 * La fuente de verdad son los propios tests (títulos, etiquetas y annotations) y test-data/.
 * Uso: npm run docs:casos
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { leerJson } from '../tests/support/datos';

const RAIZ = path.resolve(__dirname, '..');
const DOCS = path.join(RAIZ, 'docs');

interface Caso {
  id: string;
  descripcion: string;
  req: string;
  severidad: string;
  prioridad: string;
  tipo: string;
  etiquetas: string[];
  defecto: string;
  archivo: string;
  linea: number;
  proyectos: string[];
  pre: string;
  datos: string;
  pasos: string[];
  esperado: string;
}

interface SpecJson {
  title: string;
  file: string;
  line: number;
  tags?: string[];
  tests: { projectName: string; annotations?: { type: string; description?: string }[] }[];
}
interface SuiteJson {
  specs?: SpecJson[];
  suites?: SuiteJson[];
}

const PRIORIDAD: Record<string, string> = {
  blocker: 'Alta',
  critical: 'Alta',
  normal: 'Media',
  minor: 'Baja',
  trivial: 'Baja',
};
const TIPOS: [RegExp, string][] = [
  [/^CP-DD-/, 'Funcional (data-driven)'],
  [/^CP-API-/, 'API'],
  [/^CP-INT-/, 'Integración (API + UI)'],
  [/^CP-RED-/, 'Resiliencia (mocking de red)'],
  [/^CP-VIS-/, 'Regresión visual'],
  [/^CP-A11Y-/, 'Accesibilidad'],
  [/^CP-MOV-/, 'Móvil / responsive'],
  [/^CP-DEF-/, 'Detección de defecto'],
  [/^CP-/, 'Funcional (E2E)'],
];
const GRUPOS: [RegExp, string][] = [
  [/^CP-E2E-/, '1. Funcionales de extremo a extremo (E2E)'],
  [/^CP-DD-/, '2. Dirigidos por datos'],
  [/^CP-API-/, '3. API'],
  [/^CP-INT-/, '4. Integración API + UI'],
  [/^CP-RED-/, '5. Resiliencia: mocking e interceptación de red'],
  [/^CP-VIS-/, '6. Regresión visual'],
  [/^CP-A11Y-/, '7. Accesibilidad'],
  [/^CP-MOV-/, '8. Móvil / responsive'],
  [/^CP-DEF-/, '9. Detección de defectos intencionales'],
];

// ---------- 1. Lee los casos desde Playwright ----------
const salida = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json'], {
  cwd: RAIZ,
  encoding: 'utf8',
  shell: true,
  env: { ...process.env, BUGS: 'off' },
  maxBuffer: 64 * 1024 * 1024,
});
const arbol = JSON.parse(salida) as SuiteJson;
const casos = new Map<string, Caso>();
let totalEjecuciones = 0;
const detalle =
  leerJson<Record<string, { pre: string; datos: string; pasos: string[]; esperado: string }>>(
    'casos-detalle.json',
  );

const PRIORIDAD_FALTA = 'Falta el detalle del caso en test-data/casos-detalle.json';

function recorrer(s: SuiteJson): void {
  for (const spec of s.specs ?? []) {
    const id = /^(CP-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)/.exec(spec.title)?.[1];
    if (!id) continue;
    totalEjecuciones += spec.tests.length;
    const previo = casos.get(id);
    const nota = (tipo: string): string =>
      spec.tests[0]?.annotations?.find((a) => a.type === tipo)?.description ?? '';
    const proyectos = spec.tests.map((t) => t.projectName);
    if (previo) {
      previo.proyectos = [...new Set([...previo.proyectos, ...proyectos])];
      continue;
    }
    const det = detalle[id];
    if (!det) throw new Error(`${PRIORIDAD_FALTA}: ${id}`);
    const descripcion = spec.title.replace(id, '').trim();
    casos.set(id, {
      id,
      descripcion,
      req: nota('requerimiento'),
      severidad: nota('severidad'),
      prioridad: PRIORIDAD[nota('severidad')] ?? 'Media',
      tipo: TIPOS.find(([r]) => r.test(id))![1],
      etiquetas: spec.tags ?? [],
      defecto: nota('defecto'),
      archivo: `tests/${spec.file}`,
      linea: spec.line,
      proyectos,
      ...det,
    });
  }
  for (const hijo of s.suites ?? []) recorrer(hijo);
}
recorrer(arbol);

const lista = [...casos.values()].sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
const ejecuciones = totalEjecuciones;

// ---------- 2. CSV ----------
const csvCelda = (v: string): string => `"${v.replace(/"/g, '""')}"`;
const filasCsv = [
  [
    'ID',
    'Requerimiento',
    'Descripción',
    'Precondiciones',
    'Datos de prueba',
    'Pasos',
    'Resultado esperado',
    'Prioridad',
    'Tipo',
    'Etiquetas',
    'Defecto relacionado',
    'Test automatizado',
    'Proyectos',
  ],
  ...lista.map((c) => [
    c.id,
    c.req,
    c.descripcion,
    c.pre,
    c.datos,
    c.pasos.map((p, i) => `${i + 1}. ${p}`).join(' '),
    c.esperado,
    c.prioridad,
    c.tipo,
    c.etiquetas.join(' '),
    c.defecto,
    `${c.archivo}:${c.linea}`,
    c.proyectos.join(' '),
  ]),
];
fs.writeFileSync(
  path.join(DOCS, 'casos-de-prueba.csv'),
  '﻿' + filasCsv.map((f) => f.map(csvCelda).join(',')).join('\n') + '\n',
);

// ---------- 3. Markdown de la matriz ----------
const md = (s: string): string => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const porTipo = (t: string): number => lista.filter((c) => c.tipo === t).length;
let doc = `# 02 — Casos de prueba

> **Documento generado** por \`npm run docs:casos\` a partir de los tests (títulos, etiquetas y annotations) y de \`test-data/casos-detalle.json\`. No editar a mano: regenerar.
> Versión de la matriz: ver [11-actualizacion-documentos.md](11-actualizacion-documentos.md). Versión en CSV: [casos-de-prueba.csv](casos-de-prueba.csv).

## Resumen

- **${lista.length} casos de prueba** únicos y **${ejecuciones} ejecuciones** por proyecto (los casos web se ejecutan en Chromium, Firefox y WebKit; los móviles en Pixel 7 e iPhone 14; los de API una vez; los visuales solo en Chromium).
- Prioridad: **Alta** = severidad bloqueante o crítica · **Media** = normal · **Baja** = menor o trivial.
- Cada caso tiene un identificador trazable que aparece en el título del test, p. ej. \`CP-E2E-001\`. La convención está en [06-guia-de-pruebas.md](06-guia-de-pruebas.md).

| Tipo de prueba | Casos |
|---|---|
${[...new Set(lista.map((c) => c.tipo))].map((t) => `| ${t} | ${porTipo(t)} |`).join('\n')}
| **Total** | **${lista.length}** |

`;
for (const [regla, titulo] of GRUPOS) {
  const del = lista.filter((c) => regla.test(c.id));
  if (!del.length) continue;
  doc += `## ${titulo}\n\n| ID | Req. | Descripción | Precondiciones | Datos | Pasos | Resultado esperado | Prioridad | Tipo | Test automatizado |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const c of del) {
    const pasos = c.pasos.map((p, i) => `${i + 1}. ${md(p)}`).join('<br>');
    doc += `| **${c.id}**${c.defecto ? `<br>(${c.defecto})` : ''} | ${c.req} | ${md(c.descripcion)} | ${md(c.pre)} | ${md(c.datos)} | ${pasos} | ${md(c.esperado)} | ${c.prioridad} | ${c.tipo} | \`${c.archivo}:${c.linea}\` |\n`;
  }
  doc += '\n';
}
fs.writeFileSync(path.join(DOCS, '02-casos-de-prueba.md'), doc);

// ---------- 4. Bloques en docs 03 y 09 ----------
function reemplazarBloque(archivo: string, marca: string, contenido: string): void {
  const ruta = path.join(DOCS, archivo);
  const texto = fs.readFileSync(ruta, 'utf8');
  const re = new RegExp(`(<!-- ${marca}:INICIO -->)[\\s\\S]*?(<!-- ${marca}:FIN -->)`);
  if (!re.test(texto)) throw new Error(`Faltan los marcadores ${marca} en ${archivo}`);
  fs.writeFileSync(ruta, texto.replace(re, `$1\n${contenido}\n$2`));
}

const REQS = [...new Set(lista.flatMap((c) => c.req.split(/,\s*/)).filter(Boolean))].sort((a, b) =>
  a.localeCompare(b, 'es', { numeric: true }),
);
let trazabilidad =
  '### Matriz Requerimiento → Casos de prueba → Scripts\n\n| Requerimiento | Casos de prueba | N.º casos | Scripts (spec) |\n|---|---|---|---|\n';
for (const r of REQS) {
  const cs = lista.filter((c) => c.req.split(/,\s*/).includes(r));
  const scripts = [...new Set(cs.map((c) => c.archivo))].sort();
  trazabilidad += `| **${r}** | ${cs.map((c) => c.id).join(', ')} | ${cs.length} | ${scripts.map((s) => `\`${s}\``).join('<br>')} |\n`;
}
trazabilidad += '\n### Cobertura inversa: Script → Casos\n\n| Script | Casos | Tipo |\n|---|---|---|\n';
const scriptsOrden = [...new Set(lista.map((c) => c.archivo))].sort();
for (const s of scriptsOrden) {
  const cs = lista.filter((c) => c.archivo === s);
  trazabilidad += `| \`${s}\` | ${cs.length === 1 ? cs[0]!.id : `${cs.length} (${cs[0]!.id} … ${cs.at(-1)!.id})`} | ${cs[0]!.tipo} |\n`;
}
const sinReq = lista.filter((c) => !c.req);
trazabilidad += `\n**Verificación automática:** ${sinReq.length === 0 ? 'todos los casos tienen al menos un requerimiento asociado' : `casos sin requerimiento: ${sinReq.map((c) => c.id).join(', ')}`}; ${REQS.length} requerimientos con cobertura.`;
reemplazarBloque('03-requerimientos-y-trazabilidad.md', 'TRAZABILIDAD', trazabilidad);

const porDefecto = new Map<string, Caso[]>();
for (const c of lista.filter((x) => x.defecto))
  porDefecto.set(c.defecto, [...(porDefecto.get(c.defecto) ?? []), c]);
let tablaDef = '| Defecto | Casos que lo detectan | Tipo de detección |\n|---|---|---|\n';
for (const [d, cs] of [...porDefecto.entries()].sort()) {
  tablaDef += `| **${d}** | ${cs.map((c) => c.id).join(', ')} | ${[...new Set(cs.map((c) => c.tipo))].join(', ')} |\n`;
}
reemplazarBloque('09-hallazgo-de-defectos.md', 'DEFECTOS-CASOS', tablaDef.trimEnd());

console.log(
  `✔ ${lista.length} casos (${ejecuciones} ejecuciones) → docs/02-casos-de-prueba.md, docs/casos-de-prueba.csv, trazabilidad (${REQS.length} requerimientos) y defectos.`,
);
