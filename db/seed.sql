-- TiendaQA - datos semilla (artefacto de ENTRADA: datos de prueba)
-- Contraseñas: admin -> Admin123!   clientes -> Cliente123!
-- Hash = sha256('tiendaqa:' || contraseña)

INSERT INTO users (id, name, email, password_hash, role, active) VALUES
  (1, 'Administrador QA', 'admin@tiendaqa.com',     '94a35081c8e7c1ef887b33743c6eaed03ea57f426727150348a51cef1855a413', 'admin',   1),
  (2, 'Ana Morales',      'ana@tiendaqa.com',       '84fb0da29a11c1e2138116cd6bed095d40e596c8bfcd23d78217b899ceec739e', 'cliente', 1),
  (3, 'Luis Pérez',       'luis@tiendaqa.com',      '84fb0da29a11c1e2138116cd6bed095d40e596c8bfcd23d78217b899ceec739e', 'cliente', 1),
  (4, 'Usuario Bloqueado','bloqueado@tiendaqa.com', '84fb0da29a11c1e2138116cd6bed095d40e596c8bfcd23d78217b899ceec739e', 'cliente', 0);

INSERT INTO products (id, name, description, price, category, stock, emoji) VALUES
  (1,  'Café de Antigua 500g',     'Café de altura molido, tostado medio.',            75.00,  'Alimentos',    200, '☕'),
  (2,  'Teclado Mecánico',         'Teclado mecánico retroiluminado, switches rojos.', 450.00, 'Tecnología',   150, '⌨️'),
  (3,  'Mouse Inalámbrico',        'Mouse ergonómico inalámbrico de 1600 DPI.',        120.00, 'Tecnología',   300, '🖱️'),
  (4,  'Audífonos Bluetooth',      'Audífonos con cancelación de ruido.',              380.00, 'Tecnología',   120, '🎧'),
  (5,  'Cuaderno Universitario',   'Cuaderno de 200 hojas, cuadriculado.',              25.00, 'Papelería',    500, '📓'),
  (6,  'Set de Bolígrafos',        'Paquete de 12 bolígrafos de colores.',              30.00, 'Papelería',    400, '🖊️'),
  (7,  'Mochila Ñandú',            'Mochila resistente al agua para laptop de 15".',   260.00, 'Accesorios',   100, '🎒'),
  (8,  'Botella Térmica 1L',       'Acero inoxidable, mantiene el frío por 24 horas.', 150.00, 'Accesorios',   180, '🍶'),
  (9,  'Cacao Artesanal',          'Tablillas de cacao puro de Alta Verapaz.',          55.00, 'Alimentos',    250, '🍫'),
  (10, 'Monitor 24 pulgadas',      'Monitor Full HD con panel IPS.',                  1500.00, 'Tecnología',    40, '🖥️'),
  (11, 'Pantalón D''Lujo',         'Pantalón casual de algodón.',                      199.00, 'Ropa',         90, '👖'),
  (12, 'Camisa Guatemalteca',      'Camisa de algodón con bordado típico.',            180.00, 'Ropa',         60, '👕');

INSERT INTO coupons (code, type, value, min_amount, active) VALUES
  ('BIENVENIDO10', 'percent', 10, 0,   1),
  ('VERANO20',     'percent', 20, 0,   1),
  ('FIJO50',       'fixed',   50, 200, 1),
  ('EXPIRADO5',    'percent', 5,  0,   0);
