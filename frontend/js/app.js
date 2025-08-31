// frontend/js/app.js
// Controlador principal del frontend de CaseritosApp
// Maneja boot, navegación, controladores por página y acciones (login, register, offers, create, bid, buy, accept bid, notifications, history, admin)

// Importar utilidades
import { router } from './router.js';
import { getActiveUser, loginUser, logoutUser, registerUser } from './auth.js';
import { API_URL } from './config.js';

// ---------------- Boot ----------------
window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
  router();
  refreshHeader();
  initBurger(); // inicializar menú hamburguesa
});

// Cuando el router carga una nueva ruta, inicializamos controladores
document.addEventListener('route:loaded', (e) => {
  refreshHeader();
  const path = e.detail.path;
  if (path === '/login') initLoginPage();
  if (path === '/register') initRegisterPage();
  if (path === '/offers') initOffersPage();
  if (path === '/create-offer') initCreateOfferPage();
  if (path === '/bid') initBidPage();
  if (path === '/notifications') initNotificationsPage();
  if (path === '/history') initHistoryPage();
  if (path === '/admin') initAdminPage();
});

// ---------------- Helpers ----------------

// Refresca estado del header (muestra/oculta enlaces según auth)
function refreshHeader() {
  const user = getActiveUser();
  const guestEls = document.querySelectorAll('.guest-only');
  const authEls = document.querySelectorAll('.auth-only');
  const adminEls = document.querySelectorAll('.admin-only');

  // Mostrar/Ocultar según login
  guestEls.forEach(el => el.style.display = user ? 'none' : '');
  authEls.forEach(el => el.style.display = user ? '' : 'none');

  // Mostrar solo si es admin
  adminEls.forEach(el => {
    if (user?.role === 'adm') {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Botón de logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      logoutUser();
      toast('Sesión cerrada');
      window.location.hash = '/login';
    };
  }
}

// Menú hamburguesa: mostrar/ocultar nav en móviles
function initBurger() {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('mainNav');
  burger?.addEventListener('click', () => {
    if (!nav) return;
    if (nav.style.display === 'flex') nav.style.display = 'none';
    else nav.style.display = 'flex';
  });
}

// Devuelve header con Authorization si hay token
function getAuthHeader() {
  const token = localStorage.getItem('bb_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

// Pequeño helper para peticiones JSON con manejo de errores
async function apiFetch(path, opts = {}) {
  const headers = opts.headers || {};
  if (!opts.headers || !opts.headers['Content-Type']) headers['Content-Type'] = 'application/json';
  Object.assign(headers, getAuthHeader());
  const res = await fetch(API_URL + path, { ...opts, headers });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = { raw: text }; }
  if (!res.ok) throw new Error((body && body.error) ? body.error : `HTTP ${res.status}`);
  return body;
}

// Escapar HTML para evitar XSS en inserciones simples
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Simple toast (notificaciones temporales en pantalla)
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    Object.assign(t.style, {
      position: 'fixed',
      bottom: '18px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 16px',
      borderRadius: '12px',
      background: 'rgba(31,41,55,.95)',
      color: '#fff',
      boxShadow: '0 8px 20px rgba(0,0,0,.06)',
      zIndex: 10000,
      fontWeight: '700',
      transition: 'opacity .2s',
      opacity: '0'
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  if (t._timeout) clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.style.opacity = '0'; }, 1900);
}

// ---------------- Pages / Controllers ----------------

// --- Login ---
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    if (!email || !password) { toast('Email y contraseña requeridos'); return; }
    try {
      await loginUser(email, password);
      toast('Inicio de sesión correcto');
      window.location.hash = '/offers';
    } catch (err) {
      toast(err.message || 'Error en login');
    }
  });
}

// --- Register ---
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const name = form.name?.value?.trim() || null;
    const phone = form.phone?.value?.trim() || null;
    if (!email || !password) { toast('Email y contraseña requeridos'); return; }
    if (password.length < 6) { toast('La contraseña debe tener al menos 6 caracteres'); return; }
    try {
      await registerUser(email, password, name, phone);
      toast('Registration successful. You can now log in..');
      window.location.hash = '/login';
    } catch (err) {
      toast(err.message || 'Error en registro');
    }
  });
}

// --- Create Offer ---
async function initCreateOfferPage() {
  const form = document.getElementById('offerForm');
  if (!form) return;
  const user = getActiveUser();
  if (!user) { toast('Debes iniciar sesión para publicar'); window.location.hash = '/login'; return; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const price = parseFloat(form.price.value);
    const qty = parseInt(form.qty.value, 10) || 1;
    const userLocation = form.loc?.value?.trim() || null;

    if (!title || !description || isNaN(price) || price < 0) { toast('Completa título, descripción y precio válido'); return; }

    try {
      const body = { title, description, price, qty, location: userLocation };
      await apiFetch('/offers', { method: 'POST', body: JSON.stringify(body) });
      toast('Oferta publicada');
      window.location.hash = '/offers';
    } catch (err) {
      toast(err.message || 'Error al crear oferta');
    }
  });
}

