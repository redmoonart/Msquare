/* ==========================================================
   M SQUARE — لوحة الإدارة (الطلبات + المنتجات) عبر Supabase
   ========================================================== */

const BUCKET = 'ms-product-images';
const ALL_SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
const ORDER_STATUSES = [
  { value: 'new',       label: '🆕 جديد' },
  { value: 'confirmed', label: '✅ مؤكد' },
  { value: 'shipped',   label: '🚚 مشحون' },
  { value: 'delivered', label: '📦 تم التسليم' },
  { value: 'refused',   label: '↩️ رُفض عند الاستلام' },
  { value: 'cancelled', label: '❌ ملغى' }
];

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => `${Number(n || 0).toLocaleString('en-US')} دج`;
const label = (group, id) => CATEGORIES[group].find(c => c.id === id)?.label.ar || id;
const statusLabel = v => ORDER_STATUSES.find(s => s.value === v)?.label || v;
const fmtDate = iso => new Date(iso).toLocaleString('ar-DZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/* توحيد الهاتف: 0555 12 34 56 / +213555123456 → 0555123456 */
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00213')) d = d.slice(5);
  else if (d.startsWith('213') && d.length >= 12) d = d.slice(3);
  if (d.length === 9) d = '0' + d;
  return d;
}

function toast(msg, bad) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.className = 'toast', 2600);
}

function show(view) {
  ['#login-view', '#setup-view', '#app-view'].forEach(v => $(v).hidden = v !== view);
}

/* ---------------- الدخول ---------------- */
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
  show('#setup-view');
} else {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.sb = sb;
  init(sb);
}

async function init(sb) {
  const { data: { session } } = await sb.auth.getSession();
  if (session) startApp(sb, session); else show('#login-view');

  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    $('#login-error').hidden = true;
    const { data, error } = await sb.auth.signInWithPassword({ email: f.get('email').trim(), password: f.get('password') });
    btn.disabled = false;
    if (error) {
      $('#login-error').textContent = 'البريد أو كلمة المرور غير صحيحة';
      $('#login-error').hidden = false;
      return;
    }
    startApp(sb, data.session);
  };

  $('#logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };
}

function startApp(sb, session) {
  if (ADMIN_EMAIL && session.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    show('#login-view');
    $('#login-error').textContent = 'هذا الحساب ليس حساب المدير';
    $('#login-error').hidden = false;
    sb.auth.signOut();
    return;
  }
  show('#app-view');
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
    $('#tab-orders').hidden = t.dataset.tab !== 'orders';
    $('#tab-products').hidden = t.dataset.tab !== 'products';
  });
  Orders.init(sb);
  Products.init(sb);
}

/* ==========================================================
   الطلبات
   ========================================================== */
