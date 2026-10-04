-- TiendaQA - esquema de base de datos (SQLite)
-- Artefacto de ENTRADA: estructura de los datos de prueba.
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'admin')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  price       REAL    NOT NULL CHECK (price >= 0),
  category    TEXT    NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  emoji       TEXT    NOT NULL DEFAULT '📦'
);

CREATE TABLE coupons (
  code       TEXT PRIMARY KEY,
  type       TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value      REAL NOT NULL,
  min_amount REAL NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE carts (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  coupon  TEXT REFERENCES coupons(code)
);

CREATE TABLE cart_items (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE orders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  subtotal   REAL NOT NULL,
  discount   REAL NOT NULL DEFAULT 0,
  total      REAL NOT NULL,
  coupon     TEXT,
  status     TEXT NOT NULL DEFAULT 'Pagado',
  shipping   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  price      REAL    NOT NULL,
  quantity   INTEGER NOT NULL
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_user ON orders(user_id);
