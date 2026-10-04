/** Convierte "Q1,350.00" o "-Q150.00" en número. */
export function aNumero(texto: string): number {
  const limpio = texto.replace(/[^\d.-]/g, '');
  return Number(limpio);
}
