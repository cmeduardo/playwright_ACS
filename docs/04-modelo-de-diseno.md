# 04 — Modelo de diseño

> Entrada del proceso de pruebas: describe cómo está construida la aplicación bajo prueba (TiendaQA) y el framework de pruebas. Los diagramas están en **Mermaid** y se visualizan directamente en GitHub y en la mayoría de editores de Markdown.

## 1. Arquitectura de la aplicación (SUT)

TiendaQA es una aplicación de tres capas ejecutada en un solo proceso Node.js.

```mermaid
flowchart LR
    subgraph Navegador
        SPA["SPA vanilla<br>app/public<br>index.html · js/app.js · css/styles.css"]
        LS[("localStorage<br>token · user")]
    end
    subgraph "Servidor Node.js 22 · Express 5 (puerto 3100)"
        MW["middleware.js<br>requireAuth · requireAdmin"]
        R1["/api/auth<br>login · register · logout · me"]
        R2["/api/products<br>CRUD · búsqueda · filtros"]
        R3["/api/cart<br>ítems · cupón · totales"]
        R4["/api/orders<br>checkout · historial"]
        DOC["/api/docs · /api-docs<br>OpenAPI"]
        T["/api/test/reset<br>solo apoyo a pruebas"]
        BUGS{{"config.js<br>BUGS=on / off"}}
    end
    DB[("SQLite<br>db/tienda.db<br>schema.sql + seed.sql")]

    SPA <-->|"fetch JSON<br>Authorization: Bearer"| MW
    SPA --- LS
    MW --> R1 & R2 & R3 & R4
    R1 & R2 & R3 & R4 & T <--> DB
    BUGS -. activa defectos .-> R2
    BUGS -. activa defectos .-> R3
    BUGS -. build defectuoso .-> SPA
```

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Presentación | HTML/CSS/JS vanilla, rutas por hash (`#/catalogo`, `#/carrito`, `#/checkout`…) | Render de vistas, validación de formularios, manejo de errores de red |
| Lógica / API | Express 5 | Reglas de negocio (cupones, stock, pedidos), autenticación por token y roles |
| Datos | SQLite con `better-sqlite3` | Persistencia; se reinicia con scripts SQL |

Los defectos intencionales viven en: `app/routes/cart.js` (BUG-001 y BUG-002), `app/routes/products.js` (BUG-003) y `app/public/js/app.js` + `styles.css` (BUG-004 y BUG-005). Todos dependen de la variable `BUGS`.

## 2. Arquitectura del framework de pruebas

```mermaid
flowchart TB
    CFG["playwright.config.ts<br>proyectos · reporteres · webServer"]
    GS["global-setup.ts<br>reinicia BD · storageState"]
    subgraph Suites["tests/"]
        S1[e2e] --- S2[data-driven] --- S3[api] --- S4[network]
        S5[visual] --- S6[a11y] --- S7[mobile] --- S8[bugs]
    end
    FX["fixtures/index.ts<br>clienteNuevo · clienteApi · adminApi<br>paginaCliente · carritoUI"]
    POM["pages/<br>Login · Catalog · Cart · Checkout · Admin"]
    SUP["support/<br>api-client · meta · datos · esquemas · a11y"]
    SUT["TiendaQA (webServer)<br>puerto 3101 · BD de pruebas"]
    subgraph REP["Reporteres"]
        R1[HTML nativo] --- R2[Allure] --- R3[JUnit · JSON] --- R4["bitacora-reporter.ts"]
    end
    CFG --> GS --> Suites
    Suites --> FX --> POM
    FX --> SUP
    POM -->|Chromium · Firefox · WebKit| SUT
    SUP -->|request HTTP| SUT
    Suites --> REP
    R4 --> OUT["bitacora.db · informe · DEF-XXX.md · dashboard"]
```

## 3. Diagrama de clases del Page Object Model

Los Page Objects son los **componentes de prueba**: encapsulan los locators y las acciones de cada pantalla para que los tests lean como pasos de negocio.

