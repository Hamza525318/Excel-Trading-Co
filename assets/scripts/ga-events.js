(function () {
  function track(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params || {});
    }
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var path = window.location.pathname;

    if (href.indexOf('tel:') === 0) {
      track('contact_click', { method: 'phone', page_path: path });
      return;
    }

    if (href.indexOf('mailto:') === 0) {
      track('contact_click', { method: 'email', page_path: path });
      return;
    }

    if (href.indexOf('/assets/catalog/') !== -1) {
      track('catalogue_download', { page_path: path });
      return;
    }

    var text = (link.textContent || '').trim();
    if (/^(enquire now|contact now)/i.test(text)) {
      track('cta_click', { method: 'enquire_button', link_text: text, page_path: path });
    }
  }, true);
})();
