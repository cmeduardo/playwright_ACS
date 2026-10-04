/**
 * Ayudas EXCLUSIVAS de los recorridos visuales (npm run navegador).
 * Hacen visible lo que Playwright hace: cursor, ondas de clic, subtítulos con cada paso y escritura letra por letra.
 * No se usan en la suite de regresión.
 *
 * Excepción documentada a la regla "cero esperas fijas": las pausas narrativas (`pausa`) existen solo aquí,
 * para que se alcance a leer cada paso; ninguna prueba de la suite las usa.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';

const PAUSA_MS = Number(process.env.RECORRIDOS_PAUSA ?? 900);
const ESCRITURA_MS = Number(process.env.RECORRIDOS_ESCRITURA ?? 55);
const FOTOS = process.env.RECORRIDOS_FOTOS; // carpeta opcional: guarda una captura por paso (útil para documentar)
let numeroFoto = 0;

export type TipoSubtitulo = 'paso' | 'ok' | 'error';

export async function pausa(ms: number = PAUSA_MS): Promise<void> {
  await new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Despliega la ventana del navegador en pantalla completa del sistema (maximizada; con RECORRIDOS_PANTALLA_COMPLETA=1, pantalla
 * completa tipo F11). Se pide a Chromium por CDP porque `--start-maximized` depende del gestor de ventanas.
 */
export async function maximizarVentana(page: Page): Promise<void> {
  if (process.env.RECORRIDOS_HEADLESS) return;
  try {
    const sesion = await page.context().newCDPSession(page);
    const { windowId } = await sesion.send('Browser.getWindowForTarget');
    const windowState = process.env.RECORRIDOS_PANTALLA_COMPLETA ? 'fullscreen' : 'maximized';
    await sesion.send('Browser.setWindowBounds', { windowId, bounds: { windowState } });
  } catch {
    /* sin ventana (p. ej. un servidor sin pantalla): se continúa con el tamaño disponible */
  }
}