```mermaid
classDiagram
    class BasePage {
        <<abstract>>
        #Page page
        +Locator menuToggle
        +Locator contadorCarrito
        +Locator nombreUsuario
        +Locator botonCerrarSesion
        +alerta(texto) Locator
        +aviso(texto) Locator
        +abrirMenuSiEsMovil() void
        +irA(enlace) void
        +cerrarSesion() void
    }
    class LoginPage {
        +Locator titulo
        +Locator correo
        +Locator contrasena
        +Locator botonIngresar
        +Locator errorCorreo
        +Locator errorContrasena
        +abrir() void
        +iniciarSesion(email, password) void
    }
    class CatalogPage {
        +Locator buscador
        +Locator categoria
        +Locator precioMaximo
        +Locator orden
        +Locator tarjetas
        +Locator estadoVacio
        +Locator errorCatalogo
        +Locator botonReintentar
        +abrir() void
        +buscar(texto) void
        +tarjeta(nombre) Locator
        +agregarAlCarrito(nombre) void
        +precios() number[]
    }
    class CartPage {
        +Locator filas
        +Locator campoCupon
        +Locator subtotal
        +Locator descuento
        +Locator total
        +Locator botonPagar
        +abrir() void
        +fila(nombre) Locator
        +cantidad(nombre) Locator
        +cambiarCantidad(nombre, n) void
        +eliminar(nombre) void
        +aplicarCupon(codigo) void
        +montoTotal() number
    }
    class CheckoutPage {
        +Locator botonPagar
        +Locator direccionPorEtiqueta
        +Locator confirmacion
        +Locator numeroPedido
        +Locator totalPedido
        +abrir() void
        +campo(nombre) Locator
        +mensajeError(nombre) Locator
        +completar(envio, pago) void
        +pagar() void
    }
    class AdminPage {
        +Locator filas
        +Locator botonGuardar
        +Locator dialogoConfirmacion
        +abrir() void
        +fila(nombre) Locator
        +llenarFormulario(datos) void
        +crear(datos) void
        +editar(nombre, cambios) void
        +pedirEliminacion(nombre) void
        +eliminar(nombre) void
    }
    class ApiClient {
        +login() · registrar() · yo() · logout()
        +productos() · crearProducto() · eliminarProducto()
        +carrito() · agregarAlCarrito() · aplicarCupon()
        +crearPedido() · pedidos() · pedido()
        +conToken(token) ApiClient
        +sinToken() ApiClient
    }
    class Fixtures {
        <<test.extend>>
        +api · clienteNuevo · clienteApi · adminApi
        +paginaCliente · carritoListo · carritoUI
        +loginPage · catalogPage · cartPage
        +checkoutPage · adminPage
        +trazabilidad (auto)
    }
    BasePage <|-- LoginPage
    BasePage <|-- CatalogPage
    BasePage <|-- CartPage
    BasePage <|-- CheckoutPage
    BasePage <|-- AdminPage
    Fixtures ..> LoginPage : crea
    Fixtures ..> CatalogPage : crea
    Fixtures ..> CartPage : crea
    Fixtures ..> CheckoutPage : crea
    Fixtures ..> AdminPage : crea
    Fixtures ..> ApiClient : crea
```

## 4. Modelo entidad-relación de la base de datos

Corresponde a `db/schema.sql`.

```mermaid
erDiagram
    users ||--o{ sessions : "inicia"
    users ||--o| carts : "tiene"
    users ||--o{ cart_items : "agrega"
    products ||--o{ cart_items : "aparece en"
    coupons |o--o{ carts : "se aplica a"
    users ||--o{ orders : "realiza"
    orders ||--|{ order_items : "contiene"

    users {
        INTEGER id PK
        TEXT name
        TEXT email UK
        TEXT password_hash
        TEXT role "cliente | admin"
        INTEGER active "0 = bloqueado"
        TEXT created_at
    }
    sessions {
        TEXT token PK
        INTEGER user_id FK
        TEXT created_at
    }
    products {
        INTEGER id PK
        TEXT name
        TEXT description
        REAL price "mayor o igual a 0"
        TEXT category
        INTEGER stock "mayor o igual a 0"
        TEXT emoji
    }
    coupons {
        TEXT code PK
        TEXT type "percent | fixed"
        REAL value
        REAL min_amount
        INTEGER active
    }
    carts {
        INTEGER user_id PK, FK
        TEXT coupon FK
    }
    cart_items {
        INTEGER user_id PK, FK
        INTEGER product_id PK, FK
        INTEGER quantity
    }
    orders {
        INTEGER id PK
        INTEGER user_id FK
        REAL subtotal
        REAL discount
        REAL total
        TEXT coupon
        TEXT status
        TEXT shipping "JSON"
        TEXT created_at
    }
    order_items {
        INTEGER order_id FK
        INTEGER product_id
        TEXT name "copia al comprar"
        REAL price "copia al comprar"
        INTEGER quantity
    }
```

`order_items` guarda una copia del nombre y precio del producto al momento de la compra, de modo que el historial no cambia si el administrador edita o elimina el producto después.

## 5. Diagrama de casos de uso

