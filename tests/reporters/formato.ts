const dos = (n: number): string => String(n).padStart(2, '0');

/** Fecha y hora local legible (YYYY-MM-DD HH:MM:SS), coherente con el ID de ejecución. */
export function fechaLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

/** Resumen de una línea de un mensaje de error de Playwright: encabezado + Expected/Received si existen. */
export function resumenError(error: string | null, max = 140): string {
  if (!error) return '';
  const lineas = error.split('\n').map((l) => l.trim());
  const cabecera = (lineas[0] ?? '').replace(/^Error:\s*/, '');
  const esperado = lineas.find((l) => /^Expected( string| pattern| substring)?:/.test(l));
  const recibido = lineas.find((l) => /^Received( string| pattern)?:/.test(l));
  const texto = [cabecera, esperado, recibido].filter(Boolean).join(' · ');
  return texto.replace(/\|/g, '\\|').slice(0, max);
}
