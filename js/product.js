/* صفحة المنتج */
boot(() => {

const product = getProduct(new URLSearchParams(location.search).get('id')) || PRODUCTS[0];
let selectedSize = null;
const gallery = product.images && product.images.length > 1 ? product.images : [];
const sizes = product.sizes || SIZES;
const inStock = product.stock !== false;
const desc = product.description && (product.description[LANG] || product.description.ar);
document.title = `${product.name} | M SQUARE`;

const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
const related = PRODUCTS
  .filter(p => p.id !== product.id)
  .map(p => ({ p, score: (p.style === product.style) * 2 + (p.brand === product.brand) + p.seasons.filter(s => product.seasons.includes(s)).length * 0.5 }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 10)
  .map(x => x.p);

document.getElementById('product').innerHTML = `
  <div class="container">
    <nav class="crumbs">
      <a href="index.html">${t('home')}</a><span>/</span>
      <a href="shop.html?brand=${product.brand}">${catLabel('brand', product.brand)}</a><span>/</span>
      <span>${product.name}</span>
    </nav>

    <div class="pdp">
      <div class="pdp-gallery">
        <div class="pdp-main">${productVisual(product)}${discount ? `<span class="tag tag-sale">-${discount}%</span>` : product.isNew ? `<span class="tag">${t('new')}</span>` : ''}</div>
        <div class="pdp-thumbs">
          ${gallery.length
            ? gallery.map((src, i) => `<div data-img="${i}"><img src="${src}" alt="${product.name}" loading="lazy"></div>`).join('')
            : `<div>${shoeSVG(product)}</div><div>${shoeSVG(product, { flip: true })}</div><div class="thumb-zoom">${shoeSVG(product)}</div>`}
        </div>
      </div>

      <div class="pdp-info">
        <a href="shop.html?brand=${product.brand}" class="card-brand">${catLabel('brand', product.brand)}</a>
        <h1>${product.name}</h1>
        <div class="card-price pdp-price">
          <strong class="${product.oldPrice ? 'is-sale' : ''}">${formatPrice(product.price)}</strong>
          ${product.oldPrice ? `<s>${formatPrice(product.oldPrice)}</s><span class="save">${discount}% ${t('off')}</span>` : ''}
        </div>

        <div class="pdp-tags">
          <a href="shop.html?brand=${product.brand}"><small>${t('brand')}</small>${catLabel('brand', product.brand)}</a>
          <a href="shop.html?style=${product.style}"><small>${t('style')}</small>${catLabel('style', product.style)}</a>
          <a href="shop.html?price=${priceRangeOf(product.price)}"><small>${t('price')}</small>${catLabel('price', priceRangeOf(product.price))}</a>
          <a href="shop.html?season=${product.seasons.join('&season=')}"><small>${t('season')}</small>${product.seasons.map(s => catLabel('season', s)).join('، ')}</a>
        </div>

        <div class="pdp-sizes">
          <div class="pdp-label"><strong>${t('chooseSize')}</strong><span class="muted">EU</span></div>
          <div class="sizes">${sizes.map(s => `<button data-size="${s}" ${inStock ? '' : 'disabled'}>${s}</button>`).join('')}</div>
          <p class="size-error" id="size-error" hidden>${t('pickSize')}</p>
        </div>

        <div class="pdp-actions">
          <button class="btn btn-dark btn-block" id="add-cart" ${inStock ? '' : 'disabled'}>${inStock ? `${ICONS.bag} ${t('addToCart')}` : t('outOfStock')}</button>
          <button class="btn btn-outline btn-square card-wish-lg ${getWish().includes(product.id) ? 'active' : ''}" data-wish="${product.id}" aria-label="${t('wishlist')}">${ICONS.heart}</button>
        </div>

        ${desc ? `<p class="pdp-desc">${escapeHtml(desc)}</p>` : ''}
        <ul class="pdp-perks">
          <li>${ICONS.truck}${t('delivery')}</li>
          <li>${ICONS.cash}${t('cod')}</li>
          <li>${ICONS.swap}${t('exchange')}</li>
        </ul>
      </div>
    </div>
  </div>
  ${carousel(t('related'), related)}
`;

bindCarousels();
track('product_view', { product_id: product.id });

document.querySelectorAll('[data-size]').forEach(b => b.onclick = () => {
  selectedSize = Number(b.dataset.size);
  document.querySelectorAll('[data-size]').forEach(x => x.classList.toggle('active', x === b));
  document.getElementById('size-error').hidden = true;
});

document.querySelectorAll('.pdp-thumbs > div').forEach((th, i) => th.onclick = () => {
  const main = document.querySelector('.pdp-main');
  const current = main.querySelector('svg, img');
  if (gallery.length) {
    current.outerHTML = `<img src="${gallery[i]}" alt="${product.name}">`;
    return;
  }
  current.outerHTML = i === 1 ? shoeSVG(product, { flip: true }) : productVisual(product);
  main.classList.toggle('zoomed', i === 2);
});

document.getElementById('add-cart').onclick = () => {
  if (!selectedSize) { document.getElementById('size-error').hidden = false; return; }
  addToCart(product.id, selectedSize);
};
});
