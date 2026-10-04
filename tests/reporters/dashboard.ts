import fs from 'node:fs';
import path from 'node:path';
import { abrirBitacora, BITACORA_DB, leerDefectos, leerEjecuciones, REPORTES_DIR } from './bitacora-db';

const CHART_JS = path.resolve(__dirname, '..', '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js');
const FUENTES = path.resolve(__dirname, '..', '..', 'app', 'public', 'fonts');

interface FilaNavegador {
  navegador: string;
  exitosas: number;
  fallidas: number;
  inestables: number;
  omitidas: number;
  duracion_prom_ms: number;
}

/** Genera un dashboard HTML autocontenido (Chart.js y datos embebidos) a partir de la bitácora SQLite. */
export function generarDashboard(
  archivoDb = BITACORA_DB,
  salida = path.join(REPORTES_DIR, 'dashboard', 'index.html'),
): string {
  const db = abrirBitacora(archivoDb, true);
  const ejecuciones = leerEjecuciones(db);
  const detalle = Object.fromEntries(
    ejecuciones.map((e) => {
      const porNavegador = db
        .prepare(
          `SELECT navegador,
                  SUM(estado = 'Exitoso') AS exitosas, SUM(estado = 'Fallido') AS fallidas,
                  SUM(estado = 'Inestable') AS inestables, SUM(estado = 'Omitido') AS omitidas,
                  CAST(AVG(duracion_ms) AS INTEGER) AS duracion_prom_ms
           FROM test_logs WHERE id_ejecucion = ? GROUP BY navegador ORDER BY navegador`,
        )
        .all(e.id_ejecucion) as FilaNavegador[];
      const porDefecto = db
        .prepare(
          `SELECT COALESCE(defecto, id_caso) AS clave, COUNT(*) AS n FROM test_logs
           WHERE id_ejecucion = ? AND estado = 'Fallido' GROUP BY clave ORDER BY n DESC`,
        )
        .all(e.id_ejecucion);
      const fallidos = db
        .prepare(
          `SELECT id_caso, navegador, severidad, defecto, substr(error, 1, 140) AS error
           FROM test_logs WHERE id_ejecucion = ? AND estado = 'Fallido' ORDER BY id_caso, navegador LIMIT 200`,
        )
        .all(e.id_ejecucion);
      const lentos = db
        .prepare(
          `SELECT id_caso, navegador, duracion_ms FROM test_logs WHERE id_ejecucion = ? ORDER BY duracion_ms DESC LIMIT 8`,
        )
        .all(e.id_ejecucion);
      return [e.id_ejecucion, { porNavegador, porDefecto, fallidos, lentos }];
    }),
  );
  const datos = { generado: new Date().toISOString(), ejecuciones, detalle, defectos: leerDefectos(db) };
  db.close();

  const chartJs = fs.readFileSync(CHART_JS, 'utf8').replace(/<\/script/gi, '<\\/script');
  const fuente = (archivo: string, familia: string, peso: number, estilo = 'normal'): string =>
    `@font-face{font-family:'${familia}';font-weight:${peso};font-style:${estilo};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(FUENTES, archivo)).toString('base64')}) format('woff2');}`;
  const fuentes = [
    fuente('instrument-serif-latin-400-normal.woff2', 'Instrument Serif', 400),
    fuente('instrument-serif-latin-400-italic.woff2', 'Instrument Serif', 400, 'italic'),
    fuente('ibm-plex-sans-latin-400-normal.woff2', 'Plex Sans', 400),
    fuente('ibm-plex-sans-latin-600-normal.woff2', 'Plex Sans', 600),
    fuente('ibm-plex-mono-latin-400-normal.woff2', 'Plex Mono', 400),
    fuente('ibm-plex-mono-latin-500-normal.woff2', 'Plex Mono', 500),
  ].join('\n');
  const json = JSON.stringify(datos).replace(/</g, '\\u003c');
  const html = PLANTILLA.replace('/*__CHART_JS__*/', () => chartJs)
    .replace('/*__DATOS__*/', () => `const DATOS = ${json};`)
    .replace('/*__FONTS__*/', () => fuentes);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, html);
  return salida;
}

