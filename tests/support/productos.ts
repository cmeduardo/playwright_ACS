import { expect } from '@playwright/test';
import type { ApiClient } from './api-client';
import type { Producto } from './tipos';

/**
 * Localiza un producto por nombre exacto listando el catálogo completo.
 * No usa el parámetro `q` a propósito: así las pruebas de otras funciones no dependen
 * de la búsqueda (donde vive el defecto BUG-003) y se mantienen independientes.
 */
export async function productoPorNombre(api: ApiClient, nombre: string): Promise<Producto> {
  const productos = (await (await api.productos()).json()) as Producto[];
  const producto = productos.find((p) => p.name === nombre);
  expect(producto, `producto semilla "${nombre}"`).toBeDefined();
  return producto as Producto;
}