const Orders = {
  sb: null, list: [], blocked: new Map(), blockReady: true,
  filter: 'all', q: '', open: null, lastNewIds: null,

  init(sb) {
    this.sb = sb;
    $('#order-search').oninput = e => { this.q = e.target.value.trim().toLowerCase(); this.render(); };
    $('#orders-refresh').onclick = () => this.load(true);
    $('#orders-csv').onclick = () => this.csv();
    $('#orders-body').addEventListener('click', e => this.onClick(e));
    $('#orders-body').addEventListener('change', e => {
      const sel = e.target.closest('[data-status]');
      if (sel) this.setStatus(Number(sel.dataset.status), sel.value);
    });
    this.load();
    setInterval(() => this.load(), 60000);   // تحديث تلقائي كل دقيقة
  },

  async load(manual) {
    const { data, error } = await this.sb.from('ms_orders').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) { toast('تعذر تحميل الطلبات: ' + error.message, true); return; }
    const bl = await this.sb.from('ms_blocked_phones').select('phone, reason');
    this.blockReady = !bl.error;
    this.blocked = new Map((bl.data || []).map(r => [r.phone, r.reason || '']));
    $('#blocked-warn').hidden = this.blockReady;

    // تنبيه عند وصول طلب جديد
    const newIds = new Set(data.filter(o => o.status === 'new').map(o => o.id));
    if (this.lastNewIds && [...newIds].some(id => !this.lastNewIds.has(id))) {
      toast('🔔 وصل طلب جديد!');
      beep();
    }
    this.lastNewIds = newIds;
    this.list = data;
    this.render();
    if (manual) toast('تم التحديث');
  },

  history() {
    const h = new Map();
    this.list.forEach(o => {
      const k = normPhone(o.phone);
      const r = h.get(k) || { total: 0, delivered: 0, refused: 0 };
      r.total++;
      if (o.status === 'delivered') r.delivered++;
      if (o.status === 'refused') r.refused++;
      h.set(k, r);
    });
    return h;
  },

  isRisky(o, h) {
    const k = normPhone(o.phone);
    const past = h.get(k) || { refused: 0 };
    const ownRefused = o.status === 'refused' ? 1 : 0;
    return this.blocked.has(k) || past.refused - ownRefused > 0;
  },

  render() {
    const h = this.history();
    const active = o => o.status === 'new' || o.status === 'confirmed';
    const counts = { all: this.list.length, risky: this.list.filter(o => active(o) && this.isRisky(o, h)).length };
    ORDER_STATUSES.forEach(s => counts[s.value] = this.list.filter(o => o.status === s.value).length);

    // الإحصائيات
    const today = new Date().toDateString();
    const delivered = this.list.filter(o => o.status === 'delivered');
    const done = delivered.length + counts.refused;
    $('#stats').innerHTML = `
      <div class="stat"><span>طلبات جديدة</span><strong>${counts.new}</strong></div>
      <div class="stat"><span>طلبات اليوم</span><strong>${this.list.filter(o => new Date(o.created_at).toDateString() === today).length}</strong></div>
      <div class="stat"><span>مبيعات مسلَّمة</span><strong>${money(delivered.reduce((s, o) => s + o.total, 0))}</strong></div>
      <div class="stat"><span>نسبة الاستلام</span><strong>${done ? Math.round(delivered.length / done * 100) + '%' : '—'}</strong></div>`;

    const badge = $('#new-badge');
    badge.textContent = counts.new; badge.hidden = !counts.new;
    document.title = (counts.new ? `(${counts.new}) ` : '') + 'لوحة الإدارة | M SQUARE';

    $('#order-filters').innerHTML = [
      `<button class="chip ${this.filter === 'all' ? 'active' : ''}" data-filter="all">الكل (${counts.all})</button>`,
      ...ORDER_STATUSES.map(s => `<button class="chip ${this.filter === s.value ? 'active' : ''}" data-filter="${s.value}">${s.label} (${counts[s.value]})</button>`),
      counts.risky ? `<button class="chip chip-risk ${this.filter === 'risky' ? 'active' : ''}" data-filter="risky">⚠️ زبائن مشبوهون (${counts.risky})</button>` : ''
    ].join('');
    $('#order-filters').onclick = e => {
      const b = e.target.closest('[data-filter]');
      if (b) { this.filter = b.dataset.filter; this.render(); }
    };

    const rows = this.list.filter(o => {
      if (this.filter === 'risky') { if (!(active(o) && this.isRisky(o, h))) return false; }
      else if (this.filter !== 'all' && o.status !== this.filter) return false;
      if (!this.q) return true;
      return [o.ref, o.customer_name, o.phone, normPhone(o.phone), o.wilaya, o.address].join(' ').toLowerCase().includes(this.q);
    });
    this.filtered = rows;

    $('#orders-body').innerHTML = rows.length ? rows.map(o => this.row(o, h)).join('')
      : `<tr><td colspan="6" class="empty">${this.list.length ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات بعد'}</td></tr>`;
  },

  row(o, h) {
    const k = normPhone(o.phone);
    const past = h.get(k) || { total: 1, delivered: 0, refused: 0 };
    const refusedBefore = past.refused - (o.status === 'refused' ? 1 : 0);
    const isBlocked = this.blocked.has(k);
    const isOpen = this.open === o.id;
    const wa = '213' + k.slice(1);
    const qty = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    const badges = [
      isBlocked ? `<span class="cbadge bad" title="${esc(this.blocked.get(k))}">⛔ محظور</span>` : '',
      refusedBefore > 0 ? `<span class="cbadge bad">↩️ رفض ${refusedBefore} مرة</span>` : '',
      past.delivered > 0 && o.status !== 'delivered' ? `<span class="cbadge good">⭐ زبون سابق</span>` : '',
      past.total > 1 && !refusedBefore && !past.delivered ? `<span class="cbadge">${past.total} طلبات</span>` : ''
    ].join('');
    return `
      <tr class="row status-${o.status} ${isBlocked || refusedBefore > 0 ? 'risky' : ''}">
        <td><button class="link" data-toggle="${o.id}">${isOpen ? '▾' : '▸'} <b dir="ltr">${esc(o.ref || '#' + o.id)}</b></button><div class="muted small">${fmtDate(o.created_at)}</div></td>
        <td><b>${esc(o.customer_name)}</b><div class="muted small" dir="ltr">${esc(o.phone)}</div><div class="badges">${badges}</div></td>
        <td>${esc(o.wilaya || '—')}</td>
        <td><b>${money(o.total)}</b><div class="muted small">${qty} قطعة</div></td>
        <td><select class="status-select" data-status="${o.id}">${ORDER_STATUSES.map(s => `<option value="${s.value}" ${s.value === o.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></td>
        <td><div class="actions">
          <a class="btn btn-ghost btn-sm" href="tel:${esc(k)}">📞</a>
          <a class="btn btn-ghost btn-sm" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent(`مرحباً ${o.customer_name}، نتصل بك من متجر M SQUARE لتأكيد طلبك رقم ${o.ref || o.id} بمبلغ ${money(o.total)}.`)}" target="_blank" rel="noopener">💬</a>
        </div></td>
      </tr>
      ${isOpen ? `
      <tr class="details"><td colspan="6">
        <div class="details-grid">
          <div>
            <h4>المنتجات</h4>
            <ul class="items">${(o.items || []).map(i => `
              <li><a href="product.html?id=${esc(i.id)}" target="_blank">${esc(i.name)}</a> <span class="muted">${esc(label('brand', i.brand))}</span>
                — مقاس <b>${esc(i.size)}</b> × ${esc(i.qty)} = <b>${money(i.lineTotal)}</b></li>`).join('')}</ul>
            <p><b>المجموع: ${money(o.total)}</b></p>
          </div>
          <div>
            <h4>التوصيل</h4>
            <p>${esc(o.wilaya || '')}<br>${esc(o.address || '')}</p>
            ${o.notes ? `<p class="muted">${esc(o.notes)}</p>` : ''}
            <div class="detail-actions">
              <button class="btn btn-ghost btn-sm" data-copy="${o.id}">📋 نسخ للتوصيل</button>
              ${this.blockReady ? `<button class="btn btn-ghost btn-sm" data-block="${o.id}">${isBlocked ? '✅ إلغاء الحظر' : '⛔ حظر الرقم'}</button>` : ''}
              <button class="btn btn-danger btn-sm" data-delete="${o.id}">🗑️ حذف</button>
            </div>
          </div>
        </div>
      </td></tr>` : ''}`;
  },

  onClick(e) {
    const t = e.target.closest('[data-toggle],[data-block],[data-delete],[data-copy]');
    if (!t) return;
    const id = Number(t.dataset.toggle || t.dataset.block || t.dataset.delete || t.dataset.copy);
    const o = this.list.find(x => x.id === id);
    if (t.dataset.toggle) { this.open = this.open === id ? null : id; this.render(); }
    else if (t.dataset.block) this.toggleBlock(o);
    else if (t.dataset.delete) this.remove(o);
    else if (t.dataset.copy) {
      const text = [
        `طلب ${o.ref || o.id}`, o.customer_name, o.phone, o.wilaya, o.address,
        ...(o.items || []).map(i => `${i.name} — مقاس ${i.size} × ${i.qty}`),
        `المجموع: ${money(o.total)}`
      ].join('\n');
      navigator.clipboard.writeText(text).then(() => toast('تم النسخ'), () => toast('تعذر النسخ', true));
    }
  },

  async setStatus(id, status) {
    const { error } = await this.sb.from('ms_orders').update({ status }).eq('id', id);
    if (error) { toast('تعذر تغيير الحالة: ' + error.message, true); this.render(); return; }
    const o = this.list.find(x => x.id === id);
    o.status = status;
    toast(`الحالة: ${statusLabel(status)}`);
    this.render();
    if (status === 'refused' && this.blockReady && !this.blocked.has(normPhone(o.phone))
        && confirm('رفض الزبون الطلب عند الاستلام. هل تريد حظر رقمه؟')) {
      this.toggleBlock(o, 'رفض الطلب عند الاستلام');
    }
  },

  async toggleBlock(o, preset) {
    const phone = normPhone(o.phone);
    if (this.blocked.has(phone)) {
      if (!confirm(`إلغاء حظر الرقم ${phone}؟`)) return;
      const { error } = await this.sb.from('ms_blocked_phones').delete().eq('phone', phone);
      if (error) return toast(error.message, true);
      this.blocked.delete(phone);
    } else {
      const reason = preset ?? prompt(`سبب حظر الرقم ${phone} (اختياري):`, '');
      if (reason === null) return;
      const { error } = await this.sb.from('ms_blocked_phones').insert({ phone, reason: reason.slice(0, 200) });
      if (error) return toast(error.message, true);
      this.blocked.set(phone, reason);
    }
    this.render();
  },

  async remove(o) {
    if (!confirm(`حذف الطلب ${o.ref || o.id} نهائياً؟`)) return;
    const { error } = await this.sb.from('ms_orders').delete().eq('id', o.id);
    if (error) return toast(error.message, true);
    this.list = this.list.filter(x => x.id !== o.id);
    toast('تم حذف الطلب');
    this.render();
  },

  csv() {
    const header = ['رقم الطلب', 'التاريخ', 'الاسم', 'الهاتف', 'الولاية', 'العنوان', 'المنتجات', 'المجموع', 'الحالة'];
    const rows = (this.filtered || []).map(o => [
      o.ref || o.id, new Date(o.created_at).toLocaleString('fr-DZ'), o.customer_name, o.phone, o.wilaya, o.address,
      (o.items || []).map(i => `${i.name} (${i.size}) x${i.qty}`).join(' | '), o.total, statusLabel(o.status)
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `طلبات-msquare-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
};

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.15;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.12);
    });
  } catch { /* لا صوت */ }
}

