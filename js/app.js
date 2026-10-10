/* ==========================================================
   M SQUARE — الهيكل المشترك: الرأس، القائمة، السلة، المفضلة، اللغة
   ========================================================== */

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }
};

let LANG = store.get('ms_lang', 'ar');
const t = key => (I18N[LANG] && I18N[LANG][key]) || I18N.ar[key] || key;
const catLabel = (group, id) => {
  const c = CATEGORIES[group].find(x => x.id === id);
  return c ? c.label[LANG] : id;
};
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const formatPrice = n => `${n.toLocaleString('en-US')} ${t('da')}`;
const getProduct = id => PRODUCTS.find(p => p.id === Number(id));
const priceRangeOf = price => CATEGORIES.price.find(r => price >= r.min && price <= r.max).id;

const ICONS = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4h14v12H1zM15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18M6 12h12M10 19h4"/></svg>'
};
const LOGO = '<svg class="logo-mark" viewBox="0 0 563 563" fill="currentColor" aria-hidden="true"><path d="M72 65H510V500H312L362 440H450V125H72Z"/><path d="M75 200H160L218 318L300 200H368L218 430L135 308V500H75Z"/></svg>';

/* ---------- الرأس ---------- */
function renderHeader() {
  const groups = ['brand', 'style', 'price', 'season'];
  const mega = groups.map(g => `
    <li class="nav-item has-mega">
      <a href="shop.html" class="nav-link">${t(g)}</a>
      <div class="mega">
        <div class="mega-inner">
          <div class="mega-col">
            <h4>${t(g)}</h4>
            <ul class="${g === 'brand' ? 'cols-2' : ''}">
              ${CATEGORIES[g].map(c => `<li><a href="shop.html?${g}=${c.id}">${c.icon ? c.icon + ' ' : ''}${c.label[LANG]}</a></li>`).join('')}
            </ul>
            <a class="mega-all" href="shop.html">${t('shopAll')} ${LANG === 'ar' ? '←' : '→'}</a>
          </div>
          <div class="mega-promo">
            ${shoeSVG(PRODUCTS.find(p => (g === 'season' ? p.style === 'outdoor' : g === 'price' ? p.oldPrice : g === 'style' ? p.style === 'streetwear' : p.best)))}
            <span>${t(g)}</span>
          </div>
        </div>
      </div>
    </li>`).join('');

  document.getElementById('site-header').innerHTML = `
    <div class="promo-bar">${t('promo')}</div>
    <header class="header">
      <div class="header-inner">
        <button class="icon-btn only-mobile" id="menu-open" aria-label="Menu">${ICONS.menu}</button>
        <a href="index.html" class="logo" aria-label="M Square">${LOGO}<span>M SQUARE</span></a>
        <nav class="main-nav">
          <ul>
            <li class="nav-item"><a href="shop.html?sort=new" class="nav-link">${t('new')}</a></li>
            ${mega}
            <li class="nav-item"><a href="shop.html?sale=1" class="nav-link sale-link">${t('sale')}</a></li>
          </ul>
        </nav>
        <div class="header-actions">
          <form class="search-box" action="shop.html">
            ${ICONS.search}
            <input type="search" name="q" placeholder="${t('search')}" aria-label="${t('search')}">
          </form>
          <button class="lang-btn" id="lang-toggle">${LANG === 'ar' ? 'FR' : 'ع'}</button>
          <button class="icon-btn hide-mobile" aria-label="${t('account')}">${ICONS.user}</button>
          <button class="icon-btn" id="wish-open" aria-label="${t('wishlist')}">${ICONS.heart}<span class="badge" id="wish-count"></span></button>
          <button class="icon-btn" id="cart-open" aria-label="${t('cart')}">${ICONS.bag}<span class="badge" id="cart-count"></span></button>
        </div>
      </div>
    </header>

    <div class="drawer-overlay" id="overlay"></div>

    <aside class="drawer drawer-start" id="mobile-menu">
      <div class="drawer-head"><a href="index.html" class="logo">${LOGO}<span>M SQUARE</span></a><button class="icon-btn" data-close>${ICONS.close}</button></div>
      <form class="search-box mobile-search" action="shop.html">${ICONS.search}<input type="search" name="q" placeholder="${t('search')}"></form>
      <ul class="m-nav">
        <li><a href="shop.html?sort=new">${t('new')}</a></li>
        ${groups.map(g => `
          <li class="m-group">
            <button class="m-toggle">${t(g)}<span>+</span></button>
            <ul>${CATEGORIES[g].map(c => `<li><a href="shop.html?${g}=${c.id}">${c.icon ? c.icon + ' ' : ''}${c.label[LANG]}</a></li>`).join('')}</ul>
          </li>`).join('')}
        <li><a href="shop.html?sale=1" class="sale-link">${t('sale')}</a></li>
      </ul>
      <div class="m-links"><a href="#">${t('account')}</a><a href="#">${t('help')}</a></div>
    </aside>

    <aside class="drawer drawer-end" id="cart-drawer">
      <div class="drawer-head"><h3>${t('cart')}</h3><button class="icon-btn" data-close>${ICONS.close}</button></div>
      <div class="drawer-body" id="cart-body"></div>
      <div class="drawer-foot" id="cart-foot"></div>
    </aside>

    <aside class="drawer drawer-end" id="wish-drawer">
      <div class="drawer-head"><h3>${t('wishlist')}</h3><button class="icon-btn" data-close>${ICONS.close}</button></div>
      <div class="drawer-body" id="wish-body"></div>
    </aside>

    <div class="modal" id="checkout-modal">
      <div class="modal-box">
        <button class="icon-btn modal-close" data-close>${ICONS.close}</button>
        <h3>${t('checkout')}</h3>
        <form id="checkout-form">
          <label>${t('fullName')}<input required name="name"></label>
          <label>${t('phone')}<input required name="phone" type="tel" pattern="0[5-7][0-9]{8}" placeholder="05XXXXXXXX"></label>
          <label>${t('wilaya')}<select required name="wilaya">${WILAYAS.map((w, i) => `<option value="${i + 1}">${String(i + 1).padStart(2, '0')} - ${w}</option>`).join('')}</select></label>
          <label>${t('address')}<input required name="address"></label>
          <div class="checkout-total"><span>${t('subtotal')}</span><strong id="checkout-total"></strong></div>
          <p class="order-error" id="order-error" hidden>${t('orderError')}</p>
          <button class="btn btn-dark btn-block" type="submit">${t('confirmOrder')}</button>
        </form>
        <div class="order-done" id="order-done" hidden><p>${t('orderDone')}</p><p class="muted">${t('orderNo')}: <strong id="order-id" dir="ltr"></strong></p></div>
      </div>
    </div>

    <div class="toast" id="toast"></div>`;
}

