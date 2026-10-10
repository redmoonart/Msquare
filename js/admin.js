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
    const { data, error } = await sb.auth.signInWithPassword({ email: f.get('email').trim().toLowerCase(), password: f.get('password') });
    btn.disabled = false;
    if (error) {
      const code = error.code || '';
      $('#login-error').textContent =
        code === 'invalid_credentials' ? 'البريد أو كلمة المرور غير صحيحة' :
        code === 'email_not_confirmed' ? 'الحساب غير مؤكد: أكّده من Supabase (Authentication ← Users)' :
        /fetch|network/i.test(error.message) ? 'تعذر الاتصال بـ Supabase، تحقق من الإنترنت' :
        `خطأ: ${error.message}`;
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
    $('#tab-stats').hidden = t.dataset.tab !== 'stats';
    $('#tab-banners').hidden = t.dataset.tab !== 'banners';
    if (t.dataset.tab === 'stats') Stats.load();
  });
  Orders.init(sb);
  Products.init(sb);
  Stats.init(sb);
  Banners.init(sb);
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
    document.querySelectorAll('[data-close-dialog]').forEach(b => b.onclick = () => b.closest('dialog').close());
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

/* ==========================================================
   الإحصائيات
   ========================================================== */
const Stats = {
  sb: null, days: 7, data: null, loading: false,

  init(sb) {
    this.sb = sb;
    $('#stats-period').onclick = e => {
      const b = e.target.closest('[data-days]');
      if (!b) return;
      this.days = Number(b.dataset.days);
      document.querySelectorAll('#stats-period .chip').forEach(c => c.classList.toggle('active', c === b));
      this.load();
    };
    $('#stats-refresh').onclick = () => this.load();
  },

  async load() {
    if (this.loading) return;
    this.loading = true;
    $('#stats-body').classList.add('is-loading');
    const { data, error } = await this.sb.rpc('ms_stats', { days: this.days });
    this.loading = false;
    $('#stats-body').classList.remove('is-loading');
    const missing = error && /ms_stats|function|schema cache/i.test(error.message);
    $('#stats-warn').hidden = !missing;
    if (error) {
      $('#stats-body').innerHTML = missing ? '' : `<p class="empty">تعذر تحميل الإحصائيات: ${esc(error.message)}</p>`;
      return;
    }
    this.data = data;
    this.render();
  },

  render() {
    const d = this.data, T = d.totals;
    const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
    const conv = pct(T.good_orders, T.visitors);

    $('#stats-body').innerHTML = `
      <div class="kpis">
        ${kpi('👥 الزوار', T.visitors.toLocaleString('en-US'), `${T.page_views.toLocaleString('en-US')} مشاهدة صفحة`)}
        ${kpi('👟 مشاهدات المنتجات', T.product_views.toLocaleString('en-US'), T.visitors ? `${(T.product_views / T.visitors).toFixed(1)} لكل زائر` : '')}
        ${kpi('🛒 إضافات للسلة', T.add_to_cart.toLocaleString('en-US'), `${T.abandoned_carts} سلة متروكة`)}
        ${kpi('🧾 الطلبات', T.orders.toLocaleString('en-US'), `${T.items_sold} قطعة مباعة`)}
        ${kpi('🎯 نسبة التحويل', conv + '%', 'من الزوار إلى طلب')}
        ${kpi('💰 المبيعات', money(T.revenue), T.good_orders ? `متوسط الطلب ${money(Math.round(T.revenue / T.good_orders))}` : 'بدون الملغاة والمرفوضة')}
      </div>

      <div class="panel">
        <div class="panel-head"><h3>الزوار يومياً</h3><span class="muted small">مرّر على العمود لرؤية التفاصيل</span></div>
        <div class="chart-scroll">${this.dailyChart(d.daily)}</div>
      </div>

      <div class="panel-grid">
        <div class="panel">
          <div class="panel-head"><h3>رحلة الزائر</h3><span class="muted small">زوار مختلفون في كل مرحلة</span></div>
          ${this.funnel(d.funnel)}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>💡 أمور يجب أن تعرفها</h3></div>
          <ul class="insights">${this.insights().map(i => `<li class="${i.tone}">${i.text}</li>`).join('') || '<li>لا توجد بيانات كافية بعد. شارك رابط المتجر لتبدأ الإحصائيات.</li>'}</ul>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>👀 المنتجات الأكثر مشاهدة</h3></div>
        ${this.topViewed(d.top_viewed)}
      </div>

      <div class="panel-grid">
        <div class="panel">
          <div class="panel-head"><h3>🏆 الأكثر مبيعاً</h3></div>
          ${barList(d.best_sellers.map(p => ({ label: p.name, sub: label('brand', p.brand), n: p.qty, extra: money(p.revenue), href: `product.html?id=${p.id}` })), 'قطعة')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>📍 الولايات الأكثر طلباً</h3></div>
          ${barList(d.wilayas.map(w => ({ label: w.wilaya, n: w.n, extra: money(w.revenue) })), 'طلب')}
        </div>
      </div>

      <div class="panel-grid">
        <div class="panel">
          <div class="panel-head"><h3>🔎 ماذا يبحث الزوار؟</h3></div>
          ${barList(d.searches.map(s => ({ label: s.term, n: s.n })), 'بحث')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>🎛️ الفلاتر الأكثر استعمالاً</h3></div>
          ${barList(d.filters.map(f => ({ label: filterLabel(f.value), n: f.n })), 'مرة')}
        </div>
      </div>

      <div class="panel-grid three">
        <div class="panel">
          <div class="panel-head"><h3>🌐 من أين يأتي الزوار؟</h3></div>
          ${barList(d.referrers.map(r => ({ label: sourceLabel(r.source), n: r.n })), 'زائر')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>📱 الأجهزة</h3></div>
          ${barList(['mobile', 'desktop', 'tablet'].filter(k => d.devices[k]).map(k => ({ label: { mobile: '📱 هاتف', desktop: '💻 كمبيوتر', tablet: '📟 لوحي' }[k], n: d.devices[k] })), 'زائر')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>📄 الصفحات</h3></div>
          ${barList(d.pages.map(p => ({ label: pageLabel(p.path), n: p.n })), 'مشاهدة')}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>🕒 ساعات الزيارة</h3><span class="muted small">توقيت الجزائر — أفضل وقت لنشر الإعلانات</span></div>
        <div class="chart-scroll">${this.hoursChart(d.hours)}</div>
      </div>`;
    bindTips($('#stats-body'));
  },

  dailyChart(rows) {
    if (!rows.length) return '<p class="empty">لا توجد بيانات</p>';
    const W = 900, H = 220, P = { t: 12, r: 8, b: 26, l: 36 };
    const max = Math.max(1, ...rows.map(r => r.visitors));
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const iw = W - P.l - P.r, ih = H - P.t - P.b, bw = iw / rows.length;
    const gap = Math.min(6, bw * 0.25);
    const y = v => P.t + ih - (v / top) * ih;
    const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
    const every = Math.ceil(rows.length / 10);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="الزوار يومياً">
      ${ticks.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 6}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`).join('')}
      ${rows.map((r, i) => {
        const x = P.l + i * bw + gap / 2, w = Math.max(2, bw - gap), h = Math.max(r.visitors ? 2 : 0, ih - (y(r.visitors) - P.t));
        const day = new Date(r.day + 'T00:00:00');
        const lbl = day.toLocaleDateString('ar-DZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
        return `<g class="hit" data-tip="${esc(lbl)}<br><b>${r.visitors}</b> زائر · <b>${r.orders}</b> طلب">
          <rect x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${ih}" fill="transparent"/>
          <path d="${barPath(x, P.t + ih - h, w, h)}" class="bar"/>
          ${i % every === 0 ? `<text x="${x + w / 2}" y="${H - 8}" class="axis" text-anchor="middle">${day.getDate()}/${day.getMonth() + 1}</text>` : ''}
        </g>`;
      }).join('')}
    </svg>`;
  },

  hoursChart(rows) {
    const W = 900, H = 150, P = { t: 10, r: 8, b: 22, l: 8 };
    const max = Math.max(1, ...rows.map(r => r.n));
    const iw = W - P.l - P.r, ih = H - P.t - P.b, bw = iw / 24, gap = 4;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="ساعات الزيارة">
      <line x1="${P.l}" x2="${W - P.r}" y1="${P.t + ih}" y2="${P.t + ih}" class="grid"/>
      ${rows.map((r, i) => {
        const x = P.l + i * bw + gap / 2, w = bw - gap, h = r.n ? Math.max(2, (r.n / max) * ih) : 0;
        return `<g class="hit" data-tip="الساعة ${r.hour}:00 – ${r.hour}:59<br><b>${r.n}</b> مشاهدة">
          <rect x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${ih}" fill="transparent"/>
          <path d="${barPath(x, P.t + ih - h, w, h)}" class="bar ${r.n === max && r.n ? 'bar-peak' : ''}"/>
          ${i % 3 === 0 ? `<text x="${x + w / 2}" y="${H - 6}" class="axis" text-anchor="middle">${r.hour}h</text>` : ''}
        </g>`;
      }).join('')}
    </svg>`;
  },

  funnel(f) {
    const steps = [
      ['زاروا المتجر', f.visitors], ['شاهدوا منتجاً', f.product_view], ['أضافوا للسلة', f.add_to_cart],
      ['فتحوا نموذج الطلب', f.checkout], ['أكملوا الطلب', f.order]
    ];
    const top = Math.max(1, f.visitors);
    return `<div class="funnel">${steps.map(([name, n], i) => {
      const prev = i ? steps[i - 1][1] : 0;
      const drop = i && prev ? Math.round((1 - n / prev) * 100) : null;
      return `<div class="f-row">
        <span class="f-name">${name}</span>
        <div class="f-track"><div class="f-bar" style="width:${Math.min(100, Math.max(n ? 2 : 0, n / top * 100))}%"></div></div>
        <span class="f-n"><b>${n}</b> <span class="muted small">${Math.min(100, Math.round(n / top * 100))}%</span></span>
        ${drop !== null && drop > 0 ? `<span class="f-drop">↓ ${drop}% توقفوا هنا</span>` : ''}
      </div>`;
    }).join('')}</div>`;
  },

  topViewed(rows) {
    if (!rows.length) return '<p class="empty">لم يشاهد أحد أي منتج بعد في هذه الفترة</p>';
    const max = Math.max(...rows.map(r => r.views));
    return `<div class="table-wrap flat"><table class="table compact">
      <thead><tr><th>المنتج</th><th>المشاهدات</th><th>زوار مختلفون</th><th>أُضيف للسلة</th><th>بيع</th><th>التحويل</th></tr></thead>
      <tbody>${rows.map((p, i) => {
        const rate = p.viewers ? Math.round(p.sold / p.viewers * 100) : 0;
        return `<tr>
          <td><a class="prod" href="product.html?id=${p.id}" target="_blank">
            <span class="rank">${i + 1}</span>
            <span class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : shoeSVG({ name: p.name, style: p.style, colors: p.colors || ['#111', '#fff', '#eee'] })}</span>
            <span><b>${esc(p.name)}</b><span class="muted small">${esc(label('brand', p.brand))} · ${money(p.price)}${p.stock ? '' : ' · <span class="bad">نفد</span>'}</span></span>
          </a></td>
          <td><div class="inline-bar"><span style="width:${p.views / max * 100}%"></span><b>${p.views}</b></div></td>
          <td>${p.viewers}</td>
          <td>${p.adds}</td>
          <td><b>${p.sold}</b></td>
          <td>${rate}%</td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  },

  insights() {
    const d = this.data, T = d.totals, f = d.funnel, out = [];
    const add = (tone, text) => out.push({ tone, text });
    if (!T.visitors) return out;

    const conv = T.visitors ? T.good_orders / T.visitors * 100 : 0;
    add(conv >= 1 ? 'good' : 'warn', `نسبة التحويل <b>${conv.toFixed(1)}%</b> — ${conv >= 2 ? 'ممتازة لمتجر إلكتروني' : conv >= 1 ? 'جيدة (المعدل المعتاد 1–3%)' : 'منخفضة: جرّب صوراً أوضح، أسعاراً أو عروضاً أفضل'}.`);

    if (T.abandoned_carts > 0)
      add('warn', `<b>${T.abandoned_carts}</b> زائر أضاف منتجاً للسلة ولم يكمل الطلب. ${f.checkout < f.add_to_cart ? 'كثيرون لم يفتحوا نموذج الطلب أصلاً.' : ''}`);

    if (f.checkout > 0 && f.order < f.checkout)
      add('warn', `<b>${f.checkout - f.order}</b> زائر فتح نموذج الطلب ولم يرسله — ربما سعر التوصيل أو طول النموذج.`);

    const cold = d.top_viewed.filter(p => p.viewers >= 5 && p.sold === 0);
    if (cold.length)
      add('warn', `منتجات يشاهدها الزوار كثيراً ولا تُباع: ${cold.slice(0, 3).map(p => `<b>${esc(p.name)}</b> (${p.viewers} زائر)`).join('، ')} — راجع السعر أو الصور أو المقاسات.`);

    const outViewed = d.top_viewed.filter(p => !p.stock);
    if (outViewed.length)
      add('warn', `منتجات نفدت وما زال الزوار يبحثون عنها: ${outViewed.slice(0, 3).map(p => `<b>${esc(p.name)}</b>`).join('، ')} — فكّر في إعادة التوفير.`);

    if (d.top_viewed[0])
      add('good', `المنتج الأكثر جذباً: <b>${esc(d.top_viewed[0].name)}</b> بـ ${d.top_viewed[0].views} مشاهدة — ضعه في الإعلانات.`);

    if (d.never_viewed.length)
      add('', `<b>${d.never_viewed.length}</b> منتجاً متوفراً لم يشاهده أحد في هذه الفترة.`);

    const mob = d.devices.mobile || 0, all = Object.values(d.devices).reduce((a, b) => a + b, 0);
    if (all) add('', `<b>${Math.round(mob / all * 100)}%</b> من الزوار على الهاتف.`);

    const src = d.referrers.find(r => r.source);
    if (src) add('good', `أكبر مصدر زوار خارجي: <b>${esc(sourceLabel(src.source))}</b> (${src.n} زائر).`);

    const peak = d.hours.reduce((a, b) => (b.n > a.n ? b : a), { n: 0 });
    if (peak.n) add('', `أكثر ساعة زيارة: <b>${peak.hour}:00 – ${peak.hour + 1}:00</b> — أفضل وقت لنشر منشور أو إعلان.`);

    if (d.searches[0]) add('', `أكثر كلمة بحث: <b>"${esc(d.searches[0].term)}"</b> (${d.searches[0].n} مرة).`);

    if (d.statuses.refused) add('warn', `<b>${d.statuses.refused}</b> طلب رُفض عند الاستلام في هذه الفترة — اتصل بالزبون لتأكيد كل طلب قبل الشحن.`);
    return out;
  }
};

function kpi(title, value, sub) {
  return `<div class="stat"><span>${title}</span><strong>${value}</strong>${sub ? `<em>${sub}</em>` : ''}</div>`;
}

/* قائمة بأعمدة أفقية (لون واحد) */
function barList(items, unit) {
  if (!items.length) return '<p class="empty">لا توجد بيانات</p>';
  const max = Math.max(...items.map(i => i.n));
  return `<ul class="bar-list">${items.map(i => `
    <li data-tip="${esc(i.label)}<br><b>${i.n}</b> ${unit}${i.extra ? ` · ${esc(i.extra)}` : ''}">
      <div class="bl-top">
        ${i.href ? `<a href="${i.href}" target="_blank">${esc(i.label)}</a>` : `<span>${esc(i.label)}</span>`}
        ${i.sub ? `<span class="muted small">${esc(i.sub)}</span>` : ''}
        <b>${i.n}</b>
      </div>
      <div class="bl-track"><span style="width:${i.n / max * 100}%"></span></div>
    </li>`).join('')}</ul>`;
}

function filterLabel(v) {
  const [g, id] = String(v).split(':');
  const names = { brand: 'العلامة', style: 'الستايل', price: 'السعر', season: 'الفصل' };
  return CATEGORIES[g] ? `${names[g]}: ${label(g, id)}` : v;
}
function sourceLabel(s) {
  if (!s) return '🔗 مباشر / غير معروف';
  if (/facebook|fb\./.test(s)) return '📘 فيسبوك';
  if (/instagram/.test(s)) return '📸 إنستغرام';
  if (/tiktok/.test(s)) return '🎵 تيك توك';
  if (/google/.test(s)) return '🔍 غوغل';
  if (/whatsapp|wa\.me/.test(s)) return '💬 واتساب';
  if (/youtube/.test(s)) return '▶️ يوتيوب';
  return s;
}
function pageLabel(p) {
  if (/product/.test(p)) return 'صفحات المنتجات';
  if (/shop/.test(p)) return 'المتجر والتصفية';
  if (p === '/' || /index/.test(p)) return 'الصفحة الرئيسية';
  return p;
}
function niceStep(max) {
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  return [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw) || mag * 10;
}
/* عمود بحافة علوية دائرية 4px مثبت على الخط الأساسي */
function barPath(x, y, w, h) {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
/* تلميح عند المرور / اللمس */
function bindTips(root) {
  let tip = document.getElementById('chart-tip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'chart-tip'; tip.className = 'chart-tip'; document.body.appendChild(tip); }
  const show = (el, x, y) => {
    tip.innerHTML = el.dataset.tip;
    tip.style.display = 'block';
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + 'px';
    tip.style.top = Math.max(8, y - r.height - 12) + 'px';
  };
  root.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('pointerenter', e => { el.classList.add('hover'); show(el, e.clientX, e.clientY); });
    el.addEventListener('pointermove', e => show(el, e.clientX, e.clientY));
    el.addEventListener('pointerleave', () => { el.classList.remove('hover'); tip.style.display = 'none'; });
  });
}

/* ==========================================================
   الإعلانات (السلايدر في أعلى الصفحة الرئيسية)
   ========================================================== */
const LINK_TYPES = () => [
  { group: 'عام', items: [['shop.html', '🛍️ المتجر (كل المنتجات)'], ['shop.html?sale=1', '🔥 التخفيضات'], ['shop.html?sort=new', '🆕 الجديد']] },
  ...['brand', 'style', 'season', 'price'].map(g => ({
    group: { brand: 'العلامة التجارية', style: 'الستايل', season: 'الفصل', price: 'السعر' }[g],
    items: CATEGORIES[g].map(c => [`shop.html?${g}=${c.id}`, `${c.icon ? c.icon + ' ' : ''}${c.label.ar}`])
  })),
  { group: 'أخرى', items: [['product', '👟 منتج محدد'], ['url', '🔗 رابط آخر']] }
];

const Banners = {
  sb: null, list: [], editing: null, image: null,

  init(sb) {
    this.sb = sb;
    $('#banner-link-type').innerHTML = LINK_TYPES().map(g =>
      `<optgroup label="${g.group}">${g.items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</optgroup>`).join('');
    $('#banner-link-type').onchange = () => this.toggleLinkFields();
    $('#banner-add').onclick = () => this.open(null);
    $('#banners-list').addEventListener('click', e => this.onClick(e));
    $('#banner-image-input').onchange = e => this.upload(e.target.files[0]);
    $('#banner-form [name=position]').onchange = () => this.preview();
    $('#banner-form').onsubmit = e => { e.preventDefault(); this.save(); };
    this.load();
  },

  async load() {
    const { data, error } = await this.sb.from('ms_banners').select('*').order('sort_order').order('id');
    const missing = error && /ms_banners|schema cache|does not exist/i.test(error.message);
    $('#banners-warn').hidden = !missing;
    if (error) { if (!missing) toast('تعذر تحميل الإعلانات: ' + error.message, true); this.list = []; this.render(); return; }
    this.list = data;
    this.render();
  },

  linkLabel(link) {
    for (const g of LINK_TYPES()) for (const [v, l] of g.items) if (v === link) return l;
    const m = /^product\.html\?id=(\d+)/.exec(link || '');
    if (m) return `👟 ${Products.list.find(p => p.id === Number(m[1]))?.name || 'منتج #' + m[1]}`;
    return `🔗 ${link}`;
  },

  group(placement) { return this.list.filter(b => (b.placement || 'hero') === placement); },

  card(b, i, arr) {
    return `
      <article class="bcard ${b.active ? '' : 'off'}">
        <div class="bcard-img"><img src="${esc(b.image)}" alt="" style="object-position:${esc(b.position)}" loading="lazy">
          <span class="ptag ${b.active ? 'ptag-on' : ''}">${b.active ? '● ظاهر' : 'مخفي'}</span></div>
        <div class="bcard-body">
          <b>${esc(b.title_ar)}</b>
          ${b.sub_ar ? `<span class="muted small">${esc(b.sub_ar)}</span>` : ''}
          <span class="small">يفتح: ${esc(this.linkLabel(b.link))}</span>
        </div>
        <div class="bcard-actions">
          <button class="btn btn-ghost btn-sm" data-up="${b.id}" ${i === 0 ? 'disabled' : ''} title="تقديم">▲</button>
          <button class="btn btn-ghost btn-sm" data-down="${b.id}" ${i === arr.length - 1 ? 'disabled' : ''} title="تأخير">▼</button>
          <button class="btn btn-ghost btn-sm" data-edit="${b.id}">✏️ تعديل</button>
          <button class="btn btn-ghost btn-sm" data-bvis="${b.id}">${b.active ? '🙈 إخفاء' : '👁️ إظهار'}</button>
          <button class="btn btn-danger btn-sm" data-del="${b.id}">🗑️</button>
        </div>
      </article>`;
  },

  render() {
    const section = (placement, title, emptyText) => {
      const arr = this.group(placement);
      const allHidden = arr.length && !arr.some(b => b.active);
      return `
        <h3 class="bgroup-title">${title} <span class="muted small">(${arr.filter(b => b.active).length} ظاهر من ${arr.length})</span></h3>
        ${allHidden ? '<p class="warn">كل إعلانات هذا المكان مخفية، لذلك يظهر المحتوى الافتراضي في الموقع.</p>' : ''}
        ${arr.length ? arr.map((b, i) => this.card(b, i, arr)).join('') : `<p class="empty small-empty">${emptyText}</p>`}`;
    };
    $('#banners-list').innerHTML =
      section('hero', '⬆️ أعلى الصفحة الرئيسية (السلايدر)', 'لا توجد إعلانات هنا — تظهر الصور الافتراضية.') +
      section('middle', '↔️ وسط الصفحة الرئيسية', 'لا توجد إعلانات هنا — يظهر بانر "ستريت وير" الافتراضي. اضغط "＋ إضافة إعلان" واختر "وسط الصفحة".');
  },

  onClick(e) {
    const b = e.target.closest('[data-up],[data-down],[data-edit],[data-bvis],[data-del]');
    if (!b) return;
    const id = Number(b.dataset.up || b.dataset.down || b.dataset.edit || b.dataset.bvis || b.dataset.del);
    const item = this.list.find(x => x.id === id);
    if (b.dataset.up) this.move(id, -1);
    else if (b.dataset.down) this.move(id, 1);
    else if (b.dataset.edit) this.open(item);
    else if (b.dataset.bvis) this.update(item, { active: !item.active }, item.active ? 'أُخفي الإعلان' : 'الإعلان ظاهر الآن');
    else if (b.dataset.del) this.remove(item);
  },

  async move(id, dir) {
    const item = this.list.find(x => x.id === id);
    const arr = this.group(item.placement || 'hero');
    const i = arr.indexOf(item), j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    // إعادة ترقيم إعلانات هذا المكان حتى يكون الترتيب ثابتاً
    const results = await Promise.all(arr.map((x, k) => x.sort_order === k + 1 ? null
      : this.sb.from('ms_banners').update({ sort_order: k + 1 }).eq('id', x.id).then(r => { if (!r.error) x.sort_order = k + 1; return r; })));
    const err = results.find(r => r && r.error);
    if (err) toast('تعذر تغيير الترتيب: ' + err.error.message, true);
    this.list.sort((a, c) => a.sort_order - c.sort_order || a.id - c.id);
    this.render();
  },

  async update(item, patch, msg) {
    const { error } = await this.sb.from('ms_banners').update(patch).eq('id', item.id);
    if (error) return toast(error.message, true);
    Object.assign(item, patch);
    toast(msg);
    this.render();
  },

  toggleLinkFields() {
    const v = $('#banner-link-type').value;
    $('#banner-product-wrap').hidden = v !== 'product';
    $('#banner-url-wrap').hidden = v !== 'url';
    $('#banner-form [name=link_url]').required = v === 'url';
  },

  open(b) {
    this.editing = b;
    const f = $('#banner-form');
    f.reset();
    $('#banner-error').hidden = true;
    $('#banner-form-title').textContent = b ? 'تعديل الإعلان' : 'إضافة إعلان';
    $('#banner-link-product').innerHTML = Products.list.map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(label('brand', p.brand))}</option>`).join('');
    ['title_ar', 'title_fr', 'sub_ar', 'sub_fr', 'cta_ar', 'cta_fr'].forEach(k => f[k].value = b?.[k] || '');
    f.position.value = [...f.position.options].some(o => o.value === b?.position) ? b.position : '50% 50%';
    f.active.checked = b ? b.active : true;
    f.placement.value = b?.placement || 'hero';
    const link = b?.link || 'shop.html';
    const known = LINK_TYPES().some(g => g.items.some(([v]) => v === link));
    const prod = /^product\.html\?id=(\d+)/.exec(link);
    f.link_type.value = known ? link : prod ? 'product' : 'url';
    if (prod) f.link_product.value = prod[1];
    if (!known && !prod) f.link_url.value = link;
    this.image = b?.image || null;
    this.toggleLinkFields();
    this.preview();
    $('#banner-dialog').showModal();
  },

  preview() {
    const pos = $('#banner-form [name=position]').value;
    $('#banner-preview').innerHTML = this.image
      ? `<img src="${esc(this.image)}" alt="" style="object-position:${esc(pos)}"><span class="pv-label">معاينة الهاتف</span>`
      : '<span class="muted">لم تُرفع صورة بعد</span>';
  },

  async upload(file) {
    if (!file) return;
    const lbl = $('#banner-dialog .upload span');
    lbl.textContent = '⏳ جاري الرفع...';
    try {
      const blob = await shrink(file, 1600);
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await this.sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (error) throw error;
      this.image = this.sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      $('#banner-error').hidden = true;
      this.preview();
    } catch (err) {
      toast('فشل رفع الصورة: ' + (err.message || err), true);
    }
    lbl.textContent = '📷 رفع صورة';
    $('#banner-image-input').value = '';
  },

  async save() {
    const f = $('#banner-form');
    const err = msg => { $('#banner-error').textContent = msg; $('#banner-error').hidden = false; };
    $('#banner-error').hidden = true;
    if (!this.image) return err('ارفع صورة للإعلان');
    const type = f.link_type.value;
    let link = type;
    if (type === 'product') link = `product.html?id=${f.link_product.value}`;
    if (type === 'url') {
      link = f.link_url.value.trim();
      if (!/^https:\/\//.test(link)) return err('الرابط يجب أن يبدأ بـ https://');
    }
    const clean = k => f[k].value.trim() || null;
    const row = {
      image: this.image, title_ar: f.title_ar.value.trim(), title_fr: clean('title_fr'),
      sub_ar: clean('sub_ar'), sub_fr: clean('sub_fr'), cta_ar: clean('cta_ar'), cta_fr: clean('cta_fr'),
      link, position: f.position.value, active: f.active.checked, placement: f.placement.value
    };
    if (!this.editing || this.editing.placement !== row.placement)
      row.sort_order = Math.max(0, ...this.group(row.placement).map(b => b.sort_order)) + 1;
    const btn = $('#banner-save');
    btn.disabled = true;
    const { error } = this.editing
      ? await this.sb.from('ms_banners').update(row).eq('id', this.editing.id)
      : await this.sb.from('ms_banners').insert(row);
    btn.disabled = false;
    if (error) return err('تعذر الحفظ: ' + error.message);
    if (this.editing && this.editing.image !== row.image) Products.removeFiles([this.editing.image]);
    $('#banner-dialog').close();
    toast(this.editing ? 'تم حفظ الإعلان' : 'تمت إضافة الإعلان');
    this.load();
  },

  async remove(b) {
    if (!confirm(`حذف الإعلان "${b.title_ar}" نهائياً؟`)) return;
    const { error } = await this.sb.from('ms_banners').delete().eq('id', b.id);
    if (error) return toast(error.message, true);
    Products.removeFiles([b.image]);
    this.list = this.list.filter(x => x.id !== b.id);
    toast('تم حذف الإعلان');
    this.render();
  }
};
