// Builds assets/data/site-index.json from every page on the site.
// Runs automatically on each Netlify deploy (see netlify.toml) and can be run by hand: npm run build:search
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'data', 'site-index.json');
const EXTRA = path.join(ROOT, 'assets', 'data', 'search-extra-keywords.json');
const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts', 'google-apps-script', 'netlify', 'assets']);
const SKIP_FILES = new Set(['navbar.html', 'footer.html', 'footer-only.html', 'search.html', 'success.html']);
const MAX_BODY = 5000;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else if (e.name.endsWith('.html') && !SKIP_FILES.has(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

const ENT = { amp: '&', nbsp: ' ', middot: '·', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '-', deg: '°', times: 'x', plusmn: '±', hellip: '...', copy: '©' };
function decode(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g) => {
    if (g[0] === '#') {
      const n = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : ' ';
    }
    return Object.prototype.hasOwnProperty.call(ENT, g.toLowerCase()) ? ENT[g.toLowerCase()] : ' ';
  });
}
const squash = (s) => decode(s).replace(/\s+/g, ' ').trim();
const textOf = (html) => squash(html.replace(/<[^>]+>/g, ' '));

function meta(html, attr, name) {
  const re = new RegExp('<meta[^>]*' + attr + '=["\']' + name + '["\'][^>]*>', 'i');
  const tag = html.match(re);
  if (!tag) return '';
  const c = tag[0].match(/content=(["'])([\s\S]*?)\1/i);
  return c ? squash(c[2]) : '';
}

function all(html, tag) {
  const out = [];
  const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'gi');
  let m;
  while ((m = re.exec(html))) { const t = textOf(m[1]); if (t) out.push(t); }
  return out;
}

// "FULL HEXAGON BODY RIVET NUT" -> "Full Hexagon Body Rivet Nut" (standards like DIN 933 and sizes like M8 stay as written)
function prettyTitle(s) {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (!letters || letters !== letters.toUpperCase()) return s;
  const small = new Set(['and', 'or', 'of', 'for', 'with', 'in', 'to', 'the', 'a']);
  return s.split(' ').map((w, i) => {
    if (/\d/.test(w) || /^(din|iso|asme|astm|bsw|bsf)$/i.test(w)) return w.toUpperCase();
    const lw = w.toLowerCase();
    return i > 0 && small.has(lw) ? lw : lw.replace(/(^|[-(\/])([a-z])/g, (m, p, c) => p + c.toUpperCase());
  }).join(' ');
}

function typeOf(rel) {
  if (rel.startsWith('single-products/')) return 'Product';
  if (rel.startsWith('categories/')) return 'Category';
  if (rel.startsWith('blog/') || rel === 'blogs.html') return 'Article';
  if (rel.startsWith('locations/') || rel === 'locations.html') return 'Location';
  return 'Page';
}

function urlOf(rel) {
  let u = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '');
  if (u === '/index') u = '/';
  return u;
}

function imageOf(html, rel) {
  let img = meta(html, 'property', 'og:image');
  if (img) { img = img.replace(/^https?:\/\/[^/]+/, ''); }
  if (!img || /\.(jpg|jpeg)$/i.test(img)) {
    // prefer the transparent product image shown on the page over a white-background og image
    const m = html.match(/<img[^>]+src=["']([^"']*\/assets\/single-products\/[^"']+)["']/i);
    if (m) img = m[1].replace(/^(\.\.\/)+/, '/');
  }
  return img || '';
}

function build() {
  let extra = {};
  try { extra = JSON.parse(fs.readFileSync(EXTRA, 'utf8')); } catch (e) { /* optional */ }
  const extraByUrl = {};
  (Array.isArray(extra) ? extra : []).forEach((e) => { extraByUrl[e.url] = e.keywords || ''; });

  const docs = [];
  for (const file of walk(ROOT, [])) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    let html = fs.readFileSync(file, 'utf8');
    if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) continue;

    const title = squash((html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1]);
    const h1 = (all(html, 'h1')[0] || '').replace(/\s+/g, ' ');
    const description = meta(html, 'name', 'description');
    const keywords = meta(html, 'name', 'keywords');

    const body = html
      .replace(/<head[\s\S]*?<\/head>/i, ' ')
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');
    const headings = [].concat(all(body, 'h2'), all(body, 'h3')).slice(0, 25).join(' | ');
    const faq = all(body, 'h4').slice(0, 15).join(' | ');
    let text = textOf(body);
    if (text.length > MAX_BODY) text = text.slice(0, MAX_BODY);

    const url = urlOf(rel);
    const rawTitle = (h1 && h1.length <= 90 ? h1 : title).split('|')[0].trim();
    docs.push({
      u: url,
      t: prettyTitle(rawTitle) || title,
      y: typeOf(rel),
      d: description,
      k: [keywords, extraByUrl[url] || ''].filter(Boolean).join(' | '),
      h: [headings, faq].filter(Boolean).join(' | '),
      b: text,
      i: imageOf(html, rel)
    });
  }

  docs.sort((a, b) => a.u.localeCompare(b.u));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ built: new Date().toISOString(), docs }));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log('site-index.json: ' + docs.length + ' pages, ' + kb + ' KB');
}

try { build(); } catch (err) {
  // never fail a deploy because of search: keep whatever index is already committed
  console.warn('Search index build skipped:', err && err.message);
}
