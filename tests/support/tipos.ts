export interface Usuario {
  id: number;
  name: string;
  email: string;
  role: 'cliente' | 'admin';
}

export interface Producto {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  emoji: string;
}

export type ProductoNuevo = Pick<Producto, 'name' | 'price' | 'category' | 'stock'> &
  Partial<Pick<Producto, 'description' | 'emoji'>>;

export interface LineaCarrito {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Carrito {
  items: LineaCarrito[];
  coupon: string | null;
  subtotal: number;
  discount: number;
  total: number;
}

export interface DatosEnvio {
  nombre: string;
  email: string;
  direccion: string;
  telefono: string;
}

export interface DatosPago {
  tarjeta: string;
  vencimiento: string;
  cvv: string;
}

export interface Pedido {
  id: number;
  total: number;
  subtotal: number;
  discount: number;
  status: string;
  items: { productId: number; name: string; price: number; quantity: number }[];
}

export interface Sesion {
  token: string;
  user: Usuario;
}
