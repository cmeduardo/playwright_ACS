// Verifica la documentación: enlaces relativos entre documentos y existencia de los 12 artefactos.
//   npm run docs:verificar
const fs = require('fs');
const path = require('path');

const docs = path.resolve(__dirname, '..', 'docs');
const esperados = [
  '00-guia-del-proyecto.md', '01-plan-de-pruebas.md', '02-casos-de-prueba.md', '03-requerimientos-y-trazabilidad.md', '04-modelo-de-diseno.md',
  '05-datos-de-prueba.md', '06-guia-de-pruebas.md', '07-configuracion-ambiente.md', '08-bitacora-y-reportes.md',
  '09-hallazgo-de-defectos.md', '10-solicitud-de-cambios.md', '11-actualizacion-documentos.md',
  '12-playwright-ventajas-limitaciones.md', 'casos-de-prueba.csv',
];

let errores = 0;
for (const f of esperados) {
  if (!fs.existsSync(path.join(docs, f))) {
    console.log(`FALTA  ${f}`);
    errores++;
  }
}
let enlaces = 0;
let diagramas = 0;
for (const f of fs.readdirSync(docs).filter((x) => x.endsWith('.md'))) {
  const texto = fs.readFileSync(path.join(docs, f), 'utf8');
  diagramas += (texto.match(/```mermaid/g) || []).length;
  // Se ignoran los bloques de código para no confundir ejemplos con enlaces reales.
  const sinCodigo = texto.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  for (const m of sinCodigo.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    const destino = m[1];
    if (/^(https?:|mailto:)/.test(destino)) continue;
    enlaces++;
    if (!fs.existsSync(path.join(docs, destino))) {
      console.log(`ENLACE ROTO  ${f} -> ${destino}`);
      errores++;
    }
  }
  if (/<!-- [A-Z-]+:INICIO -->\s*<!-- [A-Z-]+:FIN -->/.test(texto)) {
    console.log(`BLOQUE VACÍO  ${f}: ejecuta npm run docs:casos`);
    errores++;
  }
}
console.log(`${esperados.length} artefactos esperados · ${enlaces} enlaces relativos · ${diagramas} diagramas Mermaid · ${errores} problema(s)`);
process.exit(errores ? 1 : 0);