/* ---------- التذييل ---------- */
function renderFooter() {
  document.getElementById('site-footer').innerHTML = `
    <section class="newsletter">
      <div class="container newsletter-inner">
        <div><h3>${t('newsletterT')}</h3><p>${t('newsletterS')}</p></div>
        <form id="newsletter-form"><input type="email" required placeholder="${t('email')}"><button class="btn btn-light">${t('subscribe')}</button></form>
      </div>
    </section>
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <a href="index.html" class="logo logo-light">${LOGO}<span>M SQUARE</span></a>
          <p class="footer-about">${t('aboutText')}</p>
        </div>
        <div>
          <h4>${t('needHelp')}</h4>
          <ul><li><a href="#">${t('contactUs')}</a></li><li><a href="#">${t('shipping')}</a></li><li><a href="#">${t('returns')}</a></li><li><a href="#">${t('faq')}</a></li></ul>
        </div>
        <div>
          <h4>${t('brand')}</h4>
          <ul>${CATEGORIES.brand.slice(0, 5).map(b => `<li><a href="shop.html?brand=${b.id}">${b.label[LANG]}</a></li>`).join('')}</ul>
        </div>
        <div>
          <h4>${t('season')}</h4>
          <ul>${CATEGORIES.season.map(s => `<li><a href="shop.html?season=${s.id}">${s.label[LANG]}</a></li>`).join('')}</ul>
        </div>
        <div>
          <h4>${t('followUs')}</h4>
          <div class="socials">
            <a href="#" aria-label="Facebook">f</a><a href="#" aria-label="Instagram">ig</a><a href="#" aria-label="TikTok">tk</a><a href="#" aria-label="YouTube">yt</a>
          </div>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© M SQUARE ${new Date().getFullYear()}. ${t('rights')}</span>
        <span><a href="#">${t('privacy')}</a> · <a href="#">${t('terms')}</a></span>
      </div>
    </footer>`;
}