// --- Offers listing ---
function initOffersPage() {
  const list = document.getElementById('offersList');
  const filter = document.getElementById('filterLoc');
  const clear = document.getElementById('clearFilter');
  if (!list) return;

  async function fetchOffers(q, loc) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (loc) params.set('loc', loc);
    const res = await fetch(API_URL + '/offers?' + params.toString());
    if (!res.ok) throw new Error('Error cargando ofertas');
    return await res.json();
  }

  async function render() {
    list.innerHTML = '';
    try {
      const loc = (filter?.value || '').trim();
      const offers = await fetchOffers(null, loc);

      if (!offers || offers.length === 0) {
        list.innerHTML = '<div class="empty">No hay ofertas que coincidan.</div>';
        return;
      }

      const user = getActiveUser();
      offers.forEach(o => {
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `
          <h3>${escapeHtml(o.title)}</h3>
          <p>${escapeHtml(o.description || '')}</p>
          <div class="meta">
            Seller: <strong>${escapeHtml(o.seller_name || 'Anónimo')}</strong> • 
            Location: <span class="pill">${escapeHtml(o.location || '')}</span>
          </div>
          <div class="price">$${parseFloat(o.price).toFixed(2)}</div>
          <div class="meta">Quantity: ${o.qty}</div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn btn-cta" data-bid>Offer</button>
            <button class="btn btn-primary" data-buy>Buy</button>
          </div>
        `;

        const bidBtn = el.querySelector('[data-bid]');
        const buyBtn = el.querySelector('[data-buy]');

        bidBtn.addEventListener('click', () => { 
          window.location.hash = `#/bid?id=${o.id}`; 
        });

        buyBtn.addEventListener('click', async () => {
          if (user && user.id === o.seller_id) { 
            toast('No puedes comprar tu propio producto'); 
            return; 
          }
          await buyOffer(o.id);
        });

        if (o.status === 'sold' || o.qty <= 0) {
          buyBtn.disabled = true;
          bidBtn.disabled = true;
          const soldBadge = document.createElement('div');
          soldBadge.className = 'pill';
          soldBadge.textContent = 'VENDIDO';
          soldBadge.style.marginLeft = '8px';
          el.querySelector('.meta').appendChild(soldBadge);
        }

        list.appendChild(el);
      });
    } catch (err) {
      console.error(err);
      list.innerHTML = '<div class="empty">Error cargando ofertas.</div>';
    }
  }

  filter?.addEventListener('input', render);
  clear?.addEventListener('click', () => { 
    if (filter) { 
      filter.value = ''; 
      render(); 
    } 
  });

  render();
}


