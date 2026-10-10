/* صفحة المتجر — التصفية حسب: العلامة التجارية / الستايل / السعر / الفصول */
boot(() => {

const GROUPS = ['brand', 'style', 'price', 'season'];
const params = new URLSearchParams(location.search);
const state = {
  brand: params.getAll('brand'),
  style: params.getAll('style'),
  price: params.getAll('price'),
  season: params.getAll('season'),
  sale: params.get('sale') === '1',
  q: params.get('q') || '',
  sort: params.get('sort') || 'default'
};

function matches(p, skipGroup) {
  const ok = {
    brand: !state.brand.length || state.brand.includes(p.brand),
    style: !state.style.length || state.style.includes(p.style),
    price: !state.price.length || state.price.includes(priceRangeOf(p.price)),
    season: !state.season.length || p.seasons.some(s => state.season.includes(s))
  };
  if (state.sale && !p.oldPrice) return false;
  if (state.q) {
    const hay = [p.name, catLabel('brand', p.brand), ...['ar', 'fr'].flatMap(l => [
      CATEGORIES.style.find(s => s.id === p.style).label[l],
      ...p.seasons.map(s => CATEGORIES.season.find(x => x.id === s).label[l])
    ])].join(' ').toLowerCase();
    if (!state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return GROUPS.every(g => g === skipGroup || ok[g]);
}

/* عدد المنتجات لكل خيار (مع احتساب الفلاتر الأخرى) */
function countFor(group, id) {
  return PRODUCTS.filter(p => matches(p, group) && (
    group === 'brand' ? p.brand === id :
    group === 'style' ? p.style === id :
    group === 'price' ? priceRangeOf(p.price) === id :
    p.seasons.includes(id))).length;
}

function sorted(list) {
  const l = [...list];
  if (state.sort === 'low') l.sort((a, b) => a.price - b.price);
  else if (state.sort === 'high') l.sort((a, b) => b.price - a.price);
  else if (state.sort === 'new') l.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.id - a.id);
  return l;
}

function syncURL() {
  const u = new URLSearchParams();
  GROUPS.forEach(g => state[g].forEach(v => u.append(g, v)));
  if (state.sale) u.set('sale', '1');
  if (state.q) u.set('q', state.q);
  if (state.sort !== 'default') u.set('sort', state.sort);
  history.replaceState(null, '', u.toString() ? `?${u}` : location.pathname);
}

document.getElementById('shop').innerHTML = `
  <div class="container">
    <nav class="crumbs"><a href="index.html">${t('home')}</a><span>/</span><span id="crumb-title">${t('shopAll')}</span></nav>
    <div class="shop-top">
      <h1 id="shop-title">${t('shopAll')}</h1>
      <span class="muted" id="result-count"></span>
    </div>
    <div class="shop-toolbar">
      <button class="btn btn-outline only-mobile" id="filters-open">${ICONS.filter} ${t('filters')}</button>
      <div class="active-chips" id="active-chips"></div>
      <label class="sort">${t('sort')}
        <select id="sort">
          <option value="default">${t('sortDefault')}</option>
          <option value="new">${t('sortNew')}</option>
          <option value="low">${t('sortLow')}</option>
          <option value="high">${t('sortHigh')}</option>
        </select>
      </label>
    </div>
    <div class="shop-layout">
      <aside class="filters" id="filters">
        <div class="filters-head only-mobile"><h3>${t('filters')}</h3><button class="icon-btn" id="filters-close">${ICONS.close}</button></div>
        <div id="filter-groups"></div>
        <div class="filters-foot only-mobile"><button class="btn btn-dark btn-block" id="filters-apply"></button></div>
      </aside>
      <div>
        <div class="grid" id="grid"></div>
      </div>
    </div>
  </div>`;

function renderFilters() {
  document.getElementById('filter-groups').innerHTML = GROUPS.map(g => `
    <details class="f-group" open>
      <summary>${t(g)}${state[g].length ? ` <span class="f-count">${state[g].length}</span>` : ''}</summary>
      <div class="f-options ${g === 'season' ? 'f-seasons' : ''}">
        ${CATEGORIES[g].map(c => {
          const n = countFor(g, c.id);
          const checked = state[g].includes(c.id);
          return `<label class="f-opt ${!n && !checked ? 'disabled' : ''}">
            <input type="checkbox" data-group="${g}" value="${c.id}" ${checked ? 'checked' : ''}>
            <span class="f-box"></span>
            <span class="f-label">${c.icon ? c.icon + ' ' : ''}${c.label[LANG]}</span>
            <span class="f-n">${n}</span>
          </label>`;
        }).join('')}
      </div>
    </details>`).join('');
}

function renderChips() {
  const chips = [];
  GROUPS.forEach(g => state[g].forEach(id => chips.push(`<button class="chip" data-chip="${g}:${id}">${catLabel(g, id)} ${ICONS.close}</button>`)));
  if (state.sale) chips.push(`<button class="chip" data-chip="sale">${t('sale')} ${ICONS.close}</button>`);
  if (state.q) chips.push(`<button class="chip" data-chip="q">"${state.q.replace(/</g, '&lt;')}" ${ICONS.close}</button>`);
  if (chips.length) chips.push(`<button class="link-under" data-chip="all">${t('clearAll')}</button>`);
  document.getElementById('active-chips').innerHTML = chips.join('');
}

function render() {
  const list = sorted(PRODUCTS.filter(p => matches(p)));
  document.getElementById('grid').innerHTML = list.length
    ? list.map(productCard).join('')
    : `<div class="empty grid-empty"><p>${t('noResults')}</p><button class="btn btn-dark" data-chip="all">${t('clearAll')}</button></div>`;
  document.getElementById('result-count').textContent = `${list.length} ${t('results')}`;
  document.getElementById('filters-apply').textContent = `${t('showResults')} (${list.length})`;

  // العنوان حسب الفلتر الوحيد المختار
  const single = GROUPS.filter(g => state[g].length === 1);
  const title = state.sale ? t('sale')
    : single.length === 1 && GROUPS.every(g => g === single[0] || !state[g].length) ? catLabel(single[0], state[single[0]][0])
    : state.sort === 'new' && !GROUPS.some(g => state[g].length) ? t('newArrivals')
    : t('shopAll');
  document.getElementById('shop-title').textContent = title;
  document.getElementById('crumb-title').textContent = title;
  document.title = `${title} | M SQUARE`;

  renderFilters();
  renderChips();
  syncURL();
}

document.getElementById('sort').value = state.sort;
document.getElementById('sort').onchange = e => { state.sort = e.target.value; render(); };

document.getElementById('filter-groups').addEventListener('change', e => {
  const cb = e.target.closest('input[data-group]');
  if (!cb) return;
  const g = cb.dataset.group;
  state[g] = cb.checked ? [...state[g], cb.value] : state[g].filter(v => v !== cb.value);
  if (cb.checked) track('filter', { value: `${g}:${cb.value}` });
  render();
});

document.getElementById('shop').addEventListener('click', e => {
  const chip = e.target.closest('[data-chip]');
  if (!chip) return;
  const v = chip.dataset.chip;
  if (v === 'all') { GROUPS.forEach(g => state[g] = []); state.sale = false; state.q = ''; }
  else if (v === 'sale') state.sale = false;
  else if (v === 'q') state.q = '';
  else { const [g, id] = v.split(':'); state[g] = state[g].filter(x => x !== id); }
  render();
});

const filtersEl = document.getElementById('filters');
document.getElementById('filters-open').onclick = () => { filtersEl.classList.add('open'); document.body.classList.add('locked'); };
const closeFilters = () => { filtersEl.classList.remove('open'); document.body.classList.remove('locked'); };
document.getElementById('filters-close').onclick = closeFilters;
document.getElementById('filters-apply').onclick = closeFilters;

document.querySelectorAll('.search-box input').forEach(i => i.value = state.q);

render();

/* تسجيل البحث والفلاتر القادمة من الرابط (القائمة العلوية، مربع البحث) */
if (state.q) track('search', { value: state.q });
GROUPS.forEach(g => state[g].forEach(v => track('filter', { value: `${g}:${v}` })));
});
