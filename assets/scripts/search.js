(function () {
  var INDEX_URL = '/assets/data/site-index.json';
  var LIB_URL = '/assets/scripts/vendor/minisearch.min.js';

  var STOP = {};
  ('a an the of for and or in on to with from by at is are was be i you your we our me my do does can could would should what which who how where when why ' +
   'this that these those it its as if not no yes please buy price prices cost supplier suppliers supply company india bangalore bengaluru near best').split(' ')
    .forEach(function (w) { STOP[w] = true; });

  // Trade words buyers use that the pages may not (query expansion only - never shown on screen)
  var SYNONYMS = [
    [/\bpop ?-?rivets?\b|\bpoprivet/, 'blind rivet'],
    [/\btek\b|\bteks\b|\btec screws?\b|\bself ?-?drill/, 'self drilling screw'],
    [/\bsheet ?metal screw|\bthread ?forming screw|\bparker screw/, 'self tapping screw'],
    [/\brivnut|\bnut ?sert|\binsert nut|\bblind nut|\bthreaded insert nut/, 'rivet nut'],
    [/\bthread(ed)? inserts?\b|\bhelical\b|\bcoil insert|\bscrew thread insert|\bsti\b/, 'wire threaded insert'],
    [/\bnord ?-?lock|\bwedge ?-?lock|\blocking washer|\banti ?-?vibration washer|\block ?washer/, 'nord lock washer wedge locking'],
    [/\bu ?-?bolt/, 'u bolt blind rivet'],
    [/\bclosed ?-?end|\bcup ?-?end|\bwater ?-?(tight|proof) rivet|\bsealed rivet/, 'sealed blind rivet closed end'],
    [/\bsems\b|\bscrew (and|with) washer|\bcaptive washer|\bcombination screw/, 'sems screw washer'],
    [/\binox\b|\bss\b|\ba2\b|\ba4\b|\bsus ?304|\bsus ?316/, 'stainless steel'],
    [/\bgalvani[sz]ed\b|\bzinc plated\b|\bzp\b/, 'zinc'],
    [/\bhexagon(al)?\b/, 'hex'],
    [/\brawl ?plug|\bwall ?plug|\bfischer/, 'wall plug anchor'],
    [/\bdowel\b|\bcam ?lock|\bminifix/, 'furniture fasteners'],
    [/\bset ?screw|\bgrub ?screw|\bmachine screw/, 'screw']
  ];

  // Standard prefixes alone say nothing about the product, so a page matching only these is not a real hit
  var WEAK = { din: 1, iso: 1, asme: 1, astm: 1, bsw: 1, bsf: 1, en: 1 };

  var TYPE_WEIGHT ={ Product: 1.2, Category: 1.1, Article: 0.85, Page: 0.8, Location: 0.7 };
  var TYPE_STYLE = {
    Product: 'bg-orange-100 text-orange-700', Category: 'bg-blue-100 text-blue-800',
    Article: 'bg-gray-200 text-gray-700', Page: 'bg-gray-200 text-gray-700', Location: 'bg-gray-200 text-gray-700'
  };

  var state = null;       // { docs, byUrl, ms, vocab }
  var loading = null;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function tokenize(s) {
    s = String(s).toLowerCase().replace(/[’']/g, '');
    s = s.replace(/\b(din|iso|asme|astm|bsw|bsf|nl|st)[-\s]?(\d)/g, '$1 $2');
    s = s.replace(/\b(m\d+(?:\.\d+)?)\s*[x×]\s*(\d)/g, '$1 $2');
    return s.split(/[\s\-_\/\\.,;:()\[\]|+&"“”?!=*<>#]+/).filter(Boolean);
  }
  function stem(t) {
    if (t.length > 4 && /ies$/.test(t)) return t.slice(0, -3) + 'y';
    if (t.length > 3 && /[^s]s$/.test(t) && !/(us|is)$/.test(t)) return t.slice(0, -1);
    return t;
  }
  function processTerm(t) {
    t = t.toLowerCase();
    if (STOP[t]) return null;
    if (t.length < 2 && !/\d/.test(t)) return null;
    return stem(t);
  }
  function queryTokens(q) { return tokenize(q).map(processTerm).filter(Boolean); }

  function expand(q) {
    var low = q.toLowerCase(), add = [];
    SYNONYMS.forEach(function (s) { if (s[0].test(low)) add.push(s[1]); });
    return add.length ? q + ' ' + add.join(' ') : q;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.MiniSearch) return resolve();
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }

  function load() {
    if (state) return Promise.resolve(state);
    if (loading) return loading;
    loading = Promise.all([loadScript(LIB_URL), fetch(INDEX_URL).then(function (r) { return r.json(); })]).then(function (res) {
      var docs = res[1].docs || [];
      var ms = new window.MiniSearch({
        idField: 'u',
        fields: ['t', 'k', 'h', 'd', 'b'],
        storeFields: ['t'],
        tokenize: tokenize,
        processTerm: processTerm,
        searchOptions: {
          boost: { t: 6, k: 3, h: 2, d: 1.5, b: 1 },
          prefix: function (t) { return t.length >= 2; },
          fuzzy: function (t) { return /\d/.test(t) || t.length < 4 ? false : (t.length >= 5 ? 0.3 : 0.2); }
        }
      });
      ms.addAll(docs);
      var byUrl = {}, vocab = {};
      docs.forEach(function (d) {
        byUrl[d.u] = d;
        (d.t + ' ' + d.h + ' ' + d.d).toLowerCase().split(/[^a-z]+/).forEach(function (w) { if (w.length >= 4) vocab[w] = (vocab[w] || 0) + 1; });
      });
      state = { docs: docs, byUrl: byUrl, ms: ms, vocab: vocab };
      return state;
    });
    return loading;
  }

  function suggest(q) {
    var words = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean), changed = false;
    var out = words.map(function (w) {
      if (w.length < 4 || /\d/.test(w) || STOP[w] || state.vocab[w] || state.vocab[stem(w)] || state.vocab[w + 's']) return w;
      var best = null, bestD = 3;
      Object.keys(state.vocab).forEach(function (v) {
        var d = lev(w, v);
        if (d < bestD || (d === bestD && best && state.vocab[v] > state.vocab[best])) { best = v; bestD = d; }
      });
      if (best && bestD <= (w.length >= 7 ? 2 : 1)) { changed = true; return best; }
      return w;
    });
    return changed ? out.join(' ') : '';
  }

  function search(q, limit) {
    q = String(q || '').trim();
    return load().then(function (st) {
      var tokens = queryTokens(q);
      if (!tokens.length) return { results: [], tokens: [], suggestion: '' };
      var merged = {};
      var orRes = st.ms.search(expand(q), { combineWith: 'OR' });
      if (tokens.length > 1) {
        st.ms.search(q, { combineWith: 'AND' }).forEach(function (r) { merged[r.id] = { score: r.score * 3, id: r.id }; });
      }
      var need = tokens.length >= 3 ? Math.ceil(tokens.length / 2) : 1;
      orRes.forEach(function (r) {
        if (merged[r.id]) { merged[r.id].score += r.score; return; }
        var hit = Object.keys(r.match);
        var strong = hit.filter(function (t) { return !WEAK[t]; });
        if (hit.length >= need && strong.length) merged[r.id] = { score: r.score, id: r.id };
      });
      var qLow = tokens.join(' ');
      var results = Object.keys(merged).map(function (id) {
        var d = st.byUrl[id], m = merged[id];
        var tLow = queryTokens(d.t).join(' ');
        var score = m.score * (TYPE_WEIGHT[d.y] || 1);
        if (tLow.indexOf(qLow) === 0) score *= 2.2; else if (tLow.indexOf(qLow) > -1) score *= 1.8;
        return { doc: d, score: score };
      }).sort(function (a, b) { return b.score - a.score; }).slice(0, limit || 8);
      var low = q.toLowerCase();
      var terms = tokenize(low).filter(function (t) { return !STOP[t] && (t.length >= 2 || /\d/.test(t)); }).map(stem);
      return { results: results, tokens: terms, suggestion: results.length < 2 ? suggest(q) : '' };
    });
  }

  function highlight(text, terms) {
    if (!terms.length) return esc(text);
    var re = new RegExp('\\b(' + terms.map(escRe).join('|') + ')[a-z0-9]*', 'gi');
    var out = '', last = 0, m;
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index)) + '<mark class="bg-orange-100 text-inherit rounded px-0.5">' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
      if (!m[0].length) re.lastIndex++;
    }
    return out + esc(text.slice(last));
  }

  function snippet(doc, terms) {
    var cands = [];
    if (doc.d) cands.push(doc.d);
    (doc.b || '').split(/[.!?]\s+/).forEach(function (s) { if (s.length > 25 && s.length < 400) cands.push(s); });
    var best = '', bestScore = -1;
    cands.forEach(function (c) {
      var low = c.toLowerCase(), n = 0;
      terms.forEach(function (t) { if (low.indexOf(t) > -1) n++; });
      if (n > bestScore) { best = c; bestScore = n; }
    });
    if (!best) best = doc.d || '';
    if (best.length > 150) {
      var idx = -1;
      terms.some(function (t) { idx = best.toLowerCase().indexOf(t); return idx > -1; });
      var start = Math.max(0, (idx > -1 ? idx : 0) - 40);
      if (start > 0) { var sp = best.indexOf(' ', start); if (sp > -1 && sp - start < 15) start = sp + 1; }
      best = (start > 0 ? '...' : '') + best.slice(start, start + 150).trim() + '...';
    }
    return best;
  }

  function track(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }

  function resultRow(r, terms, idPrefix, i) {
    var d = r.doc;
    return '<a id="' + idPrefix + i + '" role="option" href="' + esc(d.u) + '" data-search-item class="flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 hover:bg-primary-gray-100">' +
      (d.i ? '<img src="' + esc(d.i) + '" alt="" loading="lazy" class="w-10 h-10 object-contain rounded bg-gray-50 flex-shrink-0">' : '<span class="w-10 h-10 flex-shrink-0"></span>') +
      '<span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="text-sm font-semibold font-outfit text-[#00396F] truncate">' + highlight(d.t, terms) + '</span>' +
      '<span class="text-[10px] font-roboto uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ' + (TYPE_STYLE[d.y] || TYPE_STYLE.Page) + '">' + esc(d.y) + '</span></span>' +
      '<span class="block text-xs font-roboto text-gray-500 leading-snug mt-0.5 line-clamp-2">' + highlight(snippet(d, terms), terms) + '</span></span></a>';
  }

  function noResultsHtml(q, suggestion) {
    return '<div class="px-4 py-4 text-sm font-roboto text-gray-700">' +
      '<p class="mb-2">No match for <strong>' + esc(q) + '</strong>.</p>' +
      (suggestion ? '<p class="mb-2">Did you mean <a href="/search.html#q=' + encodeURIComponent(suggestion) + '" data-search-item class="text-[#00396F] underline font-semibold">' + esc(suggestion) + '</a>?</p>' : '') +
      '<p class="text-gray-500 mb-3">Try fewer words, or ask us. We can source or make it.</p>' +
      '<button type="button" data-quote-open class="bg-orange-500 text-white text-xs font-semibold py-1.5 px-4 rounded-full hover:bg-orange-600">Request a Quote</button> ' +
      '<a href="tel:+917204435253" class="text-xs text-[#00396F] underline ml-2">+91 7204435253</a></div>';
  }

  function attachAutocomplete(input, dropdown) {
    if (!input || !dropdown) return;
    var idPrefix = dropdown.id + '-opt-';
    var active = -1, timer = null, noResultTimer = null, lastQuery = '', lastTracked = '';
    dropdown.setAttribute('role', 'listbox');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', dropdown.id);
    input.setAttribute('aria-expanded', 'false');

    function show(html) {
      dropdown.innerHTML = html;
      dropdown.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
      active = -1;
    }
    function hide() { dropdown.classList.add('hidden'); input.setAttribute('aria-expanded', 'false'); active = -1; }
    function items() { return dropdown.querySelectorAll('[data-search-item]'); }
    function setActive(n) {
      var list = items();
      if (!list.length) return;
      active = (n + list.length) % list.length;
      list.forEach(function (el, i) { el.classList.toggle('bg-primary-gray-100', i === active); });
      input.setAttribute('aria-activedescendant', list[active].id || '');
      list[active].scrollIntoView({ block: 'nearest' });
    }

    function showCategories() {
      load().then(function (st) {
        var cats = st.docs.filter(function (d) { return d.y === 'Category'; }).sort(function (a, b) { return a.t.localeCompare(b.t); });
        if (!cats.length || input.value.trim()) return;
        show('<div class="px-4 py-2 text-[11px] font-roboto uppercase tracking-wider text-gray-400">Browse categories</div>' +
          cats.map(function (c, i) { return '<a id="' + idPrefix + i + '" role="option" href="' + esc(c.u) + '" data-search-item class="block px-4 py-2 text-sm font-roboto text-gray-800 hover:bg-primary-gray-100 border-b border-gray-100">' + esc(c.t) + '</a>'; }).join(''));
      }).catch(function () {});
    }

    function update() {
      var q = input.value.trim();
      lastQuery = q;
      if (!q) { showCategories(); return; }
      search(q, 6).then(function (res) {
        if (input.value.trim() !== q) return;
        if (!res.results.length) {
          show(noResultsHtml(q, res.suggestion));
          clearTimeout(noResultTimer);
          noResultTimer = setTimeout(function () { if (lastTracked !== q) { lastTracked = q; track('search_no_results', { search_term: q }); } }, 900);
          return;
        }
        show(res.results.map(function (r, i) { return resultRow(r, res.tokens, idPrefix, i); }).join('') +
          '<a id="' + idPrefix + 'all" role="option" href="/search.html#q=' + encodeURIComponent(q) + '" data-search-item class="block px-4 py-2.5 text-xs font-roboto font-semibold text-[#00396F] hover:bg-primary-gray-100 text-center">See all results for "' + esc(q) + '"</a>');
      }).catch(function () { hide(); });
    }

    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(update, 90); });
    input.addEventListener('focus', function () { load().catch(function () {}); update(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (dropdown.classList.contains('hidden')) update(); else setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Escape') { hide(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var list = items();
        if (active > -1 && list[active]) { track('search', { search_term: lastQuery }); window.location.href = list[active].getAttribute('href'); return; }
        var q = input.value.trim();
        if (q) { track('search', { search_term: q }); window.location.href = '/search.html#q=' + encodeURIComponent(q); }
      }
    });
    dropdown.addEventListener('click', function (e) {
      var a = e.target.closest('[data-search-item]');
      if (a && lastQuery) track('search_result_click', { search_term: lastQuery, link_url: a.getAttribute('href') });
    });
    document.addEventListener('click', function (e) {
      if (e.target !== input && !dropdown.contains(e.target)) hide();
    });
  }

  function cardHtml(r, terms) {
    var d = r.doc;
    return '<a href="' + esc(d.u) + '" class="flex gap-4 bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition duration-300">' +
      (d.i ? '<img src="' + esc(d.i) + '" alt="' + esc(d.t) + '" loading="lazy" class="w-20 h-20 object-contain rounded bg-gray-50 flex-shrink-0">' : '') +
      '<span class="min-w-0"><span class="flex items-center gap-2 mb-1"><span class="text-base font-semibold font-outfit text-[#00396F]">' + highlight(d.t, terms) + '</span>' +
      '<span class="text-[10px] font-roboto uppercase tracking-wider px-1.5 py-0.5 rounded ' + (TYPE_STYLE[d.y] || TYPE_STYLE.Page) + '">' + esc(d.y) + '</span></span>' +
      '<span class="block text-sm font-roboto text-gray-600 leading-snug">' + highlight(snippet(d, terms), terms) + '</span></span></a>';
  }

  window.ExcelSearch = {
    load: load, search: search, cardHtml: cardHtml, noResultsHtml: noResultsHtml, esc: esc,
    categories: function () { return load().then(function (st) { return st.docs.filter(function (d) { return d.y === 'Category'; }); }); },
    attachAutocomplete: attachAutocomplete
  };

  attachAutocomplete(document.getElementById('site-search-input'), document.getElementById('site-search-dropdown'));
  attachAutocomplete(document.getElementById('site-search-input-mobile'), document.getElementById('site-search-dropdown-mobile'));
})();