// --- Bid (offer detail) ---
function initBidPage() {
  const params = new URLSearchParams((window.location.hash.split('?')[1] || ''));
  const id = parseInt(params.get('id'), 10);
  const details = document.getElementById('offerDetails');
  const form = document.getElementById('bidForm');
  const bidsList = document.getElementById('bidsList');
  if (!details) return;

  async function loadOffer() {
    try {
      const offer = await apiFetch('/offers/' + id);
      details.innerHTML = `
        <h3>${escapeHtml(offer.title)}</h3>
        <div class="meta">Seller: <strong>${escapeHtml(offer.seller_name || '')}</strong> • Location: <span class="pill">${escapeHtml(offer.location || '')}</span> • Quantity.: ${offer.qty}</div>
        <div class="price">Starting Price: $${parseFloat(offer.price).toFixed(2)}</div>
        <div style="margin-top:8px;font-size:13px;color:var(--muted)">Seller phone:: ${escapeHtml(offer.seller_phone || 'No indicado')}</div>
      `;
      renderBids(offer);
    } catch (err) {
      console.error(err);
      details.innerHTML = '<div class="empty">No se pudo cargar la oferta.</div>';
    }
  }

  function renderBids(offer) {
    bidsList.innerHTML = '';
    if (!offer.bids || offer.bids.length === 0) {
      bidsList.innerHTML = '<div class="empty">There are no counteroffers yet. Be the first!</div>';
      return;
    }
    const user = getActiveUser();
    offer.bids.slice().forEach(b => {
      const li = document.createElement('li');
      li.className = 'card';
      li.style.marginBottom = '8px';
      li.innerHTML = `<div><strong>${escapeHtml(b.user_name || 'Anónimo')}</strong> offered <span class="price">$${parseFloat(b.price).toFixed(2)}</span></div><div style="font-size:12px;color:var(--muted)">Date: ${new Date(b.created_at).toLocaleString()}</div>`;
      // Si soy vendedor, puedo aceptar la puja
      if (user && user.id === offer.seller_id) {
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'btn btn-primary';
        acceptBtn.textContent = 'Aceptar puja';
        acceptBtn.style.marginTop = '8px';
        acceptBtn.addEventListener('click', () => acceptBid(offer.id, b.id));
        li.appendChild(acceptBtn);
      }
      bidsList.appendChild(li);
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const price = parseFloat(form.bidPrice.value);
    if (isNaN(price) || price <= 0) { toast('Ingresa un precio válido'); return; }
    try {
      await apiFetch(`/offers/${id}/bids`, { method: 'POST', body: JSON.stringify({ price }) });
      toast('Contraoferta enviada');
      form.reset();
      await loadOffer();
    } catch (err) {
      toast(err.message || 'Error al enviar contraoferta');
    }
  });

  loadOffer();
}

// --- Comprar ahora ---
async function buyOffer(id) {
  try {
    await apiFetch(`/offers/${id}/buy`, { method: 'POST' });
    toast('Compra realizada');
    // volver al listado o recargar la ruta actual
    window.location.hash = '/offers';
  } catch (err) {
    toast(err.message || 'Error al comprar');
  }
}

// --- Aceptar puja (seller) ---
async function acceptBid(offerId, bidId) {
  try {
    await apiFetch(`/offers/${offerId}/bids/${bidId}/accept`, { method: 'POST' });
    toast('Puja aceptada');
    window.location.hash = '/offers';
  } catch (err) {
    toast(err.message || 'Error al aceptar puja');
  }
}

// --- Notificaciones ---
async function initNotificationsPage() {
  const list = document.getElementById('notificationsList');
  if (!list) return;
  try {
    const notes = await apiFetch('/notifications');
    list.innerHTML = '';
    if (!notes || notes.length === 0) { list.innerHTML = '<div class="empty">No hay notificaciones</div>'; return; }
    notes.forEach(n => {
      const li = document.createElement('div');
      li.className = 'card';
      li.style.marginBottom = '8px';
      const msg = n.payload?.message || JSON.stringify(n.payload || {});
      li.innerHTML = `<div style="font-size:12px;color:var(--muted)">${new Date(n.created_at).toLocaleString()}</div><div style="margin-top:6px">${escapeHtml(msg)}</div>`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = '<div class="empty">Error cargando notificaciones</div>';
  }
}

// --- Historial (pujas y compras) ---
async function initHistoryPage() {
  const el = document.getElementById('historyList');
  if (!el) return;
  try {
    const data = await apiFetch('/users/me/history');
    el.innerHTML = '<h4>Offers you bid on</h4>';
    if (!data.bids || data.bids.length === 0) {
      el.innerHTML += '<div class="empty">No hay pujas</div>';
    } else {
      data.bids.forEach(b => {
        const c = document.createElement('div');
        c.className = 'card';
        c.style.marginBottom = '8px';
        c.innerHTML = `<div><strong>${escapeHtml(b.offer_title)}</strong></div><div>Bid: $${parseFloat(b.price).toFixed(2)}</div><div style="font-size:12px;color:var(--muted)">${new Date(b.created_at).toLocaleString()}</div>`;
        el.appendChild(c);
      });
    }

    el.innerHTML += '';
    if (!data.purchases || data.purchases.length === 0) {
      el.innerHTML += '';
    } else {
      data.purchases.forEach(p => {
        const c = document.createElement('div');
        c.className = 'card';
        c.style.marginBottom = '8px';
        c.innerHTML = `<div><strong>${escapeHtml(p.title)}</strong></div><div>Precio: $${parseFloat(p.price).toFixed(2)}</div><div style="font-size:12px;color:var(--muted)">${new Date(p.sold_at).toLocaleString()}</div>`;
        el.appendChild(c);
      });
    }
  } catch (err) {
    console.error(err);
    el.innerHTML = '<div class="empty">Error cargando historial</div>';
  }
}

// --- Admin panel ---
async function initAdminPage() {
  const el = document.getElementById('adminList');
  if (!el) return;
  try {
    const users = await apiFetch('/admin/users');
    el.innerHTML = '<h3>Registered users</h3>';
    if (!users || users.length === 0) el.innerHTML += '<div class="empty">No hay usuarios</div>';
    users.forEach(u => {
      const d = document.createElement('div');
      d.className = 'card';
      d.style.marginBottom = '8px';
      d.innerHTML = `<div><strong>${escapeHtml(u.name || u.email)}</strong> (${escapeHtml(u.email)})</div><div>Tel: ${escapeHtml(u.phone || '')} • Rol: ${escapeHtml(u.role)}</div><div style="margin-top:8px"><button class="btn btn-secondary" data-del="${u.id}">Delete</button></div>`;
      el.appendChild(d);
    });
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async (e) => {
      const id = e.target.dataset.del;
      if (!confirm('Eliminar usuario?')) return;
      try {
        await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
        toast('Usuario eliminado');
        initAdminPage();
      } catch (err) {
        toast(err.message || 'Error al eliminar usuario');
      }
    }));
  } catch (err) {
    console.error(err);
    el.innerHTML = '<div class="empty">No autorizado o error</div>';
  }
}

// ---------------- Export (opcional) ----------------
// No es necesario exportar nada; el router dispara los controladores.
// Pero exporto toast por si otros módulos desean usarlo.
export { toast };
