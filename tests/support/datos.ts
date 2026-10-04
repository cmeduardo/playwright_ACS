import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

const DIR = path.resolve(__dirname, '..', '..', 'test-data');

export function leerJson<T>(archivo: string): T {
  return JSON.parse(fs.readFileSync(path.join(DIR, archivo), 'utf8')) as T;
}

export function leerCsv<T extends Record<string, string>>(archivo: string): T[] {
  return parse(fs.readFileSync(path.join(DIR, archivo), 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

/**
 * Pruebas dirigidas por datos dentro de UN solo caso: cada fila del dataset se ejecuta como un paso
 * (`test.step`) y las filas que fallan se acumulan para reportarlas todas juntas al final.
 * Así el caso sigue siendo uno solo, pero el reporte indica exactamente qué filas fallaron.
 */
export async function porCadaFila<T>(
  filas: T[],
  etiqueta: (fila: T) => string,
  ejecutar: (fila: T) => Promise<void>,
  paso: (titulo: string, cuerpo: () => Promise<void>) => Promise<void>,
): Promise<void> {
  const fallidas: string[] = [];
  for (const fila of filas) {
    const titulo = etiqueta(fila);
    try {
      await paso(titulo, () => ejecutar(fila));
    } catch (error) {
      const detalle = String((error as Error).message)
        // eslint-disable-next-line no-control-regex
        .replace(/\u001b\[[0-9;]*m/g, '')
        .split('\n')
        .find(
          (l) => l.trim().startsWith('Expected') || l.trim().startsWith('Received') || l.trim().length > 0,
        );
      fallidas.push(`${titulo} → ${detalle?.trim() ?? 'error'}`);
    }
  }
  if (fallidas.length) {
    throw new Error(
      `${fallidas.length} de ${filas.length} filas de datos fallaron:\n${fallidas.map((f) => `  - ${f}`).join('\n')}`,
    );
  }
}
