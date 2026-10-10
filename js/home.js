/* الصفحة الرئيسية */
const bannersPromise = fetchBanners();   // يبدأ التحميل مع المنتجات

boot(async () => {

const fallbackSlides = [
  { title: t('heroT1'), sub: t('heroS1'), cta: t('discover'), link: 'shop.html?brand=adidas', img: 'assets/hero/hero1.jpg', pos: '50% 60%' },
  { title: t('heroT2'), sub: t('heroS2'), cta: t('shopNow'),  link: 'shop.html?brand=puma',   img: 'assets/hero/hero2.jpg', pos: '50% 55%' },
  { title: t('heroT3'), sub: t('heroS3'), cta: t('shopNow'),  link: 'shop.html?brand=nike',   img: 'assets/hero/hero3.jpg', pos: '35% 70%' }
];

/* الإعلانات من لوحة الإدارة (جدول ms_banners) وإلا الإعلانات الافتراضية */
const banners = await bannersPromise;
const safeLink = l => /^(shop|product|index)\.html|^https:\/\//.test(l || '') ? l : 'shop.html';
const toSlide = b => ({
  title: escapeHtml(LANG === 'fr' && b.title_fr ? b.title_fr : b.title_ar),
  sub: escapeHtml(LANG === 'fr' && b.sub_fr ? b.sub_fr : b.sub_ar || ''),
  cta: escapeHtml((LANG === 'fr' ? b.cta_fr : b.cta_ar) || t('shopNow')),
  link: escapeHtml(safeLink(b.link)), img: escapeHtml(b.image), pos: escapeHtml(b.position || '50% 50%'),
  external: /^https:/.test(b.link || '')
});
const heroBanners = (banners || []).filter(b => (b.placement || 'hero') === 'hero');
const midAds = (banners || []).filter(b => b.placement === 'middle').map(toSlide);
const slides = heroBanners.length
  ? heroBanners.map(toSlide)
  : fallbackSlides;


const seasonBg = { spring: '#e8f3e1', summer: '#fff1c9', autumn: '#f6dcc4', winter: '#dde8f3' };
const seasonPick = { spring: 13, summer: 4, autumn: 11, winter: 25 };
const stylePick = { sport: 1, casual: 20, streetwear: 17, classic: 26, outdoor: 8, sandals: 12 };

document.getElementById('home').innerHTML = `
  <section class="hero">
    ${slides.map((s, i) => `
      <div class="slide ${i === 0 ? 'active' : ''}">
        <div class="slide-photo"><img src="${s.img}" alt="" style="object-position:${s.pos}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></div>
        <div class="slide-text">
          <h${i ? 2 : 1} class="slide-title">${s.title}</h${i ? 2 : 1}>
          ${s.sub ? `<p>${s.sub}</p>` : ''}
          <a href="${s.link}" class="btn btn-light" ${s.external ? 'target="_blank" rel="noopener"' : ''}>${s.cta}</a>
        </div>
      </div>`).join('')}
    <div class="hero-dots" ${slides.length < 2 ? 'hidden' : ''}>${slides.map((_, i) => `<button data-slide="${i}" class="${i === 0 ? 'active' : ''}" aria-label="${i + 1}"></button>`).join('')}</div>
  </section>

  ${carousel(t('newArrivals'), PRODUCTS.filter(p => p.isNew), 'shop.html?sort=new')}

  <section class="section">
    <div class="container">
      <div class="section-head"><div><h2>${t('bySeason')}</h2><p class="muted">${t('seasonSub')}</p></div></div>
      <div class="tiles tiles-4">
        ${CATEGORIES.season.map(s => `
          <a href="shop.html?season=${s.id}" class="tile" style="background:${seasonBg[s.id]}">
            <span class="tile-icon">${s.icon}</span>
            <div class="tile-visual">${shoeSVG(getProduct(seasonPick[s.id]))}</div>
            <div class="tile-text"><h3>${s.label[LANG]}</h3><span class="link-under">${t('shopNow')}</span></div>
          </a>`).join('')}
      </div>
    </div>
  </section>

  ${midAds.length ? `
  <section class="mid-ads ${midAds.length > 1 ? 'mid-ads-2' : ''}">
    <div class="container mid-ads-grid">
      ${midAds.map(a => `
        <a class="mid-ad" href="${a.link}" ${a.external ? 'target="_blank" rel="noopener"' : ''}>
          <img src="${a.img}" alt="" loading="lazy" style="object-position:${a.pos}">
          <div class="mid-ad-text">
            <h2>${a.title}</h2>
            ${a.sub ? `<p>${a.sub}</p>` : ''}
            <span class="btn btn-light">${a.cta}</span>
          </div>
        </a>`).join('')}
    </div>
  </section>` : `
  <section class="banner">
    <div class="container banner-inner">
      <div class="banner-text">
        <span class="eyebrow">${t('style')}</span>
        <h2>${t('bannerT')}</h2>
        <p>${t('bannerS')}</p>
        <a href="shop.html?style=streetwear" class="btn btn-light">${t('shopNow')}</a>
      </div>
      <div class="banner-visual">${shoeSVG(getProduct(3))}${shoeSVG(getProduct(21))}</div>
    </div>
  </section>`}

  ${carousel(t('bannerT'), PRODUCTS.filter(p => p.style === 'streetwear'), 'shop.html?style=streetwear')}

  <section class="section">
    <div class="container">
      <div class="section-head"><h2>${t('byBrand')}</h2></div>
      <div class="chips-row">
        ${CATEGORIES.brand.map(b => `<a href="shop.html?brand=${b.id}" class="brand-chip">${b.label[LANG]}</a>`).join('')}
      </div>
    </div>
  </section>

  ${carousel(t('bestSellers'), PRODUCTS.filter(p => p.best || p.oldPrice), 'shop.html')}

  <section class="section">
    <div class="container">
      <div class="section-head"><h2>${t('byStyle')}</h2></div>
      <div class="tiles tiles-3">
        ${CATEGORIES.style.map(s => `
          <a href="shop.html?style=${s.id}" class="tile tile-style">
            <div class="tile-visual">${shoeSVG(getProduct(stylePick[s.id]))}</div>
            <div class="tile-text"><h3>${s.label[LANG]}</h3><span class="link-under">${t('shopNow')}</span></div>
          </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head"><h2>${t('byPrice')}</h2></div>
      <div class="price-tiles">
        ${CATEGORIES.price.map((r, i) => `
          <a href="shop.html?price=${r.id}" class="price-tile">
            <span class="price-level">${'●'.repeat(i + 1)}${'○'.repeat(3 - i)}</span>
            <strong>${r.label[LANG]}</strong>
            <span class="link-under">${t('shopNow')}</span>
          </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="perks">
    <div class="container perks-inner">
      <div>${ICONS.truck}<span>${t('delivery')}</span></div>
      <div>${ICONS.cash}<span>${t('cod')}</span></div>
      <div>${ICONS.swap}<span>${t('exchange')}</span></div>
    </div>
  </section>
`;

bindCarousels();

/* السلايدر */
let current = 0;
const slideEls = document.querySelectorAll('.slide');
const dotEls = document.querySelectorAll('.hero-dots button');
function goTo(i) {
  current = (i + slideEls.length) % slideEls.length;
  slideEls.forEach((s, k) => s.classList.toggle('active', k === current));
  dotEls.forEach((d, k) => d.classList.toggle('active', k === current));
}
dotEls.forEach(d => d.onclick = () => { goTo(Number(d.dataset.slide)); restart(); });
let timer;
const restart = () => { clearInterval(timer); if (slideEls.length > 1) timer = setInterval(() => goTo(current + 1), 5500); };
restart();
});
