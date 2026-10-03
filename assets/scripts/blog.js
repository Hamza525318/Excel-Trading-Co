// Blog standard — floating CTA shown on every post in /blog.
// Appears once the reader has scrolled into the article, stays out of the way of the
// cookie bar, and remembers a dismissal for the rest of the browser session.
(function () {
  var cta = document.getElementById('blog-fcta');
  if (!cta) return;

  var STORAGE_KEY = 'blogFctaDismissed';
  var SHOW_AFTER_PX = 500;
  var dismissed = false;
  try { dismissed = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}

  function update() {
    var cookieBarVisible = !!document.getElementById('cookie-consent-bar');
    var on = !dismissed && !cookieBarVisible && window.scrollY > SHOW_AFTER_PX;
    cta.classList.toggle('is-on', on);
    document.body.classList.toggle('blog-fcta-open', on);
  }

  cta.hidden = false;
  window.addEventListener('scroll', update, { passive: true });
  // Re-check after the cookie bar is accepted/rejected
  document.addEventListener('click', function () { setTimeout(update, 50); });
  update();

  cta.querySelector('.blog-fcta-close').addEventListener('click', function () {
    dismissed = true;
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    update();
  });

  cta.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (typeof gtag === 'function') {
        gtag('event', 'blog_cta_click', { cta_target: a.dataset.cta || a.getAttribute('href'), page_path: location.pathname });
      }
    });
  });
})();
