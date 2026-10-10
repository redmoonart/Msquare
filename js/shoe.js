/* رسم أحذية SVG بالألوان — يُستعمل كصورة مؤقتة حتى تضاف صور حقيقية للمنتجات */

function shoeSVG(product, opts = {}) {
  const [upper, accent, sole] = product.colors;
  const style = CATEGORIES.style.find(s => s.id === product.style);
  const shape = product.shape || (style && style.shape) || 'sneaker';
  const flip = opts.flip ? ' transform="scale(-1,1) translate(-400,0)"' : '';
  const line = 'rgba(0,0,0,.18)';
  let body = '';

  switch (shape) {
    case 'runner':
      body = `
        <path d="M28 196 Q24 222 52 226 L352 226 Q384 224 380 194 L372 182 L36 182 Z" fill="${sole}"/>
        <path d="M30 206 L380 206" stroke="${accent}" stroke-width="6" opacity=".55"/>
        <path d="M38 184 L44 132 Q50 104 86 100 L140 96 Q166 94 182 112 L226 146 Q262 158 316 160 Q366 166 374 184 Z" fill="${upper}"/>
        <path d="M70 172 Q160 110 300 168" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>
        <path d="M44 132 Q62 118 96 118" stroke="${line}" stroke-width="5" fill="none"/>
        <g stroke="${accent}" stroke-width="4" stroke-linecap="round">
          <path d="M150 112 L170 104"/><path d="M168 126 L190 118"/><path d="M186 140 L208 132"/>
        </g>
        <path d="M300 162 Q350 166 372 184" stroke="${line}" stroke-width="4" fill="none"/>`;
      break;

    case 'high':
      body = `
        <path d="M34 200 Q32 222 56 224 L352 224 Q378 222 376 198 L376 188 L34 188 Z" fill="${sole}"/>
        <path d="M34 196 L376 196" stroke="${line}" stroke-width="3"/>
        <path d="M44 190 L44 70 Q46 52 66 52 L140 50 Q156 50 158 66 L170 128 Q240 140 312 152 Q366 162 372 190 Z" fill="${upper}"/>
            <path d="M312 152 Q366 162 372 190 L300 190 Q292 166 312 152 Z" fill="${accent}" opacity=".9"/>
        <path d="M60 190 L60 120 Q100 104 150 112" stroke="${accent}" stroke-width="10" fill="none"/>
        <g fill="${accent}">
          <circle cx="140" cy="72" r="4"/><circle cx="144" cy="92" r="4"/><circle cx="148" cy="112" r="4"/><circle cx="162" cy="130" r="4"/>
        </g>
        <g stroke="${line}" stroke-width="4" stroke-linecap="round">
          <path d="M136 80 L150 76"/><path d="M140 100 L154 96"/><path d="M146 120 L160 116"/>
        </g>`;
      break;

    case 'classic':
      body = `
        <path d="M40 204 L40 192 L372 192 Q378 204 366 210 L120 210 L120 222 L52 222 Q40 222 40 210 Z" fill="${sole}"/>
        <path d="M40 194 Q36 150 82 140 L168 132 Q246 128 316 152 Q368 170 372 194 Z" fill="${upper}"/>
        <path d="M168 132 Q250 128 316 152 Q338 160 352 172 Q290 170 236 160 Q196 150 168 132 Z" fill="${accent}" opacity=".35"/>
        <path d="M70 146 Q120 132 170 134" stroke="${line}" stroke-width="4" fill="none"/>
        <g stroke="${accent}" stroke-width="3" stroke-linecap="round">
          <path d="M190 140 L206 132"/><path d="M204 146 L220 138"/>
        </g>
        <path d="M44 186 L370 186" stroke="${line}" stroke-width="2" stroke-dasharray="6 6"/>`;
      break;

    case 'boot':
      body = `
        <path d="M50 204 Q48 226 70 226 L350 226 Q376 224 374 200 L374 188 L50 188 Z" fill="${sole}"/>
        <path d="M50 214 L374 214" stroke="${line}" stroke-width="4" stroke-dasharray="10 6"/>
        <path d="M58 190 L58 58 Q60 42 78 42 L160 42 Q174 42 174 58 L180 126 Q240 136 300 148 Q364 160 370 190 Z" fill="${upper}"/>
        <path d="M58 58 Q60 42 78 42 L160 42 Q174 42 174 58 L174 70 L58 70 Z" fill="${accent}"/>
        <path d="M300 148 Q364 160 370 190 L290 190 Q280 160 300 148 Z" fill="${line}"/>
        <g fill="${accent}">
          <circle cx="166" cy="86" r="4"/><circle cx="168" cy="104" r="4"/><circle cx="172" cy="122" r="4"/><circle cx="186" cy="136" r="4"/>
        </g>
        <path d="M70 186 L70 80" stroke="${line}" stroke-width="3" stroke-dasharray="6 5"/>`;
      break;

    case 'sandal':
      body = `
        <path d="M30 190 Q28 214 54 216 L356 216 Q384 214 382 190 Q380 176 356 176 L54 176 Q30 176 30 190 Z" fill="${sole}"/>
        <path d="M34 180 Q40 170 60 170 L350 170 Q374 172 378 180 L378 186 L34 186 Z" fill="${accent}" opacity=".85"/>
        <path d="M120 176 Q130 96 250 100 Q320 104 330 176 Z" fill="${upper}"/>
        <path d="M150 130 L300 130" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`;
      break;

    default: /* sneaker */
      body = `
        <path d="M30 198 Q28 222 54 224 L352 224 Q380 222 378 196 L378 186 L30 186 Z" fill="${sole}"/>
        <path d="M30 196 L378 196" stroke="${line}" stroke-width="3"/>
        <path d="M38 188 L40 138 Q44 110 78 104 L150 94 Q176 92 190 110 L230 140 Q262 150 312 154 Q368 162 374 188 Z" fill="${upper}"/>
        <path d="M312 154 Q368 162 374 188 L306 188 Q296 162 312 154 Z" fill="${line}"/>
        <path d="M96 176 L250 138" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
        <path d="M96 160 L236 128" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity=".6"/>
        <path d="M40 140 Q58 120 96 116" stroke="${line}" stroke-width="5" fill="none"/>
        <path d="M44 130 L44 186 L84 186 Q70 160 80 120 Z" fill="${accent}" opacity=".9"/>
        <g stroke="${line}" stroke-width="4" stroke-linecap="round">
          <path d="M156 106 L176 100"/><path d="M172 120 L194 114"/><path d="M190 134 L212 128"/>
        </g>`;
  }

  return `<svg class="shoe-svg" viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${product.name}">
    <ellipse cx="205" cy="238" rx="170" ry="10" fill="rgba(0,0,0,.08)"/>
    <g${flip}>${body}</g>
  </svg>`;
}

/* صورة المنتج: صورة حقيقية إن وُجدت وإلا رسم SVG */
function productVisual(product, opts) {
  if (product.image) return `<img src="${product.image}" alt="${product.name}" loading="lazy">`;
  return shoeSVG(product, opts);
}