const WILAYAS = ['أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار','البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر','الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس','عنابة','قالمة','قسنطينة','المدية','مستغانم','المسيلة','معسكر','ورقلة','وهران','البيض','إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت','الوادي','خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت','غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس','عين صالح','عين قزام','تقرت','جانت','المغير','المنيعة','آفلو','الأبيض سيدي الشيخ','العريشة','القنطرة','بريكة','بوسعادة','بئر العاتر','قصر البخاري','قصر الشلالة','عين وسارة','مسعد'];

/* ---------- بطاقة المنتج ---------- */
function productCard(p) {
  const wished = getWish().includes(p.id);
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `
    <article class="card">
      <a href="product.html?id=${p.id}" class="card-media">
        ${productVisual(p)}
        ${p.stock === false ? `<span class="tag tag-out">${t('outOfStock')}</span>` : discount ? `<span class="tag tag-sale">-${discount}%</span>` : p.isNew ? `<span class="tag">${t('new')}</span>` : ''}
      </a>
      <button class="card-wish ${wished ? 'active' : ''}" data-wish="${p.id}" aria-label="${t('wishlist')}">${ICONS.heart}</button>
      <div class="card-body">
        <span class="card-brand">${catLabel('brand', p.brand)} · ${catLabel('style', p.style)}</span>
        <a href="product.html?id=${p.id}" class="card-title">${p.name}</a>
        <div class="card-price">
          <strong class="${p.oldPrice ? 'is-sale' : ''}">${formatPrice(p.price)}</strong>
          ${p.oldPrice ? `<s>${formatPrice(p.oldPrice)}</s>` : ''}
        </div>
        <div class="card-seasons">${p.seasons.map(s => `<span title="${catLabel('season', s)}">${CATEGORIES.season.find(x => x.id === s).icon}</span>`).join('')}</div>
      </div>
    </article>`;
}

/* شريط منتجات قابل للتمرير */
function carousel(title, products, link) {
  return `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>${title}</h2>
          ${link ? `<a href="${link}" class="link-under">${t('viewAll')}</a>` : ''}
        </div>
        <div class="carousel">
          <button class="car-btn car-prev" aria-label="prev">${ICONS.arrow}</button>
          <div class="car-track">${products.map(productCard).join('')}</div>
          <button class="car-btn car-next" aria-label="next">${ICONS.arrow}</button>
        </div>
      </div>
    </section>`;
}

function bindCarousels(root = document) {
  root.querySelectorAll('.carousel').forEach(c => {
    const track = c.querySelector('.car-track');
    const step = () => track.clientWidth * 0.8;
    const dir = document.dir === 'rtl' ? -1 : 1;
    c.querySelector('.car-prev').onclick = () => track.scrollBy({ left: -step() * dir, behavior: 'smooth' });
    c.querySelector('.car-next').onclick = () => track.scrollBy({ left: step() * dir, behavior: 'smooth' });
  });
}

/* ---------- السلة ---------- */
const getCart = () => store.get('ms_cart', []);
const setCart = c => { store.set('ms_cart', c); updateCounts(); renderCart(); };

function addToCart(id, size, qty = 1) {
  const cart = getCart();
  const line = cart.find(l => l.id === id && l.size === size);
  if (line) line.qty += qty; else cart.push({ id, size, qty });
  setCart(cart);
  toast(t('added'));
  openDrawer('cart-drawer');
}

function cartTotal() {
  return getCart().reduce((sum, l) => sum + (getProduct(l.id)?.price || 0) * l.qty, 0);
}