const PLANTILLA = /* html */ `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Dashboard de pruebas · TiendaQA</title>
<style>
/*__FONTS__*/
  :root { --bg:#f4f4f4; --card:#ffffff; --text:#0f0f0f; --muted:#595959; --border:#0f0f0f; --hair:#d4d4d4; --gris:#e8e8e8; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Plex Sans',system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; }
  header { padding:48px 32px 8px; max-width:1240px; margin:0 auto; }
  .eyebrow { font-family:'Plex Mono',monospace; font-size:.74rem; letter-spacing:.08em; color:var(--muted); margin:0; }
  h1 { font-family:'Instrument Serif',Georgia,serif; font-weight:400; margin:6px 0 10px; font-size:clamp(3rem,7vw,5rem); line-height:.95; letter-spacing:-.015em; }
  h1 em, h2 em { font-style:italic; color:var(--muted); }
  h2 { font-family:'Instrument Serif',Georgia,serif; font-weight:400; font-size:1.9rem; line-height:1; margin:0 0 16px; padding-bottom:12px; border-bottom:1px solid var(--border); letter-spacing:-.01em; }
  .sub { color:var(--muted); font-family:'Plex Mono',monospace; font-size:.74rem; padding-top:14px; }
  main { max-width:1240px; margin:0 auto; padding:24px 32px 96px; display:grid; gap:56px; }
  .card { min-width:0; }
  .grid-kpi { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); border-top:1px solid var(--border); }
  .kpi { padding:18px 20px 16px 0; }
  .kpi .v { font-family:'Instrument Serif',Georgia,serif; font-size:3.2rem; line-height:1; letter-spacing:-.02em; }
  .kpi .l { color:var(--muted); font-family:'Plex Mono',monospace; font-size:.72rem; margin-bottom:6px; }
  .kpi .d { font-family:'Plex Mono',monospace; font-size:.7rem; color:var(--muted); }
  .fail { background:var(--text); color:#fff; padding:0 .3em; font-weight:600; }
  th.fail { background:none; color:var(--text); padding:11px 14px 8px 0; box-shadow:inset 0 -3px 0 var(--text); }
  td.fail { background:none; color:var(--text); padding:11px 14px 11px 0; font-weight:700; }
  .ok { color:var(--text); } .warn { font-style:italic; }
  .grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:48px 56px; }
  .chart { position:relative; height:280px; }
  table { width:100%; border-collapse:collapse; font-size:.86rem; }
  th,td { text-align:left; padding:11px 14px 11px 0; border-bottom:1px solid var(--hair); vertical-align:top; }
  th { font-family:'Plex Mono',monospace; font-size:.7rem; font-weight:500; color:var(--muted); border-bottom:1px solid var(--border); }
  .scroll { overflow-x:auto; }
  select { font:inherit; padding:8px 28px 8px 0; border:0; border-bottom:1px solid var(--border); border-radius:0; background:transparent; color:var(--text); }
  .pill { display:inline-block; padding:0 10px; font-family:'Plex Mono',monospace; font-size:.7rem; border:1px solid var(--border); border-radius:99px; }
  .pill.fail { background:var(--text); color:#fff; }
  .vacio { color:var(--muted); padding:28px 0; font-family:'Plex Mono',monospace; font-size:.8rem; }
  code { background:var(--gris); padding:1px 6px; font-family:'Plex Mono',monospace; font-size:.85em; }
  .titulo-sel { display:flex; gap:20px; align-items:baseline; flex-wrap:wrap; margin-bottom:14px; } .titulo-sel h2 { margin:0; border:0; padding:0; }
  small { font-family:'Plex Mono',monospace; color:var(--muted); font-size:.68rem; }
</style>
</head>
<body>
<header>
  <p class="eyebrow">TiendaQA · tablero de calidad</p>
  <h1>Ejecución de <em>pruebas</em></h1>
  <div class="sub" id="generado"></div>
</header>
<main id="app"></main>
<script>/*__CHART_JS__*/</script>
<script>
/*__DATOS__*/
const C = { ok:'#d0d0d0', fail:'#0f0f0f', warn:'#7a7a7a', skip:'#ededed', accent:'#0f0f0f', on:'#0f0f0f', off:'#d0d0d0' };
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const $ = (id) => document.getElementById(id);
const pct = (a,b) => b ? (a/b*100) : 0;
const fmtDur = (ms) => { const s = Math.round(ms/1000); return s >= 60 ? Math.floor(s/60)+' min '+(s%60)+' s' : s+' s'; };
const fmtFecha = (iso) => { const d = new Date(iso), p = (n) => String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); };
const tasaDe = (e) => pct(e.exitosas + e.inestables, e.total - e.omitidas);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const charts = {};
function dibujar(id, config) {
  if (charts[id]) charts[id].destroy();
  Chart.defaults.color = css('--muted'); Chart.defaults.borderColor = 'rgba(15,15,15,.12)'; Chart.defaults.font.family = "'Plex Sans', system-ui, sans-serif"; Chart.defaults.datasets.bar.borderColor = '#0f0f0f'; Chart.defaults.datasets.bar.borderWidth = 1;
  charts[id] = new Chart($(id), config);
}

const E = DATOS.ejecuciones;
$('generado').textContent = 'Fuente: reports/bitacora.db · Generado el ' + fmtFecha(DATOS.generado) + ' · ' + E.length + ' ejecución(es) registradas';

if (!E.length) {
  $('app').innerHTML = '<div class="card vacio">Aún no hay ejecuciones en la bitácora. Ejecuta <code>npm test</code> y vuelve a generar el dashboard.</div>';
} else {
  const ultima = (modo) => [...E].reverse().find((e) => e.modo_bugs === modo && e.alcance === 'completa') || [...E].reverse().find((e) => e.modo_bugs === modo);
  const on = ultima('on'), off = ultima('off');
  const etiqueta = (e) => e.id_ejecucion.replace('EJ-','') + ' · BUGS=' + e.modo_bugs;

  $('app').innerHTML = \`
  <section class="card">
    <div class="titulo-sel">
      <h2>Ejecución seleccionada</h2>
      <select id="sel" aria-label="Seleccionar ejecución">\${[...E].reverse().map((e) => '<option value="'+e.id_ejecucion+'">'+esc(etiqueta(e))+(e.alcance==='parcial'?' (parcial)':'')+'</option>').join('')}</select>
    </div>
    <div class="grid-kpi" id="kpis"></div>
  </section>

  <section class="card" id="comparativa">
    <h2>Evolución: encontrar el defecto → corregir → regresión en verde</h2>
    <div id="comp-contenido"></div>
  </section>

  <div class="grid-2">
    <section class="card"><h2>Historial de ejecuciones</h2><div class="chart"><canvas id="c-hist"></canvas></div></section>
    <section class="card"><h2>Tasa de éxito y duración por ejecución</h2><div class="chart"><canvas id="c-tasa"></canvas></div></section>
    <section class="card"><h2>Aprobadas / fallidas por navegador (ejecución seleccionada)</h2><div class="chart"><canvas id="c-nav"></canvas></div></section>
    <section class="card"><h2>Duración promedio por navegador (ms)</h2><div class="chart"><canvas id="c-dur"></canvas></div></section>
    <section class="card"><h2>Fallos por defecto (ejecución seleccionada)</h2><div class="chart"><canvas id="c-def"></canvas></div></section>
    <section class="card"><h2>Pruebas más lentas (ejecución seleccionada)</h2><div class="chart"><canvas id="c-lentos"></canvas></div></section>
  </div>

  <section class="card"><h2>Defectos registrados</h2><div class="scroll" id="t-def"></div></section>
  <section class="card"><h2>Casos fallidos de la ejecución seleccionada</h2><div class="scroll" id="t-fail"></div></section>
  <section class="card"><h2>Historial de ejecuciones (bitácora)</h2><div class="scroll" id="t-hist"></div></section>\`;

  // ---- Comparativa BUGS=on vs BUGS=off ----
  function comparativa() {
    if (!on || !off) {
      $('comp-contenido').innerHTML = '<div class="vacio">Para ver la evolución ejecuta una corrida con <code>BUGS=on</code> y otra con <code>BUGS=off</code> (<code>npm run ciclo:completo</code>).</div>';
      return;
    }
    const fila = (n, a, b) => '<tr><td>'+n+'</td><td>'+a+'</td><td>'+b+'</td></tr>';
    $('comp-contenido').innerHTML = \`<div class="grid-2">
      <div class="scroll"><table><thead><tr><th>Métrica</th><th class="fail">BUGS=on<br><small>\${esc(on.id_ejecucion)}</small></th><th class="ok">BUGS=off<br><small>\${esc(off.id_ejecucion)}</small></th></tr></thead><tbody>
        \${fila('Pruebas ejecutadas', on.total, off.total)}
        \${fila('Exitosas', on.exitosas, off.exitosas)}
        \${fila('Fallidas', '<b class="fail">'+on.fallidas+'</b>', '<b class="ok">'+off.fallidas+'</b>')}
        \${fila('Tasa de éxito', tasaDe(on).toFixed(1)+' %', tasaDe(off).toFixed(1)+' %')}
        \${fila('Duración', fmtDur(on.duracion_ms), fmtDur(off.duracion_ms))}
      </tbody></table></div>
      <div class="chart"><canvas id="c-comp"></canvas></div></div>\`;
    const navs = [...new Set([...DATOS.detalle[on.id_ejecucion].porNavegador, ...DATOS.detalle[off.id_ejecucion].porNavegador].map((n) => n.navegador))];
    const tasaNav = (e) => navs.map((n) => { const f = DATOS.detalle[e.id_ejecucion].porNavegador.find((x) => x.navegador === n); return f ? +pct(f.exitosas + f.inestables, f.exitosas + f.inestables + f.fallidas).toFixed(1) : 0; });
    dibujar('c-comp', { type:'bar', data:{ labels:navs, datasets:[
      { label:'BUGS=on', data:tasaNav(on), backgroundColor:C.on },
      { label:'BUGS=off', data:tasaNav(off), backgroundColor:C.off } ] },
      options:{ maintainAspectRatio:false, scales:{ y:{ min:0, max:100, title:{ display:true, text:'Tasa de éxito (%)' } } }, plugins:{ title:{ display:true, text:'Tasa de éxito por navegador' } } } });
  }
  comparativa();

  // ---- Gráficas globales ----
  dibujar('c-hist', { type:'bar', data:{ labels:E.map((e) => e.id_ejecucion.replace('EJ-','')+' '+e.modo_bugs), datasets:[
    { label:'Exitosas', data:E.map((e) => e.exitosas), backgroundColor:C.ok },
    { label:'Inestables', data:E.map((e) => e.inestables), backgroundColor:C.warn },
    { label:'Fallidas', data:E.map((e) => e.fallidas), backgroundColor:C.fail },
    { label:'Omitidas', data:E.map((e) => e.omitidas), backgroundColor:C.skip } ] },
    options:{ maintainAspectRatio:false, scales:{ x:{ stacked:true }, y:{ stacked:true } } } });
  dibujar('c-tasa', { data:{ labels:E.map((e) => e.id_ejecucion.replace('EJ-','')+' '+e.modo_bugs), datasets:[
    { type:'line', label:'Tasa de éxito (%)', data:E.map((e) => +tasaDe(e).toFixed(1)), borderColor:C.accent, backgroundColor:C.accent, yAxisID:'y', tension:.2 },
    { type:'bar', label:'Duración (s)', data:E.map((e) => Math.round(e.duracion_ms/1000)), backgroundColor:'rgba(15,15,15,.12)', yAxisID:'y1' } ] },
    options:{ maintainAspectRatio:false, scales:{ x:{ ticks:{ autoSkip:false, maxRotation:60 } }, y:{ min:0, max:100, position:'left', title:{ display:true, text:'%' } }, y1:{ position:'right', grid:{ drawOnChartArea:false }, title:{ display:true, text:'segundos' } } } } });

  // ---- Tablas ----
  $('t-hist').innerHTML = '<table><thead><tr><th>ID</th><th>Inicio</th><th>BUGS</th><th>Alcance</th><th>Total</th><th>Exitosas</th><th>Fallidas</th><th>Tasa</th><th>Duración</th></tr></thead><tbody>' +
    [...E].reverse().map((e) => '<tr><td>'+esc(e.id_ejecucion)+'</td><td>'+fmtFecha(e.fecha_inicio)+'</td><td><span class="pill '+(e.modo_bugs==='on'?'fail':'ok')+'">'+e.modo_bugs+'</span></td><td>'+e.alcance+'</td><td>'+e.total+'</td><td>'+e.exitosas+'</td><td class="'+(e.fallidas?'fail':'')+'">'+e.fallidas+'</td><td>'+tasaDe(e).toFixed(1)+' %</td><td>'+fmtDur(e.duracion_ms)+'</td></tr>').join('') + '</tbody></table>';
  $('t-def').innerHTML = DATOS.defectos.length ? '<table><thead><tr><th>ID</th><th>Título</th><th>Severidad</th><th>Estado</th><th>Detectado</th><th>Cerrado</th></tr></thead><tbody>' +
    DATOS.defectos.map((d) => '<tr><td><b>'+d.codigo+'</b><br><small>'+esc(d.clave)+'</small></td><td>'+esc(d.titulo)+'</td><td>'+esc(d.severidad)+'</td><td><span class="pill '+(d.estado==='Abierto'?'fail':'ok')+'">'+d.estado+'</span></td><td>'+esc(d.ejecucion_detectado)+'</td><td>'+esc(d.ejecucion_cierre||'—')+'</td></tr>').join('') + '</tbody></table>' : '<div class="vacio">Sin defectos registrados.</div>';

  // ---- Vista de la ejecución seleccionada ----
  function seleccionar(id) {
    const e = E.find((x) => x.id_ejecucion === id), d = DATOS.detalle[id];
    const ant = E[E.indexOf(e) - 1];
    const delta = (a, b, mejorSiSube) => { if (b == null) return ''; const x = a - b; if (!x) return '<span class="d">= sin cambio</span>'; const bueno = mejorSiSube ? x > 0 : x < 0; return '<span class="d '+(bueno?'ok':'fail')+'">'+(x>0?'▲ +':'▼ ')+x+' vs anterior</span>'; };
    $('kpis').innerHTML = [
      ['Pruebas ejecutadas', e.total - e.omitidas, delta(e.total, ant?.total, true), ''],
      ['Exitosas', e.exitosas, delta(e.exitosas, ant?.exitosas, true), 'ok'],
      ['Fallidas', e.fallidas, delta(e.fallidas, ant?.fallidas, false), e.fallidas ? 'fail' : 'ok'],
      ['Tasa de éxito', tasaDe(e).toFixed(1)+' %', '', tasaDe(e) >= 95 ? 'ok' : 'fail'],
      ['Duración total', fmtDur(e.duracion_ms), '', ''],
      ['Modo de la app', 'BUGS='+e.modo_bugs, '<span class="d">'+e.alcance+'</span>', e.modo_bugs === 'on' ? 'fail' : 'ok'],
    ].map(([l, v, dd, cls]) => '<div class="kpi"><div class="l">'+l+'</div><div class="v '+cls+'">'+v+'</div>'+dd+'</div>').join('');

    const navs = d.porNavegador;
    dibujar('c-nav', { type:'bar', data:{ labels:navs.map((n) => n.navegador), datasets:[
      { label:'Exitosas', data:navs.map((n) => n.exitosas + n.inestables), backgroundColor:C.ok },
      { label:'Fallidas', data:navs.map((n) => n.fallidas), backgroundColor:C.fail },
      { label:'Omitidas', data:navs.map((n) => n.omitidas), backgroundColor:C.skip } ] },
      options:{ maintainAspectRatio:false, scales:{ x:{ stacked:true }, y:{ stacked:true } } } });
    dibujar('c-dur', { type:'bar', data:{ labels:navs.map((n) => n.navegador), datasets:[{ label:'ms promedio por prueba', data:navs.map((n) => n.duracion_prom_ms), backgroundColor:C.accent }] },
      options:{ maintainAspectRatio:false, plugins:{ legend:{ display:false } } } });
    dibujar('c-def', { type:'bar', data:{ labels:d.porDefecto.map((x) => x.clave), datasets:[{ label:'Ejecuciones de prueba fallidas', data:d.porDefecto.map((x) => x.n), backgroundColor:C.fail }] },
      options:{ indexAxis:'y', maintainAspectRatio:false, plugins:{ legend:{ display:false }, title:{ display:!d.porDefecto.length, text:'Sin fallos en esta ejecución' } } } });
    dibujar('c-lentos', { type:'bar', data:{ labels:d.lentos.map((x) => x.id_caso+' ('+x.navegador+')'), datasets:[{ label:'ms', data:d.lentos.map((x) => x.duracion_ms), backgroundColor:C.warn }] },
      options:{ indexAxis:'y', maintainAspectRatio:false, plugins:{ legend:{ display:false } } } });
    $('t-fail').innerHTML = d.fallidos.length ? '<table><thead><tr><th>Caso</th><th>Navegador</th><th>Severidad</th><th>Defecto</th><th>Error</th></tr></thead><tbody>' +
      d.fallidos.map((f) => '<tr><td>'+esc(f.id_caso)+'</td><td>'+esc(f.navegador)+'</td><td>'+esc(f.severidad||'—')+'</td><td>'+esc(f.defecto||'—')+'</td><td>'+esc((f.error||'').split('\\n')[0])+'</td></tr>').join('') + '</tbody></table>' : '<div class="vacio ok">Sin casos fallidos en esta ejecución.</div>';
  }
  $('sel').addEventListener('change', (ev) => seleccionar(ev.target.value));
  seleccionar(E[E.length - 1].id_ejecucion);
}
</script>
</body>
</html>`;
