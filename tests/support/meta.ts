/**
 * Metadatos de trazabilidad de cada caso de prueba.
 * Se publican como annotations de Playwright y los reporteres (Allure, bitácora) los leen.
 */
export type Severidad = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export interface Meta {
  /** Requerimiento(s) que valida el caso (ver docs/03-requerimientos-y-trazabilidad.md). */
  req: string;
  severidad: Severidad;
  epica: string;
  feature: string;
  /** Defecto intencional que este caso detecta (solo pruebas de detección). */
  defecto?: string;
}

export function meta(m: Meta): { type: string; description: string }[] {
  const out = [
    { type: 'requerimiento', description: m.req },
    { type: 'severidad', description: m.severidad },
    { type: 'epica', description: m.epica },
    { type: 'feature', description: m.feature },
  ];
  if (m.defecto) out.push({ type: 'defecto', description: m.defecto });
  return out;
}