function renderCart() {
  const body = document.getElementById('cart-body');
  const foot = document.getElementById('cart-foot');
  if (!body) return;
  const cart = getCart().filter(l => getProduct(l.id));
  if (!cart.length) {
    body.innerHTML = `<div class="empty">${ICONS.bag}<p>${t('emptyCart')}</p><a href="shop.html" class="btn btn-dark">${t('shopNow')}</a></div>`;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = cart.map((l, i) => {
    const p = getProduct(l.id);
    return `
      <div class="line">
        <a href="product.html?id=${p.id}" class="line-img">${productVisual(p)}</a>
        <div class="line-info">
          <strong>${p.name}</strong>
          <span>${catLabel('brand', p.brand)} · ${t('size')}: ${l.size}</span>
          <div class="qty">
            <button data-qty="${i}" data-d="-1">−</button><span>${l.qty}</span><button data-qty="${i}" data-d="1">+</button>
          </div>
        </div>
        <div class="line-end">
          <strong>${formatPrice(p.price * l.qty)}</strong>
          <button class="link-under" data-remove="${i}">${t('remove')}</button>
        </div>
      </div>`;
  }).join('');
  foot.innerHTML = `
    <div class="checkout-total"><span>${t('subtotal')}</span><strong>${formatPrice(cartTotal())}</strong></div>
    <button class="btn btn-dark btn-block" id="go-checkout">${t('checkout')}</button>`;
}

/* ---------- المفضلة ---------- */
const getWish = () => store.get('ms_wish', []);
function toggleWish(id) {
  let w = getWish();
  w = w.includes(id) ? w.filter(x => x !== id) : [...w, id];
  store.set('ms_wish', w);
  document.querySelectorAll(`[data-wish="${id}"]`).forEach(b => b.classList.toggle('active', w.includes(id)));
  updateCounts();
  renderWish();
}
function renderWish() {
  const body = document.getElementById('wish-body');
  const items = getWish().map(getProduct).filter(Boolean);
  body.innerHTML = items.length
    ? `<div class="wish-grid">${items.map(productCard).join('')}</div>`
    : `<div class="empty">${ICONS.heart}<p>${t('emptyWish')}</p></div>`;
}

function updateCounts() {
  const c = getCart().reduce((s, l) => s + l.qty, 0);
  const w = getWish().length;
  const cc = document.getElementById('cart-count');
  const wc = document.getElementById('wish-count');
  if (cc) { cc.textContent = c; cc.hidden = !c; }
  if (wc) { wc.textContent = w; wc.hidden = !w; }
}

/* ---------- الدروج والنوافذ ---------- */
function openDrawer(id) {
  closeAll();
  document.getElementById(id).classList.add('open');
  document.getElementById('overlay').classList.add('open');
  document.body.classList.add('locked');
}
function closeAll() {
  document.querySelectorAll('.drawer.open, .modal.open, .drawer-overlay.open').forEach(el => el.classList.remove('open'));
  document.body.classList.remove('locked');
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function bindGlobal() {
  document.getElementById('cart-open').onclick = () => { renderCart(); openDrawer('cart-drawer'); };
  document.getElementById('wish-open').onclick = () => { renderWish(); openDrawer('wish-drawer'); };
  document.getElementById('menu-open').onclick = () => openDrawer('mobile-menu');
  document.getElementById('overlay').onclick = closeAll;
  document.getElementById('lang-toggle').onclick = () => {
    store.set('ms_lang', LANG === 'ar' ? 'fr' : 'ar');
    location.reload();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-close], [data-wish], [data-qty], [data-remove], #go-checkout, .m-toggle');
    if (!el) return;
    if (el.matches('[data-close]')) closeAll();
    else if (el.matches('[data-wish]')) { e.preventDefault(); toggleWish(Number(el.dataset.wish)); }
    else if (el.matches('[data-qty]')) {
      const cart = getCart(); const l = cart[el.dataset.qty];
      l.qty = Math.max(1, l.qty + Number(el.dataset.d)); setCart(cart);
    }
    else if (el.matches('[data-remove]')) { const cart = getCart(); cart.splice(el.dataset.remove, 1); setCart(cart); }
    else if (el.id === 'go-checkout') {
      closeAll();
      document.getElementById('checkout-total').textContent = formatPrice(cartTotal());
      document.getElementById('checkout-form').hidden = false;
      document.getElementById('order-done').hidden = true;
      document.getElementById('checkout-modal').classList.add('open');
      document.getElementById('overlay').classList.add('open');
    }
    else if (el.matches('.m-toggle')) el.parentElement.classList.toggle('open');
  });

  document.getElementById('checkout-form').onsubmit = async e => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type="submit"]');
    const err = document.getElementById('order-error');
    const data = Object.fromEntries(new FormData(form));
    const items = getCart().filter(l => getProduct(l.id)).map(l => {
      const p = getProduct(l.id);
      return { id: p.id, name: p.name, brand: catLabel('brand', p.brand), size: l.size, qty: l.qty, price: p.price, lineTotal: p.price * l.qty };
    });
    if (!items.length) return;
    const order = {
      id: 'MS-' + Date.now().toString(36).toUpperCase(),
      name: data.name, phone: data.phone, address: data.address,
      wilaya: `${String(data.wilaya).padStart(2, '0')} - ${WILAYAS[data.wilaya - 1]}`,
      items, total: cartTotal(), lang: LANG, date: new Date().toISOString()
    };

    btn.disabled = true;
    btn.textContent = t('sending');
    err.hidden = true;
    try {
      await sendOrder(order);
      store.set('ms_orders', [...store.get('ms_orders', []), order]);
      setCart([]);
      form.reset();
      form.hidden = true;
      document.getElementById('order-id').textContent = order.id;
      document.getElementById('order-done').hidden = false;
    } catch (ex) {
      console.error(ex);
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = t('confirmOrder');
    }
  };

  document.getElementById('newsletter-form').onsubmit = e => {
    e.preventDefault(); e.target.reset(); toast(t('subscribed'));
  };
}

