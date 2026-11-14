// Contact Us form: sends to the same Google Apps Script mailer as the quote form (logged to the
// Website Enquiries sheet, emailed to info@, acknowledged to the visitor). If the mailer cannot be
// reached, the form falls back to its original Formspree action so the enquiry still arrives.
(function () {
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbyUcYOQ19D-8qSJM_knXg0vQFBlaXRJ1JBJrDECC-cOCs4vckg5ToXzYj3nu3XC5Oo0/exec'; // same as quote.js
  var form = document.getElementById('contact-form');
  if (!form) return;
  var loadedAt = Date.now();
  var btn = form.querySelector('button[type="submit"]');
  var label = btn.textContent;
  var status = document.createElement('p');
  status.setAttribute('role', 'alert');
  status.className = 'text-sm text-red-600 font-roboto mb-4';
  status.style.display = 'none';
  btn.parentNode.insertBefore(status, btn);
  var sending = false;

  function track(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }
  function show(msg) { status.textContent = msg; status.style.display = 'block'; }
  function reset() { sending = false; btn.disabled = false; btn.textContent = label; btn.style.opacity = ''; }
  // Native submit skips this handler and posts to Formspree, which redirects to success.html
  function fallback() { track('contact_submit', { method: 'formspree_fallback' }); form.submit(); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    status.style.display = 'none';
    var v = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      message: form.elements.message.value.trim()
    };
    if (!/^[0-9+()\-\s]{7,20}$/.test(v.phone)) { show('Please enter a valid phone number.'); return; }
    sending = true; btn.disabled = true; btn.textContent = 'Sending...'; btn.style.opacity = '0.7';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        form: 'contact', name: v.name, email: v.email, phone: v.phone, message: v.message,
        website: form.elements._gotcha.value, openedMs: Date.now() - loadedAt, page: location.pathname
      })
    }).then(function (res) { return res.json(); }).then(function (body) {
      if (body && body.ok) {
        track('contact_submit', { method: 'mailer' });
        location.href = '/success' + (body.ref ? '?ref=' + encodeURIComponent(body.ref) : '');
        return;
      }
      // Only email/phone corrections are shown to the visitor; any other reply (including an older
      // mailer version that does not know this form yet) goes to the Formspree fallback
      if (body && /^Please enter a valid (email|phone)/.test(body.error || '')) { reset(); show(body.error); return; }
      fallback();
    }).catch(fallback);
  });
})();