/* ==========================================================
   المنتجات
   ========================================================== */
const Products = {
  sb: null, list: [], editing: null, images: [], q: '', brand: '',

  init(sb) {
    this.sb = sb;
    const opts = g => CATEGORIES[g].map(c => `<option value="${c.id}">${c.label.ar}</option>`).join('');
    $('#product-form [name=brand]').innerHTML = opts('brand');
    $('#product-form [name=style]').innerHTML = opts('style');
    $('#product-brand-filter').innerHTML += opts('brand');
    $('#season-checks').innerHTML = CATEGORIES.season.map(s =>
      `<label class="check"><input type="checkbox" name="seasons" value="${s.id}"><span>${s.icon} ${s.label.ar}</span></label>`).join('');
    $('#size-checks').innerHTML = ALL_SIZES.map(s =>
      `<label class="check"><input type="checkbox" name="sizes" value="${s}"><span>${s}</span></label>`).join('');

    $('#product-search').oninput = e => { this.q = e.target.value.trim().toLowerCase(); this.render(); };
    $('#product-brand-filter').onchange = e => { this.brand = e.target.value; this.render(); };
    $('#product-add').onclick = () => this.open(null);
    $('#products-grid').addEventListener('click', e => this.onClick(e));
    document.querySelectorAll('[data-close-dialog]').forEach(b => b.onclick = () => $('#product-dialog').close());
    $('#product-form').onsubmit = e => { e.preventDefault(); this.save(); };
    $('#image-input').onchange = e => this.upload([...e.target.files]);
    $('#product-form').addEventListener('input', e => {
      if (/^color|price/.test(e.target.name)) this.preview();
    });
    this.bindImageDrag();
    this.load();
  },

  async load() {
    const { data, error } = await this.sb.from('ms_products').select('*').order('sort_order').order('id', { ascending: false });
    if (error) { toast('تعذر تحميل المنتجات: ' + error.message, true); return; }
    this.list = data;
    this.render();
  },

  toShoe(r) { return { name: r.name, style: r.style, colors: r.colors || ['#111', '#fff', '#eee'] }; },

  render() {
    const rows = this.list.filter(p =>
      (!this.brand || p.brand === this.brand) &&
      (!this.q || [p.name, label('brand', p.brand), label('style', p.style)].join(' ').toLowerCase().includes(this.q)));
    $('#products-grid').innerHTML = rows.length ? rows.map(p => `
      <article class="pcard ${p.stock ? '' : 'out'}">
        <div class="pcard-media">
          ${p.images?.[0] || p.image ? `<img src="${esc(p.images?.[0] || p.image)}" alt="" loading="lazy">` : shoeSVG(this.toShoe(p))}
          ${p.stock ? '' : '<span class="ptag">نفد</span>'}
          ${p.is_new ? '<span class="ptag ptag-new">جديد</span>' : ''}
        </div>
        <div class="pcard-body">
          <b>${esc(p.name)}</b>
          <span class="muted small">${esc(label('brand', p.brand))} · ${esc(label('style', p.style))} · ${(p.seasons || []).map(s => CATEGORIES.season.find(x => x.id === s)?.icon || '').join('')}</span>
          <span><b>${money(p.price)}</b> ${p.old_price ? `<s class="muted small">${money(p.old_price)}</s>` : ''}</span>
        </div>
        <div class="pcard-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${p.id}">✏️ تعديل</button>
          <button class="btn btn-ghost btn-sm" data-stock="${p.id}">${p.stock ? '🚫 نفد' : '✅ متوفر'}</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">🗑️</button>
        </div>
      </article>`).join('')
      : `<p class="empty">لا توجد منتجات</p>`;
  },

  onClick(e) {
    const b = e.target.closest('[data-edit],[data-stock],[data-del]');
    if (!b) return;
    const id = Number(b.dataset.edit || b.dataset.stock || b.dataset.del);
    const p = this.list.find(x => x.id === id);
    if (b.dataset.edit) this.open(p);
    else if (b.dataset.stock) this.toggleStock(p);
    else if (b.dataset.del) this.remove(p);
  },

  open(p) {
    this.editing = p;
    const f = $('#product-form');
    f.reset();
    $('#product-error').hidden = true;
    $('#product-form-title').textContent = p ? `تعديل: ${p.name}` : 'إضافة منتج';
    const v = p || { brand: CATEGORIES.brand[0].id, style: 'casual', seasons: [], sizes: [38, 39, 40, 41, 42, 43, 44, 45], stock: true, colors: ['#111111', '#ffffff', '#f2f2f2'], sort_order: 0 };
    f.name.value = v.name || '';
    f.brand.value = v.brand;
    f.style.value = v.style;
    f.price.value = v.price ?? '';
    f.old_price.value = v.old_price ?? '';
    f.description_ar.value = v.description_ar || '';
    f.description_fr.value = v.description_fr || '';
    f.stock.checked = v.stock !== false;
    f.is_new.checked = !!v.is_new;
    f.best.checked = !!v.best;
    f.sort_order.value = v.sort_order ?? 0;
    (v.colors || []).forEach((c, i) => { if (f[`color${i}`]) f[`color${i}`].value = toHex(c); });
    f.querySelectorAll('[name=seasons]').forEach(c => c.checked = (v.seasons || []).includes(c.value));
    f.querySelectorAll('[name=sizes]').forEach(c => c.checked = (v.sizes || []).includes(Number(c.value)));
    this.images = [...(v.images?.length ? v.images : v.image ? [v.image] : [])];
    this.renderImages();
    this.preview();
    $('#product-dialog').showModal();
  },

  preview() {
    const f = $('#product-form');
    $('#color-preview').innerHTML = shoeSVG({ name: '', style: f.style.value, colors: [f.color0.value, f.color1.value, f.color2.value] });
    const price = Number(f.price.value);
    const range = f.price.value !== '' && CATEGORIES.price.find(r => price >= r.min && price <= r.max);
    $('#price-hint').textContent = range ? `فئة السعر في الموقع: ${range.label.ar}` : '';
  },

  renderImages() {
    $('#images-list').innerHTML = this.images.map((src, i) => `
      <div class="img" draggable="true" data-i="${i}">
        <img src="${esc(src)}" alt="">
        ${i === 0 ? '<span class="main-tag">رئيسية</span>' : ''}
        <button type="button" data-rm="${i}" title="حذف">✕</button>
      </div>`).join('');
    $('#images-list').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      this.images.splice(Number(b.dataset.rm), 1);
      this.renderImages();
    });
  },

  bindImageDrag() {
    let from = null;
    const list = $('#images-list');
    list.addEventListener('dragstart', e => { from = Number(e.target.closest('.img')?.dataset.i); });
    list.addEventListener('dragover', e => e.preventDefault());
    list.addEventListener('drop', e => {
      e.preventDefault();
      const to = Number(e.target.closest('.img')?.dataset.i);
      if (Number.isNaN(from) || Number.isNaN(to) || from === to) return;
      const [m] = this.images.splice(from, 1);
      this.images.splice(to, 0, m);
      this.renderImages();
    });
  },

  async upload(files) {
    const lbl = $('.upload span');
    for (const [n, file] of files.entries()) {
      lbl.textContent = `⏳ رفع ${n + 1}/${files.length}...`;
      try {
        const blob = await shrink(file);
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await this.sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (error) throw error;
        this.images.push(this.sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
        this.renderImages();
      } catch (err) {
        toast('فشل رفع الصورة: ' + (err.message || err), true);
      }
    }
    lbl.textContent = '📷 رفع صور';
    $('#image-input').value = '';
  },

  async save() {
    const f = $('#product-form');
    const err = msg => { $('#product-error').textContent = msg; $('#product-error').hidden = false; };
    $('#product-error').hidden = true;
    const seasons = [...f.querySelectorAll('[name=seasons]:checked')].map(c => c.value);
    const sizes = [...f.querySelectorAll('[name=sizes]:checked')].map(c => Number(c.value));
    const price = Number(f.price.value);
    const old = f.old_price.value === '' ? null : Number(f.old_price.value);
    if (!seasons.length) return err('اختر فصلاً واحداً على الأقل');
    if (!sizes.length) return err('اختر مقاساً واحداً على الأقل');
    if (old !== null && old <= price) return err('السعر قبل التخفيض يجب أن يكون أكبر من السعر الحالي');

    const row = {
      name: f.name.value.trim(), brand: f.brand.value, style: f.style.value, seasons, sizes,
      price, old_price: old,
      colors: [f.color0.value, f.color1.value, f.color2.value],
      images: this.images, image: this.images[0] || null,
      description_ar: f.description_ar.value.trim() || null,
      description_fr: f.description_fr.value.trim() || null,
      stock: f.stock.checked, is_new: f.is_new.checked, best: f.best.checked,
      sort_order: Number(f.sort_order.value) || 0
    };
    const btn = $('#product-save');
    btn.disabled = true;
    const q = this.editing
      ? this.sb.from('ms_products').update(row).eq('id', this.editing.id)
      : this.sb.from('ms_products').insert(row);
    const { error } = await q;
    btn.disabled = false;
    if (error) return err('تعذر الحفظ: ' + error.message);

    // حذف الصور التي أُزيلت من المنتج
    if (this.editing) {
      const removed = (this.editing.images || []).filter(u => !this.images.includes(u));
      this.removeFiles(removed);
    }
    $('#product-dialog').close();
    toast(this.editing ? 'تم حفظ التعديلات' : 'تمت إضافة المنتج');
    this.load();
  },

  async toggleStock(p) {
    const { error } = await this.sb.from('ms_products').update({ stock: !p.stock }).eq('id', p.id);
    if (error) return toast(error.message, true);
    p.stock = !p.stock;
    this.render();
  },

  async remove(p) {
    if (!confirm(`حذف المنتج "${p.name}" نهائياً؟`)) return;
    const { error } = await this.sb.from('ms_products').delete().eq('id', p.id);
    if (error) return toast(error.message, true);
    this.removeFiles(p.images || []);
    this.list = this.list.filter(x => x.id !== p.id);
    toast('تم حذف المنتج');
    this.render();
  },

  removeFiles(urls) {
    const marker = `/${BUCKET}/`;
    const paths = urls.filter(u => u.includes(marker)).map(u => decodeURIComponent(u.split(marker)[1]));
    if (paths.length) this.sb.storage.from(BUCKET).remove(paths);
  }
};

/* تصغير الصورة قبل الرفع (أقصى عرض 1400px، JPEG) */
function shrink(file, max = 1400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => b ? resolve(b) : reject(new Error('تعذر معالجة الصورة')), 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error('ملف غير صالح'));
    img.src = URL.createObjectURL(file);
  });
}

function toHex(c) {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map(x => x + x).join('');
  return '#000000';
}