/* ---------- Supabase ----------
   القراءة والإرسال عبر REST مباشرة (بدون مكتبة) — المكتبة تُحمَّل فقط في لوحة الإدارة. */
const HAS_DB = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const dbHeaders = () => ({ apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` });

/* تحويل سطر من جدول ms_products إلى شكل المنتج المستعمل في الموقع */
function fromRow(r) {
  return {
    id: r.id, name: r.name, brand: r.brand, style: r.style, seasons: r.seasons || [],
    price: r.price, oldPrice: r.old_price || undefined, colors: r.colors,
    image: (r.images && r.images[0]) || r.image || undefined, images: r.images || [],
    sizes: r.sizes && r.sizes.length ? r.sizes : SIZES,
    isNew: r.is_new, best: r.best, stock: r.stock,
    description: { ar: r.description_ar, fr: r.description_fr }
  };
}

async function loadProducts() {
  if (!HAS_DB) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ms_products?select=*&order=sort_order.asc,id.desc`, { headers: dbHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (rows.length) PRODUCTS.splice(0, PRODUCTS.length, ...rows.map(fromRow));
  } catch (err) {
    console.error('تعذر تحميل المنتجات من Supabase، تُعرض المنتجات المحلية:', err);
  }
}

/* إرسال الطلب إلى جدول ms_orders — الأسعار يعيد حسابها الخادم */
async function sendOrder(order) {
  if (!HAS_DB) {
    console.warn('Supabase غير مُعدّ في js/config.js — حُفظ الطلب في المتصفح فقط');
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ms_orders`, {
    method: 'POST',
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      ref: order.id,
      customer_name: order.name,
      phone: order.phone,
      wilaya: order.wilaya,
      address: order.address,
      items: order.items.map(i => ({ id: i.id, size: String(i.size), qty: i.qty })),
      total: order.total,
      lang: order.lang
    })
  });
  if (!res.ok) throw new Error(`order_failed_${res.status}: ${await res.text()}`);
}

/* ---------- التشغيل ---------- */
/* تحميل المنتجات ثم رسم الصفحة */
async function boot(render) {
  await loadProducts();
  initLayout();
  render();
}

function initLayout() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  renderHeader();
  renderFooter();
  bindGlobal();
  updateCounts();
}
