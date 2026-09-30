(function () {
  var STORAGE_KEY = 'excel_cookie_consent';

  function applyConsent(choice) {
    if (typeof gtag !== 'function') return;
    if (choice === 'granted') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    } else {
      gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  if (stored === 'granted' || stored === 'denied') {
    applyConsent(stored);
    return;
  }

  // The WhatsApp/email/phone floating buttons (navbar.html) sit bottom-fixed at a lower
  // z-index than the cookie bar, so the bar would otherwise cover them while visible.
  // Push them up out of the way for as long as the bar is shown, then restore them.
  function findFabStack() {
    var waLink = document.querySelector('a[href^="https://wa.me/"]');
    if (!waLink) return null;
    var el = waLink.parentElement;
    while (el && el !== document.body) {
      if (getComputedStyle(el).position === 'fixed') return el;
      el = el.parentElement;
    }
    return null;
  }

  function showBanner() {
    var bar = document.createElement('div');
    bar.id = 'cookie-consent-bar';
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background-color:#00396F;box-shadow:0 -4px 12px rgba(0,0,0,0.15);';
    bar.innerHTML =
      '<div class="container mx-auto px-6 md:px-16 py-4 flex flex-col md:flex-row items-center justify-between gap-4">' +
        '<p class="text-white text-sm font-roboto leading-relaxed max-w-2xl">' +
          'We use cookies to understand site traffic and improve your experience. ' +
          '<a href="/our-policy#cookie-policy" class="underline hover:text-orange-300">Learn more</a>.' +
        '</p>' +
        '<div class="flex gap-3 flex-shrink-0">' +
          '<button id="cookie-reject-btn" class="border border-white text-white text-sm font-roboto font-semibold py-2 px-6 rounded-full hover:bg-white hover:text-[#00396F] transition duration-200">Reject</button>' +
          '<button id="cookie-accept-btn" class="bg-orange-500 text-white text-sm font-roboto font-semibold py-2 px-6 rounded-full hover:bg-orange-600 transition duration-200">Accept</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bar);

    var fabStack = null;
    var fabOriginalBottom = null;
    var fabObserver = null;
    var dismissed = false;

    function shiftFabStack(el) {
      fabStack = el;
      fabOriginalBottom = el.style.bottom;
      var shift = bar.getBoundingClientRect().height + 12;
      el.style.bottom = 'calc(5rem + ' + shift + 'px)';
    }

    // navbar.html (which contains the WhatsApp/email/phone buttons) is fetched
    // asynchronously and may not have loaded yet when this banner first shows.
    // Try immediately, and if not found, watch the DOM until it appears.
    var immediateFab = findFabStack();
    if (immediateFab) {
      shiftFabStack(immediateFab);
    } else {
      fabObserver = new MutationObserver(function () {
        if (dismissed) { fabObserver.disconnect(); return; }
        var found = findFabStack();
        if (found) {
          shiftFabStack(found);
          fabObserver.disconnect();
        }
      });
      fabObserver.observe(document.body, { childList: true, subtree: true });
    }

    function dismiss(choice) {
      dismissed = true;
      try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) {}
      applyConsent(choice);
      bar.remove();
      if (fabObserver) fabObserver.disconnect();
      if (fabStack) {
        if (fabOriginalBottom) { fabStack.style.bottom = fabOriginalBottom; }
        else { fabStack.style.removeProperty('bottom'); }
      }
    }

    document.getElementById('cookie-accept-btn').addEventListener('click', function () { dismiss('granted'); });
    document.getElementById('cookie-reject-btn').addEventListener('click', function () { dismiss('denied'); });
  }

  if (document.body) {
    showBanner();
  } else {
    document.addEventListener('DOMContentLoaded', showBanner);
  }
})();
