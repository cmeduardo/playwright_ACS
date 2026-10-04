/* TiendaQA - frontend SPA en JavaScript vanilla (rutas por hash). */
(() => {
  const $main = document.getElementById('contenido');
  const $menu = document.getElementById('menu');
  const $toggle = document.getElementById('menu-toggle');
  const $toast = document.getElementById('toast');

  const state = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    cartCount: 0,
    bugs: false,
  };

  const q = (v) => `Q${Number(v).toFixed(2)}`;
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Placeholders gráficos: composiciones geométricas monocromas, deterministas por producto.
  function arte(p) {
    let a = (Math.imul(p.id + 7, 0x9e3779b1) + 0x6d2b79f5) >>> 0;
    const r = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const n = (a, b) => Math.round(a + r() * (b - a));
    const W = 240;
    const H = 180;
    const k = 'currentColor';
    let g = '';
    switch (p.category) {
      case 'Alimentos': {
        const cx = n(80, 160);
        const cy = n(70, 110);
        for (let i = 1; i <= 4; i++) g += `<circle cx="${cx}" cy="${cy}" r="${i * 17}" fill="none" stroke="${k}" stroke-width="${i % 2 ? 1.2 : 3}"/>`;
        g += `<circle cx="${cx}" cy="${cy}" r="9" fill="${k}"/>`;
        for (let i = 0; i < 9; i++) g += `<circle cx="${n(10, 230)}" cy="${n(10, 170)}" r="${n(2, 5)}" fill="${k}"/>`;
        break;
      }
      case 'Tecnología': {
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 6; x++) {
            const t = r();
            const X = 23 + x * 34;
            const Y = 27 + y * 34;
            if (t < 0.25) g += `<rect x="${X}" y="${Y}" width="24" height="24" fill="${k}"/>`;
            else if (t < 0.7) g += `<rect x="${X + 0.6}" y="${Y + 0.6}" width="22.8" height="22.8" fill="none" stroke="${k}" stroke-width="1.2"/>`;
          }
        }
        break;
      }
      case 'Papelería': {
        for (let y = 24; y < H; y += 16) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${k}" stroke-width="1"/>`;
        const mx = n(30, 60);
        g += `<line x1="${mx}" y1="0" x2="${mx}" y2="${H}" stroke="${k}" stroke-width="3"/>`;
        g += `<rect x="${n(90, 150)}" y="${n(30, 100)}" width="${n(40, 70)}" height="12" fill="${k}"/>`;
        break;
      }
      case 'Accesorios': {
        const cx = n(80, 160);
        const cy = n(70, 110);
        const rr = n(34, 52);
        g += `<line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="${k}" stroke-width="1"/>`;
        g += `<circle cx="${cx}" cy="${cy}" r="${rr + 16}" fill="none" stroke="${k}" stroke-width="1.5"/>`;
        g += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${k}"/>`;
        g += `<rect x="${n(12, 24)}" y="${n(12, 24)}" width="26" height="26" fill="none" stroke="${k}" stroke-width="2.5"/>`;
        g += `<rect x="${n(190, 204)}" y="${n(130, 142)}" width="26" height="26" fill="${k}"/>`;
        break;
      }
      case 'Ropa': {
        for (let x = -H; x < W; x += 14) g += `<line x1="${x}" y1="${H}" x2="${x + H}" y2="0" stroke="${k}" stroke-width="${Math.round(x / 14) % 3 === 0 ? 3 : 1}"/>`;
        g += `<rect x="${n(70, 110)}" y="${n(40, 70)}" width="${n(60, 90)}" height="${n(50, 70)}" style="fill:var(--arte-fondo)" stroke="${k}" stroke-width="2"/>`;
        break;
      }
      default:
        for (let y = 14; y < H; y += 20) for (let x = 14; x < W; x += 20) g += `<circle cx="${x}" cy="${y}" r="${r() < 0.3 ? 4 : 1.5}" fill="${k}"/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${g}</svg>`;
  }

  async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || `Error ${res.status}`);
      err.status = res.status;
      err.fields = data?.fields;
      throw err;
    }
    return data;
  }

  let toastTimer;
  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('visible'), 2500);
  }

  function setSession(token, user) {
    state.token = token;
    state.user = user;
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.cartCount = 0;
    }
  }

  async function refreshCartCount() {
    if (!state.token) return;
    try {
      const cart = await api('/cart');
      state.cartCount = cart.items.reduce((n, i) => n + i.quantity, 0);
    } catch {
      /* se ignora: el contador es informativo */
    }
    renderMenu();
  }

  function renderMenu() {
    const u = state.user;
    $menu.innerHTML = `
      <a href="#/catalogo">Catálogo</a>
      ${
        u
          ? `<a href="#/carrito">Carrito <span class="badge" data-testid="cart-count">${state.cartCount}</span></a>
             <a href="#/pedidos">Mis pedidos</a>
             ${u.role === 'admin' ? '<a href="#/admin">Admin</a>' : ''}
             <span class="user-chip" data-testid="user-name">${esc(u.name)} (${esc(u.role)})</span>
             <button type="button" class="link" id="logout-btn">Cerrar sesión</button>`
          : '<a href="#/login">Iniciar sesión</a>'
      }`;
    const logout = document.getElementById('logout-btn');
    if (logout) logout.addEventListener('click', doLogout);
  }

  async function doLogout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* sesión ya inválida */
    }
    setSession(null, null);
    renderMenu();
    location.hash = '#/login';
  }

  $toggle.addEventListener('click', () => {
    const open = $menu.classList.toggle('open');
    $toggle.setAttribute('aria-expanded', String(open));
    $toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });

  // ---------- Vistas ----------
  function viewLogin(message) {
    $main.innerHTML = `
      <section class="acceso">
        <div class="acceso-lema">
          <p class="eyebrow">Acceso a la tienda</p>
          <h1>Iniciar <em>sesión</em></h1>
          <p>Entra para llenar tu carrito, aplicar cupones y seguir tus pedidos. Si administras el catálogo, también entras por aquí.</p>
          <div class="cuentas">
            <strong>Cuentas de demostración (datos ficticios)</strong>
            <p>Cliente · ana@tiendaqa.com · Cliente123!</p>
            <p>Admin · admin@tiendaqa.com · Admin123!</p>
          </div>
        </div>
        <div class="card">
          ${message ? `<div class="alert alert-info" role="status">${esc(message)}</div>` : ''}
          <form id="login-form" novalidate>
            <div class="field">
              <label for="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autocomplete="username" />
              <p class="error-text" id="error-email"></p>
            </div>
            <div class="field">
              <label for="password">Contraseña</label>
              <input id="password" name="password" type="password" autocomplete="current-password" />
              <p class="error-text" id="error-password"></p>
            </div>
            <div id="login-error" role="alert"></div>
            <button class="btn" type="submit">Ingresar</button>
          </form>
        </div>
      </section>`;
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value;
      const errs = {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Ingresa un correo válido';
      if (!password) errs.password = 'La contraseña es obligatoria';
      document.getElementById('error-email').textContent = errs.email || '';
      document.getElementById('error-password').textContent = errs.password || '';
      document.getElementById('login-error').innerHTML = '';
      if (Object.keys(errs).length) return;
      try {
        const data = await api('/auth/login', { method: 'POST', body: { email, password } });
        setSession(data.token, data.user);
        await refreshCartCount();
        location.hash = data.user.role === 'admin' ? '#/admin' : '#/catalogo';
      } catch (err) {
        document.getElementById('login-error').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  async function viewCatalog() {
    const categories = await api('/products/categories').catch(() => []);
    $main.innerHTML = `
      <p class="eyebrow">Lista de precios del día</p>
      <h1>Catálogo de <em>productos</em></h1>
      <form id="filters" class="filters" role="search">
        <div class="field">
          <label for="search">Buscar productos</label>
          <input id="search" name="q" type="search" placeholder="Ej. café, mouse…" />
        </div>
        <div class="field">
          <label for="category">Categoría</label>
          <select id="category" name="category">
            <option value="">Todas</option>
            ${categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="max-price">Precio máximo (Q)</label>
          <input id="max-price" name="maxPrice" type="number" min="0" step="1" />
        </div>
        <div class="field">
          <label for="sort">Ordenar por</label>
          <select id="sort" name="sort">
            <option value="">Relevancia</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre</option>
          </select>
        </div>
        <button class="btn" type="submit">Buscar</button>
      </form>
      <p id="result-count" class="muted" data-testid="result-count" aria-live="polite"></p>
      <div id="results"></div>`;

    const form = document.getElementById('filters');
    const $results = document.getElementById('results');
    const $count = document.getElementById('result-count');

    async function load() {
      const params = new URLSearchParams();
      for (const [k, v] of new FormData(form)) if (v !== '') params.set(k, v);
      $count.textContent = '';
      $results.innerHTML = '<div class="grid" role="status" aria-label="Cargando productos"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div><p class="muted">Cargando productos…</p>';
      try {
        const products = await api(`/products?${params}`);
        $count.textContent = `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`;
        if (!products.length) {
          $results.innerHTML = '<div class="empty" data-testid="empty-state"><p>No se encontraron productos.</p><p>Prueba con otra búsqueda o limpia los filtros.</p></div>';
          return;
        }
        $results.innerHTML = `<div class="grid">${products
          .map(
            (p) => `
          <article class="ficha" data-testid="product-card" data-cat="${esc(p.category)}">
            <div class="ficha-arte">${arte(p)}<span class="ficha-codigo" aria-hidden="true">${esc(p.category.slice(0, 3).toUpperCase())}-${String(p.id).padStart(2, '0')}</span></div>
            <div class="ficha-body">
              <p class="ficha-meta"><span class="ficha-num">N.º ${String(p.id).padStart(2, '0')}</span><span class="tag">${esc(p.category)}</span></p>
              <h3>${esc(p.name)}</h3>
              <p class="desc">${esc(p.description)}</p>
              <div class="ficha-foot">
                <span class="price">${q(p.price)}</span>
                <span class="stock">${p.stock > 0 ? `Disponibles: ${p.stock}` : 'Agotado'}</span>
              </div>
              <button class="btn" type="button" data-add="${p.id}" aria-label="Agregar ${esc(p.name)} al carrito" ${p.stock ? '' : 'disabled'}>Agregar</button>
            </div>
          </article>`,
          )
          .join('')}</div>`;
      } catch (err) {
        $count.textContent = '';
        $results.innerHTML = `
          <div class="alert alert-error" role="alert" data-testid="catalog-error">
            No pudimos cargar el catálogo. Intenta nuevamente.
            <button type="button" class="btn btn-small btn-secondary" id="retry">Reintentar</button>
          </div>`;
        document.getElementById('retry').addEventListener('click', load);
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      load();
    });
    $results.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      if (!state.token) {
        sessionStorage.setItem('loginMessage', 'Inicia sesión para agregar productos al carrito');
        location.hash = '#/login';
        return;
      }
      try {
        const cart = await api('/cart/items', { method: 'POST', body: { productId: Number(btn.dataset.add), quantity: 1 } });
        state.cartCount = cart.items.reduce((n, i) => n + i.quantity, 0);
        renderMenu();
        toast('Producto agregado al carrito');
      } catch (err) {
        toast(err.message);
      }
    });
    load();
  }

  async function viewCart() {
    if (!requireLogin()) return;
    const cart = await api('/cart');
    state.cartCount = cart.items.reduce((n, i) => n + i.quantity, 0);
    renderMenu();
    if (!cart.items.length) {
      $main.innerHTML = '<h1>Tu <em>carrito</em></h1><div class="empty" data-testid="cart-empty"><p>Tu carrito está vacío.</p><a class="btn" href="#/catalogo">Ir al catálogo</a></div>';
      return;
    }
    $main.innerHTML = `
      <p class="eyebrow">Revisa tu pedido antes de pagar</p>
      <h1>Tu <em>carrito</em></h1>
      <div id="cart-error" role="alert"></div>
      <div class="layout-2">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              ${cart.items
                .map(
                  (i) => `
                <tr data-testid="cart-row" data-product="${i.productId}">
                  <td>${esc(i.name)}</td>
                  <td>${q(i.price)}</td>
                  <td><input type="number" value="${i.quantity}" aria-label="Cantidad de ${esc(i.name)}" data-qty="${i.productId}" /></td>
                  <td data-testid="line-subtotal">${q(i.subtotal)}</td>
                  <td><button type="button" class="btn btn-secondary btn-small" data-remove="${i.productId}" aria-label="Eliminar ${esc(i.name)} del carrito">Eliminar</button></td>
                </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <aside class="receipt" aria-label="Resumen del pedido">
          <h2>Resumen</h2>
          <form id="coupon-form" class="row">
            <div class="field">
              <label for="coupon">Cupón de descuento</label>
              <input id="coupon" name="code" value="${esc(cart.coupon || '')}" />
            </div>
            <button class="btn btn-secondary" type="submit">Aplicar cupón</button>
          </form>
          <div id="coupon-msg" role="alert"></div>
          <div class="summary-line"><span>Subtotal</span><span data-testid="subtotal">${q(cart.subtotal)}</span></div>
          <div class="summary-line"><span>Descuento${cart.coupon ? ` (${esc(cart.coupon)})` : ''}</span><span data-testid="discount">-${q(cart.discount)}</span></div>
          <div class="summary-line summary-total"><span>Total</span><span data-testid="total">${q(cart.total)}</span></div>
          <a class="btn" href="#/checkout">Proceder al pago</a>
        </aside>
      </div>`;

    const showError = (msg) => {
      document.getElementById('cart-error').innerHTML = `<div class="alert alert-error">${esc(msg)}</div>`;
    };
    $main.querySelectorAll('[data-qty]').forEach((input) =>
      input.addEventListener('change', async () => {
        try {
          await api(`/cart/items/${input.dataset.qty}`, { method: 'PATCH', body: { quantity: Number(input.value) } });
          viewCart();
        } catch (err) {
          input.value = input.defaultValue; // se restaura la cantidad válida anterior
          showError(err.message);
        }
      }),
    );
    $main.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await api(`/cart/items/${btn.dataset.remove}`, { method: 'DELETE' });
        viewCart();
      }),
    );
    document.getElementById('coupon-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/cart/coupon', { method: 'POST', body: { code: e.target.code.value } });
        await viewCart();
        document.getElementById('coupon-msg').innerHTML = '<div class="alert alert-success">Cupón aplicado correctamente</div>';
      } catch (err) {
        document.getElementById('coupon-msg').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  const FIELDS = [
    { id: 'nombre', label: 'Nombre completo', type: 'text', group: 'shipping', autocomplete: 'name' },
    { id: 'email', label: 'Correo electrónico', type: 'email', group: 'shipping', autocomplete: 'email' },
    { id: 'direccion', label: 'Dirección de entrega', type: 'text', group: 'shipping', autocomplete: 'street-address' },
    { id: 'telefono', label: 'Teléfono (8 dígitos)', type: 'text', group: 'shipping', autocomplete: 'tel' },
    { id: 'tarjeta', label: 'Número de tarjeta', type: 'text', group: 'payment', autocomplete: 'cc-number' },
    { id: 'vencimiento', label: 'Vencimiento (MM/AA)', type: 'text', group: 'payment', autocomplete: 'cc-exp' },
    { id: 'cvv', label: 'CVV', type: 'text', group: 'payment', autocomplete: 'cc-csc' },
  ];

  async function viewCheckout() {
    if (!requireLogin()) return;
    const cart = await api('/cart');
    if (!cart.items.length) {
      location.hash = '#/carrito';
      return;
    }
    const fieldHtml = (f) => {
      // BUG-004: con BUGS=on el campo "Dirección" se dibuja sin <label> asociado (falla de accesibilidad).
      const label =
        state.bugs && f.id === 'direccion'
          ? '<span class="field-title">Dirección de entrega</span>'
          : `<label for="${f.id}">${f.label}</label>`;
      return `
        <div class="field">
          ${label}
          <input id="${f.id}" name="${f.id}" type="${f.type}" autocomplete="${f.autocomplete}" aria-describedby="error-${f.id}" />
          <p class="error-text" id="error-${f.id}"></p>
        </div>`;
    };
    $main.innerHTML = `
      <h1>Finalizar <em>compra</em></h1>
      <div class="layout-2">
        <form id="checkout-form" class="card" novalidate>
          <h2>Datos de envío</h2>
          ${FIELDS.filter((f) => f.group === 'shipping').map(fieldHtml).join('')}
          <h2>Pago</h2>
          ${FIELDS.filter((f) => f.group === 'payment').map(fieldHtml).join('')}
          <div id="checkout-error" role="alert"></div>
          <button id="pay-button" class="btn btn-pay" type="submit">Pagar ahora</button>
        </form>
        <aside class="receipt" aria-label="Resumen del pedido">
          <h2>Tu pedido</h2>
          ${cart.items.map((i) => `<div class="summary-line"><span>${esc(i.name)} × ${i.quantity}</span><span>${q(i.subtotal)}</span></div>`).join('')}
          <div class="summary-line"><span>Subtotal</span><span data-testid="subtotal">${q(cart.subtotal)}</span></div>
          <div class="summary-line"><span>Descuento</span><span data-testid="discount">-${q(cart.discount)}</span></div>
          <div class="summary-line summary-total"><span>Total</span><span data-testid="total">${q(cart.total)}</span></div>
        </aside>
      </div>`;

    const form = document.getElementById('checkout-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const shipping = {};
      const payment = {};
      for (const f of FIELDS) (f.group === 'shipping' ? shipping : payment)[f.id] = form[f.id].value.trim();
      FIELDS.forEach((f) => {
        document.getElementById(`error-${f.id}`).textContent = '';
        form[f.id].removeAttribute('aria-invalid');
      });
      document.getElementById('checkout-error').innerHTML = '';
      const btn = document.getElementById('pay-button');
      btn.disabled = true;
      try {
        const order = await api('/orders', { method: 'POST', body: { shipping, payment } });
        state.cartCount = 0;
        renderMenu();
        location.hash = `#/pedido/${order.id}`;
      } catch (err) {
        if (err.fields) {
          for (const [id, msg] of Object.entries(err.fields)) {
            document.getElementById(`error-${id}`).textContent = msg;
            form[id].setAttribute('aria-invalid', 'true');
          }
        } else {
          document.getElementById('checkout-error').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
        }
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function viewOrderConfirmation(id) {
    if (!requireLogin()) return;
    const o = await api(`/orders/${id}`);
    $main.innerHTML = `
      <section class="card card-narrow">
        <h1>¡Pedido <em>confirmado</em>!</h1>
        <p>Número de pedido: <strong data-testid="order-id">#${o.id}</strong></p>
        <p>Total pagado: <strong data-testid="order-total">${q(o.total)}</strong></p>
        <p>Enviaremos tu pedido a: ${esc(o.shipping.direccion)}.</p>
        <a class="btn" href="#/pedidos">Ver mis pedidos</a>
      </section>`;
  }

  async function viewOrders() {
    if (!requireLogin()) return;
    const orders = await api('/orders');
    $main.innerHTML = `<h1>Mis <em>pedidos</em></h1>${
      orders.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Pedido</th><th>Fecha</th><th>Artículos</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>${orders
              .map(
                (o) => `<tr data-testid="order-row">
                  <td>#${o.id}</td><td>${esc(o.created_at)}</td>
                  <td>${o.items.map((i) => `${esc(i.name)} × ${i.quantity}`).join(', ')}</td>
                  <td>${q(o.total)}</td><td>${esc(o.status)}</td></tr>`,
              )
              .join('')}</tbody></table></div>`
        : '<div class="empty" data-testid="orders-empty">Aún no tienes pedidos.</div>'
    }`;
  }

  async function viewAdmin() {
    if (!requireLogin()) return;
    if (state.user.role !== 'admin') {
      $main.innerHTML = '<h1>Acceso denegado</h1><div class="alert alert-error" role="alert">No tienes permisos para ver el panel de administración.</div>';
      return;
    }
    const products = await api('/products');
    $main.innerHTML = `
      <h1>Panel de <em>administración</em></h1>
      <div class="layout-2">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>${products
              .map(
                (p) => `<tr data-testid="admin-row" data-name="${esc(p.name)}">
                <td>${p.id}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${q(p.price)}</td><td>${p.stock}</td>
                <td>
                  <button type="button" class="btn btn-secondary btn-small" data-edit="${p.id}" aria-label="Editar ${esc(p.name)}">Editar</button>
                  <button type="button" class="btn btn-danger btn-small" data-delete="${p.id}" data-name="${esc(p.name)}" aria-label="Eliminar ${esc(p.name)}">Eliminar</button>
                </td></tr>`,
              )
              .join('')}</tbody>
          </table>
        </div>
        <form id="product-form" class="card" novalidate>
          <h2 id="form-title">Nuevo producto</h2>
          <input type="hidden" id="p-id" />
          <div class="field"><label for="p-name">Nombre</label><input id="p-name" /></div>
          <div class="field"><label for="p-desc">Descripción</label><input id="p-desc" /></div>
          <div class="field"><label for="p-price">Precio (Q)</label><input id="p-price" type="number" step="0.01" /></div>
          <div class="field"><label for="p-category">Categoría</label><input id="p-category" /></div>
          <div class="field"><label for="p-stock">Stock</label><input id="p-stock" type="number" /></div>
          <div id="admin-msg" role="alert"></div>
          <button class="btn" type="submit">Guardar producto</button>
          <button class="btn btn-secondary" type="button" id="p-cancel">Cancelar</button>
        </form>
      </div>`;

    const f = (id) => document.getElementById(id);
    const msg = (html) => (f('admin-msg').innerHTML = html);

    $main.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = products.find((x) => x.id === Number(b.dataset.edit));
        f('form-title').textContent = 'Editar producto';
        f('p-id').value = p.id;
        f('p-name').value = p.name;
        f('p-desc').value = p.description;
        f('p-price').value = p.price;
        f('p-category').value = p.category;
        f('p-stock').value = p.stock;
        f('p-name').focus();
      }),
    );
    f('p-cancel').addEventListener('click', viewAdmin);
    f('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        name: f('p-name').value,
        description: f('p-desc').value,
        price: f('p-price').value === '' ? NaN : Number(f('p-price').value),
        category: f('p-category').value,
        stock: f('p-stock').value === '' ? NaN : Number(f('p-stock').value),
      };
      const id = f('p-id').value;
      try {
        await api(id ? `/products/${id}` : '/products', { method: id ? 'PUT' : 'POST', body });
        await viewAdmin();
        document.getElementById('admin-msg').innerHTML = `<div class="alert alert-success">Producto ${id ? 'actualizado' : 'creado'} correctamente</div>`;
      } catch (err) {
        msg(`<div class="alert alert-error">${esc(err.message)}</div>`);
      }
    });
    $main.querySelectorAll('[data-delete]').forEach((b) =>
      b.addEventListener('click', () => {
        const dlg = document.getElementById('confirm-dialog');
        document.getElementById('confirm-text').textContent = `¿Eliminar "${b.dataset.name}"? Esta acción no se puede deshacer.`;
        dlg.showModal();
        document.getElementById('confirm-cancel').onclick = () => dlg.close();
        document.getElementById('confirm-ok').onclick = async () => {
          dlg.close();
          await api(`/products/${b.dataset.delete}`, { method: 'DELETE' });
          await viewAdmin();
          document.getElementById('admin-msg').innerHTML = '<div class="alert alert-success">Producto eliminado correctamente</div>';
        };
      }),
    );
  }

  function requireLogin() {
    if (state.token) return true;
    sessionStorage.setItem('loginMessage', 'Inicia sesión para continuar');
    location.hash = '#/login';
    return false;
  }

  // ---------- Router ----------
  async function route() {
    const hash = location.hash || '#/catalogo';
    $menu.classList.remove('open');
    $toggle.setAttribute('aria-expanded', 'false');
    $toggle.setAttribute('aria-label', 'Abrir menú');
    renderMenu();
    try {
      if (hash.startsWith('#/login')) {
        const message = sessionStorage.getItem('loginMessage');
        sessionStorage.removeItem('loginMessage');
        viewLogin(message);
      } else if (hash.startsWith('#/catalogo')) await viewCatalog();
      else if (hash.startsWith('#/carrito')) await viewCart();
      else if (hash.startsWith('#/checkout')) await viewCheckout();
      else if (hash.startsWith('#/pedido/')) await viewOrderConfirmation(hash.split('/')[2]);
      else if (hash.startsWith('#/pedidos')) await viewOrders();
      else if (hash.startsWith('#/admin')) await viewAdmin();
      else $main.innerHTML = '<h1>Página no encontrada</h1>';
    } catch (err) {
      if (err.status === 401) {
        setSession(null, null);
        sessionStorage.setItem('loginMessage', 'Tu sesión expiró. Inicia sesión nuevamente');
        location.hash = '#/login';
        return;
      }
      $main.innerHTML = `<div class="alert alert-error" role="alert">${esc(err.message)}</div>`;
    }
    document.title = `${(document.querySelector('h1')?.textContent || 'TiendaQA').trim()} · TiendaQA`;
  }

  async function init() {
    try {
      const health = await fetch('/api/health').then((r) => r.json());
      state.bugs = health.bugs === 'on';
    } catch {
      /* sin información de build */
    }
    document.body.classList.toggle('build-defectuoso', state.bugs);
    window.addEventListener('hashchange', route);
    await refreshCartCount();
    route();
  }
  init();
})();