/** Dibuja el escenario del recorrido en cada página: cursor, ondas de clic y barra de subtítulos. */
export async function instalarEscenario(page: Page, etiqueta: string, modoBugs: string): Promise<void> {
  await page.addInitScript(
    ({ etiqueta: id, modoBugs: modo }) => {
      const w = window as unknown as { __recListo?: boolean; __recSubtitulo?: () => void };
      if (w.__recListo) return;
      w.__recListo = true;

      const estilo = `
        #rec-cursor{position:fixed;left:0;top:0;width:34px;height:34px;z-index:2147483646;pointer-events:none;
          transition:transform .32s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));}
        .rec-onda{position:fixed;z-index:2147483645;pointer-events:none;width:12px;height:12px;margin:-6px 0 0 -6px;
          border:3px solid #0f0f0f;border-radius:50%;box-shadow:0 0 0 2px #fff,inset 0 0 0 2px #fff;animation:rec-onda .7s ease-out forwards;}
        @keyframes rec-onda{to{transform:scale(7);opacity:0;}}
        .rec-resalte{outline:3px solid #0f0f0f !important;outline-offset:4px !important;box-shadow:0 0 0 8px rgba(255,255,255,.85) !important;transition:outline .1s;}
        #rec-barra{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:none;display:flex;align-items:stretch;
          min-height:64px;background:#0f0f0f;color:#fff;font-family:'Plex Sans',system-ui,sans-serif;font-size:20px;
          border-top:1px solid #fff;}
        #rec-barra .id{background:#fff;color:#0f0f0f;font-family:'Plex Mono',monospace;font-weight:500;font-size:14px;
          display:flex;align-items:center;padding:0 20px;letter-spacing:.04em;}
        #rec-barra .txt{flex:1;display:flex;align-items:center;padding:8px 24px;line-height:1.25;}
        #rec-barra .modo{font-family:'Plex Mono',monospace;font-size:13px;display:flex;align-items:center;padding:0 20px;
          color:#bdbdbd;border-left:1px solid rgba(255,255,255,.3);}
        #rec-barra.ok .txt{font-style:italic;}
        #rec-barra.error{background:#fff;color:#0f0f0f;border-top:6px solid #0f0f0f;font-weight:600;}
        #rec-barra.error .id{background:#0f0f0f;color:#fff;}
        #rec-barra.error .modo{color:#0f0f0f;border-left-color:#0f0f0f;}`;

      const montar = (): void => {
        const hoja = document.createElement('style');
        hoja.textContent = estilo;
        document.documentElement.appendChild(hoja);

        const cursor = document.createElement('div');
        cursor.id = 'rec-cursor';
        cursor.style.transform = 'translate(-60px,-60px)';
        cursor.innerHTML =
          '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.2 L17.5 13.2 Z" fill="#0f0f0f" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        document.documentElement.appendChild(cursor);

        const barra = document.createElement('div');
        barra.id = 'rec-barra';
        barra.innerHTML = `<div class="id"></div><div class="txt"></div><div class="modo"></div>`;
        (barra.querySelector('.id') as HTMLElement).textContent = id;
        (barra.querySelector('.modo') as HTMLElement).textContent = `app: BUGS=${modo}`;
        document.documentElement.appendChild(barra);

        const pintar = (): void => {
          let datos: { t?: string; k?: string } = {};
          try {
            datos = JSON.parse(sessionStorage.getItem('rec-subtitulo') ?? '{}');
          } catch {
            /* sin subtítulo */
          }
          (barra.querySelector('.txt') as HTMLElement).textContent = datos.t ?? 'Preparando el recorrido…';
          barra.className = datos.k ?? '';
        };
        w.__recSubtitulo = pintar;
        pintar();

        document.addEventListener(
          'mousemove',
          (e) => {
            cursor.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`;
          },
          true,
        );
        document.addEventListener(
          'mousedown',
          (e) => {
            const onda = document.createElement('div');
            onda.className = 'rec-onda';
            onda.style.left = `${e.clientX}px`;
            onda.style.top = `${e.clientY}px`;
            document.documentElement.appendChild(onda);
            setTimeout(() => onda.remove(), 800);
          },
          true,
        );
        document.addEventListener(
          'focusin',
          (e) => (e.target as HTMLElement).classList?.add('rec-resalte'),
          true,
        );
        document.addEventListener(
          'focusout',
          (e) => (e.target as HTMLElement).classList?.remove('rec-resalte'),
          true,
        );
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
      else montar();
    },
    { etiqueta, modoBugs },
  );
}

/** Muestra un subtítulo con el paso actual (persiste entre navegaciones) y espera para que se lea. */
export async function narrar(
  page: Page,
  texto: string,
  tipo: TipoSubtitulo = 'paso',
  espera: number = PAUSA_MS,
): Promise<void> {
  const clase = tipo === 'paso' ? '' : tipo;
  await page.evaluate(
    ([t, k]) => {
      sessionStorage.setItem('rec-subtitulo', JSON.stringify({ t, k }));
      (window as unknown as { __recSubtitulo?: () => void }).__recSubtitulo?.();
    },
    [texto, clase],
  );
  if (FOTOS) {
    fs.mkdirSync(FOTOS, { recursive: true });
    numeroFoto += 1;
    await page.screenshot({ path: path.join(FOTOS, `${String(numeroFoto).padStart(2, '0')}.png`) });
  }
  await pausa(espera);
}

/** Escribe como una persona: clic en el campo y teclas una por una. */
export async function escribir(campo: Locator, texto: string): Promise<void> {
  await campo.click();
  await campo.pressSequentially(texto, { delay: ESCRITURA_MS });
}

/** Resalta un elemento unos instantes (para señalar un resultado). */
export async function resaltar(elemento: Locator, ms: number = 1600): Promise<void> {
  await elemento.evaluate((nodo) => nodo.classList.add('rec-resalte'));
  await pausa(ms);
  await elemento.evaluate((nodo) => nodo.classList.remove('rec-resalte'));
}
