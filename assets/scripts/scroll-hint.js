(function () {
  // On desktop the product image column is often much shorter than the specs column beside it.
  // That empty space gets an "On this page" card linking to the sections further down.
  var MIN_GAP = 150;     // below this the columns are close enough that no card is needed
  var MIN_LINKS = 3;     // fewer links than this is not worth a card
  var MAX_LINKS = 6;

  var CSS =
    '.otp-card{margin-top:24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05),0 10px 25px rgba(0,0,0,.08);max-width:20rem;margin-left:auto;margin-right:auto}' +
    '.otp-card .otp-title{display:block;padding:14px 18px 8px;font:600 11px Poppins,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8}' +
    '.otp-card ul{list-style:none;margin:0;padding:0 8px 8px}' +
    '.otp-card a{display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;color:#00396F;font:500 14px Outfit,sans-serif;line-height:1.3;text-decoration:none;transition:background .2s,color .2s}' +
    '.otp-card a:hover,.otp-card a:focus-visible{background:#fff7ed;color:#ea580c;outline:none}' +
    '.otp-card .otp-n{width:24px;height:24px;border-radius:6px;background:#eff6ff;color:#00396F;font:600 11px Poppins,sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s,color .2s}' +
    '.otp-card a:hover .otp-n,.otp-card a:focus-visible .otp-n{background:#f97316;color:#fff}' +
    '.otp-card .otp-chev{margin-left:auto;flex-shrink:0;color:#cbd5e1;transition:transform .2s,color .2s}' +
    '.otp-card a:hover .otp-chev,.otp-card a:focus-visible .otp-chev{transform:translateY(2px);color:#f97316}' +
    '.otp-target{scroll-margin-top:24px}' +
    '@media (prefers-reduced-motion:reduce){.otp-card a,.otp-card .otp-n,.otp-card .otp-chev{transition:none}}';

  var CHEV = '<svg class="otp-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

  function addStyles() {
    if (document.getElementById('otp-css')) return;
    var st = document.createElement('style');
    st.id = 'otp-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function slug(text) {
    return 'sec-' + text.toLowerCase().replace(/&amp;|&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  }

  // Section headings that come after the intro row: every h2, plus the FAQ heading (an h3 on most pages)
  function sectionHeadings(row) {
    var footer = document.getElementById('footer-placeholder');
    return Array.prototype.filter.call(document.querySelectorAll('h2, h3'), function (h) {
      if (!(row.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) || row.contains(h)) return false;
      if ((footer && footer.contains(h)) || h.closest('#quote-modal, nav, footer')) return false;
      var t = h.textContent.trim();
      if (!t) return false;
      return h.tagName === 'H2' || /frequently asked questions|^faqs?$/i.test(t);
    });
  }

  function buildCard(headings) {
    var card = document.createElement('nav');
    card.className = 'otp-card';
    card.setAttribute('aria-label', 'On this page');
    var used = {};
    var items = headings.map(function (h, i) {
      var text = h.textContent.replace(/\s+/g, ' ').trim();
      if (!h.id) { var id = slug(text), n = 2; while (document.getElementById(id) || used[id]) id = slug(text) + '-' + n++; h.id = id; }
      used[h.id] = 1;
      h.classList.add('otp-target');
      return '<li><a href="#' + h.id + '"><span class="otp-n">' + (i < 9 ? '0' : '') + (i + 1) + '</span><span></span>' + CHEV + '</a></li>';
    });
    card.innerHTML = '<span class="otp-title">On this page</span><ul>' + items.join('') + '</ul>';
    // heading text goes in as text, never as HTML
    card.querySelectorAll('a').forEach(function (a, i) { a.children[1].textContent = headings[i].textContent.replace(/\s+/g, ' ').trim(); });
    card.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      var target = document.getElementById(a.getAttribute('href').slice(1)); if (!target) return;
      e.preventDefault();
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + target.id);
    });
    return card;
  }

  function removeCard(column) {
    var existing = column.querySelector('.otp-card');
    if (existing) existing.remove();
  }

  function checkColumns() {
    var isDesktop = window.innerWidth >= 768;
    var rightCols = document.querySelectorAll('.md\\:w-1\\/2.animate__fadeInRight');

    rightCols.forEach(function (rightCol) {
      var row = rightCol.parentElement;
      if (!row) return;
      var leftCol = row.querySelector('.md\\:w-1\\/2.animate__fadeInLeft');
      if (!leftCol) return;

      removeCard(rightCol);
      if (!isDesktop) return;
      if (leftCol.offsetHeight - rightCol.offsetHeight <= MIN_GAP) return;

      var headings = sectionHeadings(row).slice(0, MAX_LINKS);
      if (headings.length < MIN_LINKS) return;

      addStyles();
      var card = buildCard(headings);
      rightCol.appendChild(card);
      // Never let the card make the image column taller than the specs column: drop links from the end until it fits
      var list = card.querySelector('ul');
      while (rightCol.offsetHeight > leftCol.offsetHeight && list.children.length > MIN_LINKS) list.lastElementChild.remove();
      if (rightCol.offsetHeight > leftCol.offsetHeight) removeCard(rightCol);
    });
  }

  setTimeout(checkColumns, 400);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkColumns, 300);
  });
})();
