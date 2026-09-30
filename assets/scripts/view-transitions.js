(function () {
  function slugify(href) {
    var clean = href.split('#')[0].split('?')[0].replace(/\.html$/, '');
    var parts = clean.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'page';
  }

  // Category pages: tag each product card's image with a name derived from its target product's slug,
  // so the browser can match it to that same product's hero image on the next page.
  var cards = document.querySelectorAll('a[href*="/single-products/"]');
  cards.forEach(function (link) {
    var img = link.querySelector('img');
    if (img) {
      img.style.viewTransitionName = 'product-thumb-' + slugify(link.getAttribute('href'));
    }
  });

  // Product pages: tag the main hero image with a name derived from this page's own slug.
  var path = window.location.pathname;
  if (path.indexOf('/single-products/') !== -1) {
    var slug = slugify(path);
    var heroImg = document.querySelector(
      '.container.mx-auto.flex.flex-wrap-reverse img, ' +
      '.container.mx-auto.flex.flex-col-reverse img, ' +
      '.container.mx-auto.flex.flex-col-reverse.md\\:flex-row img'
    );
    if (heroImg) {
      heroImg.style.viewTransitionName = 'product-thumb-' + slug;
    }
  }
})();
