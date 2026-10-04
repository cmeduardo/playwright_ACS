import { expect } from '@playwright/test';

type Tipo = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'string?';
export type Esquema = Record<string, Tipo>;

/** Valida que un objeto tenga exactamente los campos y tipos del esquema (validación de contrato). */
export function validarEsquema(objeto: unknown, esquema: Esquema, nombre = 'objeto'): void {
  expect(objeto, `${nombre} debe ser un objeto`).toEqual(expect.any(Object));
  const o = objeto as Record<string, unknown>;
  for (const [campo, tipo] of Object.entries(esquema)) {
    const valor = o[campo];
    if (tipo === 'string?') {
      expect(['string', 'object'], `${nombre}.${campo}`).toContain(valor === null ? 'object' : typeof valor);
    } else if (tipo === 'array') {
      expect(Array.isArray(valor), `${nombre}.${campo} debe ser arreglo`).toBe(true);
    } else {
      expect(typeof valor, `${nombre}.${campo} debe ser ${tipo}`).toBe(tipo);
    }
  }
}

export const ESQUEMA_PRODUCTO: Esquema = {
  id: 'number',
  name: 'string',
  description: 'string',
  price: 'number',
  category: 'string',
  stock: 'number',
  emoji: 'string',
};

export const ESQUEMA_USUARIO: Esquema = { id: 'number', name: 'string', email: 'string', role: 'string' };
export const ESQUEMA_SESION: Esquema = { token: 'string', user: 'object' };
export const ESQUEMA_CARRITO: Esquema = {
  items: 'array',
  coupon: 'string?',
  subtotal: 'number',
  discount: 'number',
  total: 'number',
};
export const ESQUEMA_PEDIDO: Esquema = {
  id: 'number',
  subtotal: 'number',
  discount: 'number',
  total: 'number',
  status: 'string',
  items: 'array',
};
