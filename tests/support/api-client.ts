import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { DatosEnvio, DatosPago, ProductoNuevo } from './tipos';

/** Cliente tipado de la API de TiendaQA. Devuelve APIResponse para que cada test valide estados y cuerpos. */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    readonly token?: string,
  ) {}

  /** Mismo cliente pero sin token (para pruebas de autenticación). */
  sinToken(): ApiClient {
    return new ApiClient(this.request);
  }

  conToken(token: string): ApiClient {
    return new ApiClient(this.request, token);
  }

  private get headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // ----- auth -----
  login(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/api/auth/login', { data: { email, password } });
  }
  registrar(name: string, email: string, password: string): Promise<APIResponse> {
    return this.request.post('/api/auth/register', { data: { name, email, password } });
  }
  yo(): Promise<APIResponse> {
    return this.request.get('/api/auth/me', { headers: this.headers });
  }
  logout(): Promise<APIResponse> {
    return this.request.post('/api/auth/logout', { headers: this.headers });
  }

  // ----- productos -----
  productos(params: Record<string, string | number> = {}): Promise<APIResponse> {
    return this.request.get('/api/products', { params });
  }
  producto(id: number | string): Promise<APIResponse> {
    return this.request.get(`/api/products/${id}`);
  }
  crearProducto(data: Partial<ProductoNuevo> | Record<string, unknown>): Promise<APIResponse> {
    return this.request.post('/api/products', { data, headers: this.headers });
  }
  actualizarProducto(id: number, data: Record<string, unknown>): Promise<APIResponse> {
    return this.request.put(`/api/products/${id}`, { data, headers: this.headers });
  }
  eliminarProducto(id: number): Promise<APIResponse> {
    return this.request.delete(`/api/products/${id}`, { headers: this.headers });
  }

  // ----- carrito -----
  carrito(): Promise<APIResponse> {
    return this.request.get('/api/cart', { headers: this.headers });
  }
  agregarAlCarrito(productId: number, quantity = 1): Promise<APIResponse> {
    return this.request.post('/api/cart/items', { data: { productId, quantity }, headers: this.headers });
  }
  cambiarCantidad(productId: number, quantity: number): Promise<APIResponse> {
    return this.request.patch(`/api/cart/items/${productId}`, { data: { quantity }, headers: this.headers });
  }
  quitarDelCarrito(productId: number): Promise<APIResponse> {
    return this.request.delete(`/api/cart/items/${productId}`, { headers: this.headers });
  }
  aplicarCupon(code: string): Promise<APIResponse> {
    return this.request.post('/api/cart/coupon', { data: { code }, headers: this.headers });
  }

  quitarCupon(): Promise<APIResponse> {
    return this.request.delete('/api/cart/coupon', { headers: this.headers });
  }

  // ----- pedidos -----
  crearPedido(shipping: DatosEnvio, payment: DatosPago): Promise<APIResponse> {
    return this.request.post('/api/orders', { data: { shipping, payment }, headers: this.headers });
  }
  pedidos(todos = false): Promise<APIResponse> {
    return this.request.get('/api/orders', { params: todos ? { all: '1' } : {}, headers: this.headers });
  }
  pedido(id: number): Promise<APIResponse> {
    return this.request.get(`/api/orders/${id}`, { headers: this.headers });
  }
}
