import { router } from "./router.js";
import { getActiveUser, loginUser, logoutUser, registerUser } from "./auth.js";
import { db } from "./db.js";

// Boot
window.addEventListener("hashchange", router);
window.addEventListener("load", () => {
  const y = document.getElementById("year"); if(y) y.textContent = new Date().getFullYear();
  router();
  refreshHeader();
});

// Re-init header when route changes
document.addEventListener("route:loaded", (e)=>{
  refreshHeader();
  const path = e.detail.path;
  if(path==="/login") initLoginPage();
  if(path==="/register") initRegisterPage();
  if(path==="/offers") initOffersPage();
  if(path==="/create-offer") initCreateOfferPage();
  if(path==="/bid") initBidPage();
});

function refreshHeader(){
  const user = getActiveUser();
  const guestEls = document.querySelectorAll(".guest-only");
  const authEls = document.querySelectorAll(".auth-only");
  const sellerOnly = document.querySelectorAll(".seller-only");
  guestEls.forEach(el=> el.style.display = user ? "none":"");
  authEls.forEach(el=> el.style.display = user ? "":"none");
  sellerOnly.forEach(el=> el.style.display = (user && user.role==="seller") ? "":"none");
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn?.addEventListener("click", ()=>{
    logoutUser();
    location.hash = "/login";
  });
}

// ---------------- Controllers ----------------

function initLoginPage(){
  const form = document.getElementById("loginForm");
  if(!form) return;
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    try{
      loginUser(email, password);
      location.hash = "/offers";
    }catch(err){
      toast(err.message);
    }
  });
}

function initRegisterPage(){
  const form = document.getElementById("registerForm");
  if(!form) return;
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const role = form.role.value;
    if(password.length < 6){ toast("La contraseña debe tener al menos 6 caracteres"); return; }
    try{
      registerUser(email, password, role);
      toast("Registro correcto. Ahora inicia sesión.");
      location.hash = "/login";
    }catch(err){
      toast(err.message);
    }
  });
}

function initCreateOfferPage(){
  const form = document.getElementById("offerForm");
  if(!form) return;
  const user = getActiveUser();
  if(user?.role !== "seller"){
    toast("Solo vendedores pueden publicar");
    location.hash = "/offers";
    return;
  }
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const offer = {
      id: Date.now(),
      seller: user.email,
      desc: form.desc.value.trim(),
      price: parseFloat(form.price.value),
      qty: parseInt(form.qty.value),
      loc: form.loc.value.trim(),
      bids: []
    };
    const offers = db.offers;
    offers.push(offer);
    db.offers = offers;
    toast("Oferta publicada");
    location.hash = "/offers";
  });
}

function initOffersPage(){
  const list = document.getElementById("offersList");
  const filter = document.getElementById("filterLoc");
  const clear = document.getElementById("clearFilter");
  if(!list) return;

  function render(){
    list.innerHTML = "";
    const current = db.offers;
    const loc = (filter?.value || "").trim().toLowerCase();
    const filtered = loc ? current.filter(o=>o.loc.toLowerCase().includes(loc)) : current;
    if(filtered.length===0){
      list.innerHTML = '<div class="empty">No hay ofertas que coincidan.</div>';
      return;
    }
    filtered.forEach(o=>{
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `
        <h3>${o.desc}</h3>
        <div class="meta">Vendedor: ${o.seller} • Ubicación: <span class="pill">${o.loc}</span></div>
        <div class="price">$${o.price.toFixed(2)}</div>
        <div class="meta">Cantidad: ${o.qty}</div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-cta" data-bid>Ofertar</button>
        </div>
      `;
      el.querySelector("[data-bid]").addEventListener("click", ()=>{
        location.hash = `#/bid?id=${o.id}`;
      });
      list.appendChild(el);
    });
  }
  filter?.addEventListener("input", render);
  clear?.addEventListener("click", ()=>{ if(filter){ filter.value=""; render(); } });
  render();
}

function initBidPage(){
  const params = new URLSearchParams((location.hash.split("?")[1]||""));
  const id = parseInt(params.get("id"));
  const offer = db.offers.find(o=>o.id===id);
  const details = document.getElementById("offerDetails");
  const form = document.getElementById("bidForm");
  const bidsList = document.getElementById("bidsList");
  if(!offer || !details) return;

  details.innerHTML = `
    <h3>${offer.desc}</h3>
    <div class="meta">Ubicación: <span class="pill">${offer.loc}</span> • Cant.: ${offer.qty}</div>
    <div class="price">Precio inicial: $${offer.price.toFixed(2)}</div>
  `;

  function renderBids(){
    bidsList.innerHTML = "";
    if(offer.bids.length===0){
      bidsList.innerHTML = '<div class="empty">Aún no hay contraofertas. ¡Sé el primero!</div>';
      return;
    }
    offer.bids.slice().reverse().forEach(b=>{
      const li = document.createElement("li");
      li.className="card";
      li.innerHTML = `<strong>${b.user}</strong> ofreció <span class="price">$${b.price.toFixed(2)}</span>`;
      bidsList.appendChild(li);
    });
  }

  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const price = parseFloat(form.bidPrice.value);
    if(isNaN(price) || price<=0){ toast("Ingresa un precio válido"); return; }
    offer.bids.push({ user: getActiveUser().email, price, at: Date.now() });
    // persist
    const offers = db.offers.map(o=>o.id===offer.id ? offer : o);
    db.offers = offers;
    form.reset();
    renderBids();
    toast("Contraoferta enviada");
  });

  renderBids();
}

// Simple toast
function toast(msg){
  let t = document.getElementById("toast");
  if(!t){
    t = document.createElement("div");
    t.id="toast";
    Object.assign(t.style,{
      position:"fixed",bottom:"18px",left:"50%",transform:"translateX(-50%)",
      padding:"12px 16px",borderRadius:"12px",background:"rgba(31,41,55,.95)",color:"#fff",
      boxShadow:"var(--shadow)",zIndex:1000,fontWeight:"700",transition:"opacity .2s"
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  setTimeout(()=>{ t.style.opacity="0"; }, 1800);
}
