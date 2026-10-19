// Makes wide spec/size tables usable on phones: tighter cells (style.css), room for
// long columns so values don't wrap one per line, a pinned first column, and a
// "swipe" cue that disappears once the reader has scrolled the table.
(function () {
  var mobile = window.matchMedia('(max-width: 767px)');
  var WIDEN_FACTOR = 1.75;
  var MAX_STICKY_SHARE = 0.4;

  function reset(table, wrap) {
    table.style.minWidth = '';
    table.classList.remove('table-sticky-col');
    wrap.classList.remove('table-scroll');
    var hint = wrap.previousElementSibling;
    if (hint && hint.classList.contains('table-swipe-hint')) hint.remove();
  }

  function paintStickyCells(table) {
    Array.prototype.forEach.call(table.rows, function (row) {
      var cell = row.cells[0];
      if (!cell) return;
      var bg = getComputedStyle(cell).backgroundColor;
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        bg = getComputedStyle(row).backgroundColor;
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = getComputedStyle(row.parentNode).backgroundColor;
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = '#ffffff';
        cell.style.backgroundColor = bg;
      }
    });
  }

  function enhance(table) {
    var wrap = table.closest('.overflow-x-auto, .table-scroll-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'table-scroll-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
    // A few wrappers carry an inline overflow:hidden that would clip the table instead of scrolling it
    if (getComputedStyle(wrap).overflowX === 'hidden') wrap.style.overflowX = 'auto';

    reset(table, wrap);
    if (!mobile.matches || !wrap.clientWidth) return;

    wrap.classList.add('table-scroll');
    if (table.scrollWidth <= wrap.clientWidth + 1) return;

    // It has to scroll anyway, so give long columns room instead of wrapping one value per line
    table.style.width = 'max-content';
    var natural = table.offsetWidth;
    table.style.width = '';
    var target = Math.min(natural, Math.round(wrap.clientWidth * WIDEN_FACTOR));
    if (target > table.offsetWidth) table.style.minWidth = target + 'px';

    var spans = table.querySelector('[rowspan]:not([rowspan="1"]), [colspan]:not([colspan="1"])');
    var first = table.rows[0] && table.rows[0].cells[0];
    if (!spans && first && first.offsetWidth <= wrap.clientWidth * MAX_STICKY_SHARE) {
      table.classList.add('table-sticky-col');
      paintStickyCells(table);
    }

    var hint = document.createElement('div');
    hint.className = 'table-swipe-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = 'Swipe to see all columns &rarr;';
    wrap.parentNode.insertBefore(hint, wrap);
    wrap.addEventListener('scroll', function onScroll() {
      if (wrap.scrollLeft < 24) return;
      hint.classList.add('is-used');
      wrap.removeEventListener('scroll', onScroll);
    }, { passive: true });
  }

  function run() {
    document.querySelectorAll('table').forEach(enhance);
  }

  run();
  window.addEventListener('load', run);
  var resizeTimer;
  var lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    // Mobile browsers fire resize when the URL bar hides; only react to width changes
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(run, 250);
  });
})();
