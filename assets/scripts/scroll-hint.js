(function () {
  var HEIGHT_GAP_THRESHOLD = 150;

  function injectHint(column) {
    var hint = document.createElement('div');
    hint.className = 'scroll-more-hint text-center mt-6';
    hint.innerHTML =
      '<p class="font-bold text-orange-500 text-lg md:text-xl mb-1" style="font-family: \'Libre Baskerville\', serif; font-style: italic;">More details below</p>' +
      '<div class="animate-bounce text-orange-500" style="font-size: 1.75rem; line-height: 1;">&darr;</div>';
    column.appendChild(hint);
    column.dataset.scrollHintChecked = 'true';
  }

  function removeHint(column) {
    var existing = column.querySelector('.scroll-more-hint');
    if (existing) existing.remove();
    column.dataset.scrollHintChecked = 'false';
  }

  function checkColumns() {
    var isDesktop = window.innerWidth >= 768;
    var rightCols = document.querySelectorAll('.md\\:w-1\\/2.animate__fadeInRight');

    rightCols.forEach(function (rightCol) {
      var parent = rightCol.parentElement;
      if (!parent) return;
      var leftCol = parent.querySelector('.md\\:w-1\\/2.animate__fadeInLeft');
      if (!leftCol) return;

      if (!isDesktop) {
        if (rightCol.dataset.scrollHintChecked === 'true') removeHint(rightCol);
        return;
      }

      var alreadyShown = rightCol.dataset.scrollHintChecked === 'true';
      var gap = leftCol.offsetHeight - rightCol.offsetHeight;

      if (gap > HEIGHT_GAP_THRESHOLD && !alreadyShown) {
        injectHint(rightCol);
      } else if (gap <= HEIGHT_GAP_THRESHOLD && alreadyShown) {
        removeHint(rightCol);
      }
    });
  }

  setTimeout(checkColumns, 400);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkColumns, 300);
  });
})();