```mermaid
flowchart LR
    V(["👤 Visitante"])
    C(["👤 Cliente"])
    A(["👤 Administrador"])
    C -- "es un" --> V
    A -- "es un" --> C

    subgraph TiendaQA
        direction TB
        U1([Ver catálogo])
        U2([Buscar y filtrar productos])
        U3([Iniciar sesión])
        U4([Cerrar sesión])
        U5([Gestionar carrito])
        U6([Aplicar cupón])
        U7([Realizar checkout y pagar])
        U8([Consultar historial de pedidos])
        U9([Administrar productos - CRUD])
    end

    V --- U1
    V --- U2
    V --- U3
    C --- U4
    C --- U5
    C --- U6
    C --- U7
    C --- U8
    A --- U9
    U6 -. extiende .-> U5
    U7 -. incluye .-> U5
```

| Caso de uso | Requerimiento | Casos de prueba principales |
|---|---|---|
| Ver catálogo / Buscar y filtrar | RF-03, RF-04 | CP-E2E-003, CP-API-002, CP-DEF-003 |
| Iniciar / cerrar sesión | RF-01, RF-02 | CP-E2E-002, CP-DD-001, CP-API-001 |
| Gestionar carrito | RF-05 | CP-E2E-004, CP-API-004, CP-DEF-002 |
| Aplicar cupón | RF-06 | CP-E2E-004, CP-DD-003, CP-DEF-001 |
| Realizar checkout y pagar | RF-07 | CP-E2E-001, CP-E2E-005, CP-DD-002, CP-API-005, CP-MOV-002 |
| Consultar historial | RF-09 | CP-E2E-007 |
| Administrar productos | RF-08 | CP-E2E-006, CP-API-003, CP-INT-001 |

## 6. Diagrama de secuencia del checkout

Incluye los caminos alternos que cubren los casos CP-E2E-005 (validaciones y tarjeta declinada) y CP-API-005.

```mermaid
sequenceDiagram
    autonumber
    actor U as Cliente
    participant S as SPA (app.js)
    participant A as API /api/orders
    participant D as SQLite

    U->>S: Abre #/checkout
    S->>A: GET /api/cart (Bearer token)
    A->>D: Consulta ítems, cupón y totales
    D-->>A: Carrito
    A-->>S: items, subtotal, descuento, total
    S-->>U: Muestra formulario y resumen
    U->>S: Completa envío y pago y pulsa «Pagar ahora»
    S->>A: POST /api/orders { shipping, payment }
    A->>D: Lee el carrito del usuario
    alt Carrito vacío
        A-->>S: 400 «El carrito está vacío»
    else Datos inválidos
        A-->>S: 400 { fields: { campo: mensaje } }
        S-->>U: Muestra el error junto a cada campo
    else Tarjeta terminada en 0002
        A-->>S: 402 «Pago rechazado: tarjeta declinada»
        S-->>U: Alerta de pago rechazado (el carrito se conserva)
    else Stock insuficiente
        A-->>S: 409 «Stock insuficiente»
    else Datos válidos
        rect rgb(230, 245, 235)
        A->>D: BEGIN · INSERT orders y order_items
        A->>D: UPDATE products (stock − cantidad)
        A->>D: DELETE cart_items · limpia el cupón · COMMIT
        end
        A-->>S: 201 pedido { id, total, estado: Pagado }
        S-->>U: Navega a #/pedido/id «¡Pedido confirmado!»
    end
```

## 7. API REST (resumen)

| Método y ruta | Auth | Descripción | Códigos |
|---|---|---|---|
| `POST /api/auth/login` | — | Inicia sesión | 200, 400, 401, 403 |
| `POST /api/auth/register` | — | Registra un cliente | 201, 400, 409 |
| `POST /api/auth/logout` · `GET /api/auth/me` | Token | Cierra sesión · usuario actual | 204 · 200, 401 |
| `GET /api/products` | — | Lista con `q`, `category`, `minPrice`, `maxPrice`, `sort` | 200 (500 con BUG-003) |
| `GET /api/products/:id` | — | Detalle | 200, 404 |
| `POST · PUT · DELETE /api/products` | Admin | CRUD de productos | 201/200/204, 400, 401, 403, 404 |
| `GET /api/cart` | Token | Carrito con totales | 200, 401 |
| `POST · PATCH · DELETE /api/cart/items` | Token | Agregar, cambiar cantidad, quitar | 201/200, 400, 404, 409 |
| `POST · DELETE /api/cart/coupon` | Token | Aplicar o quitar cupón | 200, 400, 404 |
| `POST /api/orders` | Token | Checkout | 201, 400, 402, 409 |
| `GET /api/orders` · `GET /api/orders/:id` | Token | Historial (admin: `?all=1`) · detalle | 200, 404 |
| `GET /api/health` | — | Estado y modo de bugs | 200 |
| `POST /api/test/reset` | — | Reinicia la BD (solo apoyo a pruebas) | 200 |

La especificación completa se sirve en `/api/docs` (OpenAPI 3) y se ve en `/api-docs`.
