import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

/**
 * Ejecuta axe-core (WCAG 2.0/2.1 A y AA), adjunta el detalle al reporte y DEVUELVE las violaciones
 * como texto (lista vacía = cumple). No lanza error: así un solo caso puede auditar varias pantallas
 * y reportar todas las fallas juntas.
 */
export async function analizarAccesibilidad(
  page: Page,
  testInfo: TestInfo,
  nombre: string,
): Promise<string[]> {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  await testInfo.attach(`axe-${nombre}.json`, {
    body: JSON.stringify(resultado.violations, null, 2),
    contentType: 'application/json',
  });

  return resultado.violations.map(
    (v) => `${nombre}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} elemento(s))`,
  );
}
