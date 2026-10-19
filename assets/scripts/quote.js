(function () {
  var STORAGE_KEY = 'excel_quote_items';
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbyUcYOQ19D-8qSJM_knXg0vQFBlaXRJ1JBJrDECC-cOCs4vckg5ToXzYj3nu3XC5Oo0/exec';
  var MAX_ITEMS = 30;
  var MAX_FILES = 3;
  var MAX_FILE_BYTES = 3 * 1024 * 1024;

  var MATERIALS = ['Steel - Zinc Plated', 'Steel - Plain', 'SS 301 - A1', 'SS 304 - A2/70', 'SS 316 - A4/70', 'SS 316L - A4/80', 'Spring Steel', 'Brass', 'Aluminium', 'Nylon 6/6', 'Titanium Grade 2', 'Titanium Grade 5', 'Other'];
  var STANDARDS = ['DIN', 'ISO', 'ASME', 'ASTM', 'BSF', 'BSW', 'IS', 'Other / Not sure'];
  var DIAS = ['M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M14', 'M16', 'M18', 'M20', 'M22', 'M24', 'M27', 'M30', 'M36'];

  // Wire threaded inserts get their own type, material, thread and length fields
  var WTI_RE = /wire\s*thread(ed)?\s*insert|helical\s*(thread\s*)?insert|screw\s*thread\s*insert|heli-?\s?coil|thread\s*coil|\bSTI\b/i;
  var WTI_TYPES = ['Tanged', 'Tangless'];
  var WTI_MATERIALS = ['SS 304', 'Nitronic 60', 'Other'];
  var WTI_LENS = ['1D', '1.5D', '2D', '2.5D', '3D'];
  var WTI_SIZES = {
    Metric: 'M2 x 0.4|M2.2 x 0.45|M2.5 x 0.45|M3 x 0.5|M3.5 x 0.6|M4 x 0.7|M5 x 0.8|M6 x 1.0|M7 x 1.0|M8 x 1.25|M8 x 1.0|M9 x 1.5|M9 x 1.25|M10 x 1.5|M10 x 1.25|M10 x 1.0|M11 x 1.5|M11 x 1.25|M12 x 1.75|M12 x 1.5|M12 x 1.25|M12 x 1.0|M14 x 2.0|M14 x 1.5|M14 x 1.25|M14 x 1.0|M16 x 2.0|M16 x 1.5|M18 x 2.5|M18 x 2.0|M18 x 1.5|M20 x 2.5|M20 x 2.0|M20 x 1.5|M22 x 2.5|M22 x 2.0|M22 x 1.5|M24 x 3.0|M24 x 2.0|M24 x 1.5|M26 x 1.5|M27 x 3.0|M27 x 2.0|M27 x 1.5|M28 x 1.5|M30 x 3.5|M30 x 2.0|M30 x 1.5|M33 x 3.5|M33 x 2.0|M36 x 4.0|M36 x 3.0|M36 x 2.0|M36 x 1.5|M39 x 4.0|M39 x 3.0|M40 x 3.0|M42 x 4.5|M42 x 3.0|M45 x 4.5|M45 x 3.0|M48 x 5.0|M48 x 4.0|M48 x 3.0|M50 x 3.0|M52 x 5.0|M52 x 3.0',
    UNC: 'No. 2 x 56|No. 4 x 40|No. 5 x 40|No. 6 x 32|No. 8 x 32|No. 10 x 24|No. 12 x 24|1/4 x 20|5/16 x 18|3/8 x 16|7/16 x 14|1/2 x 13|9/16 x 12|5/8 x 11|3/4 x 10|7/8 x 9|1 x 8|1-1/8 x 7|1-1/4 x 7|1-3/8 x 6|1-1/2 x 6',
    UNF: 'No. 4 x 48|No. 6 x 40|No. 8 x 36|No. 10 x 32|1/4 x 28|5/16 x 24|3/8 x 24|7/16 x 20|1/2 x 20|9/16 x 18|5/8 x 18|3/4 x 16|7/8 x 14|1 x 12|1 x 14|1-1/8 x 12|1-1/4 x 12|1-3/8 x 12|1-1/2 x 12',
    BSP: '1/8 x 28|1/4 x 19|3/8 x 19|1/2 x 14|5/8 x 14|3/4 x 14|7/8 x 14|1 x 11',
    BSW: '1/8 x 40|3/16 x 24|1/4 x 20|5/16 x 18|3/8 x 16|7/16 x 14|1/2 x 12|9/16 x 12|5/8 x 11|3/4 x 10|7/8 x 9|1 x 8',
    BSF: '3/16 x 32|1/4 x 26|5/16 x 22|3/8 x 20|7/16 x 18|1/2 x 16|9/16 x 16|5/8 x 14|3/4 x 12|7/8 x 11|1 x 10'
  };
  Object.keys(WTI_SIZES).forEach(function (k) { WTI_SIZES[k] = WTI_SIZES[k].split('|'); });
  // BSP inserts, and metric inserts above M24, come in 1.5D only
  function wtiLens(sys, size) {
    var m = /^\s*M\s*(\d+(?:\.\d+)?)/i.exec(size || '');
    return sys === 'BSP' || (sys === 'Metric' && m && parseFloat(m[1]) > 24) ? ['1.5D'] : WTI_LENS;
  }
  var WTI_EXAMPLE = { Metric: 'M8 x 1.25', UNC: '1/4 x 20', UNF: '1/4 x 28', BSP: '1/4 x 19', BSW: '1/4 x 20', BSF: '1/4 x 26' };
  function itemLabel(it) { return it.name + (it.wtiType && it.name.toLowerCase().indexOf(it.wtiType.toLowerCase()) < 0 ? ' - ' + it.wtiType : ''); }

  var items = [];
  var openedAt = 0;
  var modal = null;
  var step = 'items';
  var editing = null;

  try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { items = []; }
  if (!Array.isArray(items)) items = [];

  // Buyer details typed on the send step are kept so Back, closing the modal or changing page does not wipe them
  var BUYER_KEY = 'excel_quote_buyer';
  var BUYER_FIELDS = ['q-buyer-name', 'q-company', 'q-phone', 'q-email', 'q-city', 'q-pin', 'q-gstin', 'q-notes'];
  var buyer = {};
  var savedFiles = [];
  try { buyer = JSON.parse(sessionStorage.getItem(BUYER_KEY) || '{}') || {}; } catch (e) { buyer = {}; }
  function saveBuyer() { try { sessionStorage.setItem(BUYER_KEY, JSON.stringify(buyer)); } catch (e) {} }

  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {} updateBadge(); }
  function track(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function updateBadge() {
    document.querySelectorAll('[data-quote-badge]').forEach(function (b) {
      b.textContent = items.length;
      b.style.display = items.length ? 'inline-flex' : 'none';
    });
  }

  function options(list) { return list.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join(''); }

  var inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-roboto text-gray-800 focus:outline-none focus:border-[#00396F]';
  var labelCls = 'block text-xs font-poppins font-semibold text-gray-500 uppercase tracking-wider mb-1';

  function compileMessage() {
    var lines = ['Quote request - ' + items.length + (items.length === 1 ? ' item' : ' items'), ''];
    items.forEach(function (it, i) {
      lines.push((i + 1) + '. ' + itemLabel(it) + (it.size ? ' | Size: ' + it.size : '') + ' | Material: ' + (it.material || '-') + ' | Standard: ' + (it.standard || '-') + ' | Qty: ' + it.qty);
    });
    return lines.join('\n');
  }

  function build() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'quote-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Request a quote');
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.55);display:none;align-items:flex-start;justify-content:center;overflow-y:auto;padding:16px;';
    modal.innerHTML = '<div id="quote-panel" class="bg-white rounded-xl w-full max-w-2xl my-4 overflow-hidden" style="box-shadow:0 10px 40px rgba(0,0,0,0.3);"></div>';
    document.body.appendChild(modal);
    modal.addEventListener('mousedown', function (e) { if (e.target === modal && step !== 'send') close(); });
    document.addEventListener('keydown', function (e) {
      if (modal.style.display !== 'flex') return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // Keep keyboard focus inside the dialog
      var f = Array.prototype.filter.call(modal.querySelectorAll('button, input, select, textarea, a[href]'), function (el) { return el.tabIndex >= 0 && !el.disabled && el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function header(title, sub) {
    return '<div class="bg-[#00396F] text-white px-6 py-4 flex items-start justify-between gap-4">' +
      '<div><h2 class="text-lg font-outfit font-semibold">' + title + '</h2><p class="text-xs font-roboto text-gray-200 mt-1">' + sub + '</p></div>' +
      '<button type="button" id="quote-close" aria-label="Close" class="text-white text-2xl leading-none px-2">&times;</button></div>';
  }

  function itemsView() {
    var list = items.length
      ? items.map(function (it, i) {
          return '<div class="flex items-start justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">' +
            '<div class="text-sm font-roboto text-gray-800"><p class="font-semibold text-[#00396F]">' + (i + 1) + '. ' + esc(itemLabel(it)) + '</p>' +
            '<p class="text-xs text-gray-500 mt-1">' + [it.size, it.material, it.standard, 'Qty: ' + it.qty].filter(Boolean).map(esc).join(' &nbsp;&middot;&nbsp; ') + '</p></div>' +
            '<div class="flex gap-3 flex-shrink-0 text-xs font-roboto">' +
            '<button type="button" data-edit="' + i + '" class="text-[#00396F] underline">Edit</button>' +
            '<button type="button" data-remove="' + i + '" class="text-red-600 underline">Remove</button></div></div>';
        }).join('')
      : '<p class="text-sm font-roboto text-gray-500">No items yet. Add your first item above.</p>';

    return header('Request a Quote', 'Add the items you need. We reply within one business day.') +
      '<div class="p-6">' +
      '<form id="quote-item-form" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" novalidate>' +
        '<div class="md:col-span-2"><label class="' + labelCls + '" for="q-standard">Specified standard (optional)</label>' +
          '<div class="flex gap-2"><select id="q-standard" class="' + inputCls + '" style="max-width:11rem"><option value="">Select</option>' + options(STANDARDS) + '</select>' +
          '<input id="q-standard-no" list="q-standard-list" class="' + inputCls + '" placeholder="No. e.g. 931" maxlength="30" autocomplete="off">' +
          '<datalist id="q-standard-list"></datalist></div>' +
          '<p class="text-xs font-roboto text-gray-500 mt-1">Choose a DIN or ISO number and the item name is filled in for you.</p></div>' +
        '<div class="md:col-span-2"><label class="' + labelCls + '" for="q-name">Item name *</label>' +
          '<input id="q-name" aria-required="true" list="q-name-list" class="' + inputCls + '" placeholder="e.g. Hex Flange Bolt" maxlength="100" autocomplete="off">' +
          '<datalist id="q-name-list"></datalist></div>' +
        '<div id="q-wti-type-wrap" style="display:none"><label class="' + labelCls + '" for="q-wti-type">Insert type *</label>' +
          '<select id="q-wti-type" class="' + inputCls + '"><option value="">Select type</option>' + options(WTI_TYPES) + '</select></div>' +
        '<div><label class="' + labelCls + '" for="q-material">Material</label>' +
          '<select id="q-material" class="' + inputCls + '"><option value="">Select material</option>' + options(MATERIALS) + '</select>' +
          '<input id="q-material-other" class="' + inputCls + ' mt-2" style="display:none" placeholder="Specify material" maxlength="60"></div>' +
        '<div id="q-size-wrap"><label id="q-size-label" class="' + labelCls + '" for="q-dia">Size</label>' +
          '<div id="q-size-std" class="flex gap-2"><input id="q-dia" list="q-dia-list" class="' + inputCls + '" placeholder="Dia e.g. M8" maxlength="15" autocomplete="off">' +
          '<datalist id="q-dia-list">' + options(DIAS) + '</datalist>' +
          '<input id="q-len" class="' + inputCls + '" placeholder="Length (mm)" maxlength="8" inputmode="decimal" autocomplete="off"></div>' +
          '<div id="q-size-wti" class="flex gap-2" style="display:none">' +
            '<select id="q-wti-thread" aria-label="Thread" class="' + inputCls + '" style="max-width:7rem">' + options(Object.keys(WTI_SIZES)) + '</select>' +
            '<input id="q-wti-size" aria-label="Thread size" list="q-wti-size-list" class="' + inputCls + '" maxlength="20" autocomplete="off">' +
            '<datalist id="q-wti-size-list"></datalist>' +
            '<select id="q-wti-len" aria-label="Insert length" class="' + inputCls + '" style="max-width:6.5rem"></select></div></div>' +
        '<div><label class="' + labelCls + '" for="q-qty">Quantity (pcs) *</label>' +
          '<input id="q-qty" aria-required="true" type="number" min="1" step="1" class="' + inputCls + '" placeholder="e.g. 5000"></div>' +
        '<div class="flex items-end gap-3"><button type="submit" id="q-add" class="w-full bg-orange-500 text-white py-2 px-6 rounded-full font-roboto text-sm hover:bg-orange-600 transition duration-200">' + (editing === null ? 'Add item' : 'Save item') + '</button>' +
          (editing === null ? '' : '<button type="button" id="q-cancel-edit" class="text-sm font-roboto text-gray-500 underline py-2">Cancel</button>') + '</div>' +
        '<p id="q-item-error" role="alert" class="md:col-span-2 text-sm text-red-600 font-roboto" style="display:none"></p>' +
      '</form>' +
      '<h3 class="text-sm font-outfit font-semibold text-[#00396F] mb-3">Your items (' + items.length + ')</h3>' +
      '<div class="space-y-2 mb-6">' + list + '</div>' +
      '<div class="flex flex-col-reverse sm:flex-row justify-between gap-3">' +
        '<button type="button" id="q-clear" class="text-sm font-roboto text-gray-500 underline"' + (items.length ? '' : ' style="visibility:hidden"') + '>Clear all</button>' +
        '<button type="button" id="q-continue" class="bg-[#00396F] text-white py-2 px-8 rounded-full font-roboto text-sm hover:bg-[#002D62] transition duration-200">Review &amp; Send</button>' +
      '</div></div>';
  }

  function sendView() {
    return header('Review &amp; Send', 'Check your message and tell us where to send the quote.') +
      '<form id="quote-send-form" class="p-6" novalidate>' +
      '<h3 class="text-sm font-outfit font-semibold text-[#00396F] mb-2">Your message</h3>' +
      '<pre class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-roboto text-gray-700 whitespace-pre-wrap mb-6" style="max-height:11rem;overflow:auto">' + esc(compileMessage()) + '</pre>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
        '<div><label class="' + labelCls + '" for="q-buyer-name">Your name *</label><input id="q-buyer-name" aria-required="true" class="' + inputCls + '" maxlength="100" autocomplete="name"></div>' +
        '<div><label class="' + labelCls + '" for="q-company">Company *</label><input id="q-company" aria-required="true" class="' + inputCls + '" maxlength="150" autocomplete="organization"></div>' +
        '<div><label class="' + labelCls + '" for="q-phone">Phone *</label><input id="q-phone" aria-required="true" type="tel" class="' + inputCls + '" maxlength="30" autocomplete="tel"></div>' +
        '<div><label class="' + labelCls + '" for="q-email">Email *</label><input id="q-email" aria-required="true" type="email" class="' + inputCls + '" maxlength="150" autocomplete="email"></div>' +
        '<div><label class="' + labelCls + '" for="q-city">City *</label><input id="q-city" aria-required="true" class="' + inputCls + '" maxlength="80" autocomplete="address-level2"></div>' +
        '<div><label class="' + labelCls + '" for="q-pin">PIN code</label><input id="q-pin" class="' + inputCls + '" maxlength="12" inputmode="numeric" autocomplete="postal-code"></div>' +
        '<div class="md:col-span-2"><label class="' + labelCls + '" for="q-gstin">GSTIN (optional)</label><input id="q-gstin" class="' + inputCls + '" maxlength="20"></div>' +
        '<div class="md:col-span-2"><label class="' + labelCls + '" for="q-notes">Notes (optional)</label><textarea id="q-notes" rows="3" class="' + inputCls + '" maxlength="1500" placeholder="Finish, packaging, delivery date, drawing details..."></textarea></div>' +
        '<div class="md:col-span-2"><label class="' + labelCls + '" for="q-files">Attach drawing or sample photo (optional)</label>' +
          '<input id="q-files" type="file" multiple class="text-sm font-roboto" accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,.step,.stp,.xls,.xlsx,.csv,.doc,.docx,.zip">' +
          '<p class="text-xs font-roboto text-gray-500 mt-1">Up to 3 files, 3 MB in total.</p></div>' +
        '<div style="position:absolute;left:-9999px;" aria-hidden="true"><label>Website<input id="q-website" tabindex="-1" autocomplete="off"></label></div>' +
      '</div>' +
      '<p id="q-send-error" role="alert" class="text-sm text-red-600 font-roboto mt-4" style="display:none"></p>' +
      '<div class="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-6">' +
        '<button type="button" id="q-back" class="text-sm font-roboto text-[#00396F] underline">&larr; Back to items</button>' +
        '<button type="submit" id="q-send" class="bg-orange-500 text-white py-2 px-10 rounded-full font-roboto text-sm hover:bg-orange-600 transition duration-200">SEND</button>' +
      '</div></form>';
  }

  function doneView() {
    return header('Request sent', 'Thank you.') +
      '<div class="p-8 text-center"><p class="text-base font-outfit font-semibold text-[#00396F] mb-2">We have received your quote request.</p>' +
      '<p class="text-sm font-roboto text-gray-600 mb-6">Our team will reply on your email or phone within one business day (Mon-Sat, 10 AM to 6 PM). For urgent needs call <a class="underline text-[#00396F]" href="tel:+917204435253">+91 7204435253</a>.</p>' +
      '<button type="button" id="quote-close-done" class="bg-[#00396F] text-white py-2 px-8 rounded-full font-roboto text-sm">Close</button></div>';
  }

  function render() {
    build();
    var panel = document.getElementById('quote-panel');
    panel.innerHTML = step === 'items' ? itemsView() : step === 'send' ? sendView() : doneView();
    var closeBtn = document.getElementById('quote-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    var closeDone = document.getElementById('quote-close-done');
    if (closeDone) closeDone.addEventListener('click', close);
    if (step === 'items') wireItems();
    if (step === 'send') wireSend();
  }

  var productNames = null;
  function loadProductNames() {
    if (productNames) return Promise.resolve(productNames);
    return fetch('/assets/scripts/search-index.json').then(function (r) { return r.json(); }).then(function (d) {
      productNames = d.filter(function (e) { return e.url.indexOf('/single-products/') === 0; }).map(function (e) { return e.title; });
      return productNames;
    }).catch(function () { productNames = []; return productNames; });
  }

  // DIN / ISO numbers mapped to [item name, 1 if sized by diameter only (nuts, washers, rings)]
  var standards = null;
  function loadStandards() {
    if (standards) return Promise.resolve(standards);
    return fetch('/assets/data/fastener-standards.json').then(function (r) { return r.json(); }).then(function (d) { standards = d; return d; })
      .catch(function () { standards = {}; return standards; });
  }

  function wireItems() {
    var $ = function (id) { return document.getElementById(id); };
    loadProductNames().then(function (names) {
      var dl = $('q-name-list');
      if (dl) dl.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('');
    });
    $('q-material').addEventListener('change', function () { $('q-material-other').style.display = this.value === 'Other' ? 'block' : 'none'; });

    var lastAuto = '';
    function stdEntry() {
      var s = standards && standards[$('q-standard').value];
      return (s && s[$('q-standard-no').value.trim()]) || null;
    }
    function fillStdList() {
      var s = standards && standards[$('q-standard').value];
      $('q-standard-list').innerHTML = s ? Object.keys(s).map(function (k) { return '<option value="' + esc(k) + '">' + esc(s[k][0]) + '</option>'; }).join('') : '';
    }
    // Nuts and washers are sized by diameter alone, so the length box is hidden for them
    function syncSize() {
      var en = stdEntry(), n = $('q-name').value;
      var diaOnly = en ? !!en[1] : (/\b(nut|washer|circlip)s?\b/i.test(n) && !/\b(bolt|screw|stud|rod)s?\b/i.test(n));
      $('q-len').style.display = diaOnly ? 'none' : '';
      syncWti();
    }
    // Swaps in the insert type, insert materials and thread / length fields when the item is a wire threaded insert
    var wtiOn = null;
    function syncWti() {
      var en = stdEntry(), n = $('q-name').value;
      var on = WTI_RE.test(n) || !!(en && WTI_RE.test(en[0]));
      if (on !== wtiOn) {
        wtiOn = on;
        $('q-wti-type-wrap').style.display = on ? '' : 'none';
        $('q-size-std').style.display = on ? 'none' : '';
        $('q-size-wti').style.display = on ? '' : 'none';
        $('q-size-wrap').className = on ? 'md:col-span-2' : '';
        $('q-size-label').textContent = on ? 'Thread, size & length' : 'Size';
        $('q-size-label').setAttribute('for', on ? 'q-wti-thread' : 'q-dia');
        var mat = $('q-material'), cur = mat.value, list = on ? WTI_MATERIALS : MATERIALS;
        mat.innerHTML = '<option value="">Select material</option>' + options(list);
        mat.value = list.indexOf(cur) >= 0 ? cur : '';
        $('q-material-other').style.display = mat.value === 'Other' ? 'block' : 'none';
        if (on) fillWtiSizes();
      }
      if (on && !$('q-wti-type').value) {
        if (/\btangless\b/i.test(n)) $('q-wti-type').value = 'Tangless';
        else if (/\btanged\b/i.test(n)) $('q-wti-type').value = 'Tanged';
      }
    }
    function fillWtiSizes() {
      var sys = $('q-wti-thread').value;
      $('q-wti-size-list').innerHTML = options(WTI_SIZES[sys] || []);
      $('q-wti-size').placeholder = 'Size e.g. ' + (WTI_EXAMPLE[sys] || '');
      syncWtiLens();
    }
    function syncWtiLens() {
      var sel = $('q-wti-len'), cur = sel.value, lens = wtiLens($('q-wti-thread').value, $('q-wti-size').value);
      sel.innerHTML = '<option value="">Length</option>' + options(lens);
      sel.value = lens.indexOf(cur) >= 0 ? cur : (lens.length === 1 ? lens[0] : '');
    }
    $('q-wti-thread').addEventListener('change', function () { $('q-wti-size').value = ''; fillWtiSizes(); });
    $('q-wti-size').addEventListener('input', syncWtiLens);
    function applyStandard() {
      var en = stdEntry(), nm = $('q-name');
      if (en && (!nm.value.trim() || nm.value === lastAuto)) { nm.value = en[0]; lastAuto = en[0]; }
      syncSize();
    }
    $('q-standard').addEventListener('change', function () { fillStdList(); applyStandard(); });
    $('q-standard-no').addEventListener('input', applyStandard);
    $('q-name').addEventListener('input', syncSize);
    loadStandards().then(function () {
      if (!$('q-standard-list')) return;
      fillStdList();
      var en = stdEntry();
      if (en && $('q-name').value === en[0]) lastAuto = en[0];
      syncSize();
    });

    if (editing !== null && items[editing]) {
      var it = items[editing];
      $('q-name').value = it.name; $('q-qty').value = it.qtyNum || '';
      $('q-dia').value = it.dia || ''; $('q-len').value = it.len || '';
      if (it.materialSel) { $('q-material').value = it.materialSel; if (it.materialSel === 'Other') { $('q-material-other').style.display = 'block'; $('q-material-other').value = it.materialOther || ''; } }
      if (it.standardSel) $('q-standard').value = it.standardSel;
      $('q-standard-no').value = it.standardNo || '';
    } else if (prefill) {
      $('q-name').value = prefill;
    }
    syncSize();
    if (editing !== null && items[editing] && items[editing].wti) {
      var w = items[editing];
      // the insert material list only exists once syncSize has switched the form over
      $('q-material').value = w.materialSel || '';
      $('q-material-other').style.display = w.materialSel === 'Other' ? 'block' : 'none';
      $('q-wti-type').value = w.wtiType || '';
      $('q-wti-thread').value = w.wtiThread || 'Metric';
      fillWtiSizes();
      $('q-wti-size').value = w.wtiSize || '';
      syncWtiLens();
      $('q-wti-len').value = w.wtiLen || '';
    }

    function itemError(msg) { var err = $('q-item-error'); err.textContent = msg; err.style.display = 'block'; return false; }
    // Adds (or saves) the item in the form; returns false and shows why if it is incomplete
    function commitItem() {
      var name = $('q-name').value.trim();
      var qty = Number($('q-qty').value);
      if (!name) return itemError('Please enter the item name.');
      var wti = $('q-size-wti').style.display !== 'none';
      var wtiType = wti ? $('q-wti-type').value : '';
      if (wti && !wtiType) return itemError('Please choose the insert type: tanged or tangless.');
      if (!(qty > 0) || Math.floor(qty) !== qty) return itemError('Please enter the quantity as a whole number of pieces.');
      if (editing === null && items.length >= MAX_ITEMS) return itemError('You can add up to ' + MAX_ITEMS + ' items per request.');
      var matSel = $('q-material').value, matOther = $('q-material-other').value.trim();
      var stdSel = $('q-standard').value, stdNo = $('q-standard-no').value.trim();
      var material = matSel === 'Other' ? (matOther || 'Other') : matSel;
      var standard = stdSel ? (stdSel.indexOf('Other') === 0 ? (stdNo || 'Not specified') : (stdSel + (stdNo ? ' ' + stdNo : ''))) : (stdNo || '');
      var dia = $('q-dia').value.trim();
      var len = $('q-len').style.display === 'none' ? '' : $('q-len').value.trim();
      var size = [dia, len].filter(Boolean).join(' x ');
      var tSys = $('q-wti-thread').value, tSize = $('q-wti-size').value.trim(), tLen = $('q-wti-len').value;
      // e.g. "M8 x 1.25 - 1.5D" or "UNC 1/4 x 20 - 2D"
      if (wti) size = [tSize ? (tSys === 'Metric' ? '' : tSys + ' ') + tSize : (tLen ? tSys : ''), tLen].filter(Boolean).join(' - ');
      var item = { name: name, size: size, dia: wti ? '' : dia, len: wti ? '' : len, material: material, standard: standard, qty: qty + ' pcs', qtyNum: qty, materialSel: matSel, materialOther: matOther, standardSel: stdSel, standardNo: stdNo };
      if (wti) { item.wti = true; item.wtiType = wtiType; item.wtiThread = tSys; item.wtiSize = tSize; item.wtiLen = tLen; }
      if (editing !== null) { items[editing] = item; editing = null; } else { items.push(item); track('quote_item_add', { item_name: name, page_path: location.pathname }); }
      prefill = '';
      save();
      return true;
    }
    $('quote-item-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!commitItem()) return;
      render();
      var n = document.getElementById('q-standard'); if (n) n.focus();
    });
    document.querySelectorAll('[data-remove]').forEach(function (b) { b.addEventListener('click', function () { items.splice(parseInt(b.getAttribute('data-remove'), 10), 1); editing = null; save(); render(); }); });
    document.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { editing = parseInt(b.getAttribute('data-edit'), 10); render(); }); });
    var cancelEdit = $('q-cancel-edit'); if (cancelEdit) cancelEdit.addEventListener('click', function () { editing = null; render(); });
    var clr = $('q-clear'); if (clr) clr.addEventListener('click', function () { items = []; editing = null; save(); render(); });
    var cont = $('q-continue'); if (cont) cont.addEventListener('click', function () {
      // An item typed but not yet added goes into the request instead of being dropped
      var name = $('q-name').value.trim();
      var pending = editing !== null || $('q-qty').value.trim() !== '' || (name && name !== prefill);
      if (pending && !commitItem()) return;
      if (!items.length) { itemError('Please add at least one item first.'); return; }
      step = 'send'; render();
    });
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve({ name: file.name, data: String(r.result).split(',')[1] || '' }); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function wireSend() {
    var $ = function (id) { return document.getElementById(id); };
    $('q-back').addEventListener('click', function () { step = 'items'; render(); });
    BUYER_FIELDS.forEach(function (id) { if (buyer[id]) $(id).value = buyer[id]; });
    $('quote-send-form').addEventListener('input', function () {
      BUYER_FIELDS.forEach(function (id) { buyer[id] = $(id).value; });
      saveBuyer();
    });
    if (savedFiles.length) {
      try { var dt = new DataTransfer(); savedFiles.forEach(function (f) { dt.items.add(f); }); $('q-files').files = dt.files; } catch (e) {}
    }
    $('q-files').addEventListener('change', function () { savedFiles = Array.prototype.slice.call(this.files || []); });
    $('quote-send-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('q-send-error'); err.style.display = 'none';
      var fail = function (msg) { err.textContent = msg; err.style.display = 'block'; };
      var v = { name: $('q-buyer-name').value.trim(), company: $('q-company').value.trim(), phone: $('q-phone').value.trim(), email: $('q-email').value.trim(), city: $('q-city').value.trim() };
      if (!v.name || !v.company || !v.phone || !v.email || !v.city) return fail('Please fill in your name, company, phone, email and city.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return fail('Please enter a valid email address.');
      if (!/^[0-9+()\-\s]{7,20}$/.test(v.phone)) return fail('Please enter a valid phone number.');
      var files = Array.prototype.slice.call($('q-files').files || []);
      if (files.length > MAX_FILES) return fail('Please attach at most ' + MAX_FILES + ' files.');
      var total = files.reduce(function (s, f) { return s + f.size; }, 0);
      if (total > MAX_FILE_BYTES) return fail('Attachments are too large. Please keep them under 3 MB in total.');

      var btn = $('q-send'); btn.disabled = true; btn.textContent = 'Sending...'; btn.style.opacity = '0.7';
      Promise.all(files.map(readFile)).then(function (encoded) {
        return fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            // size travels inside the name so the deployed mailer shows it without a redeploy
            items: items.map(function (i) { return { name: itemLabel(i) + (i.size ? ' - Size: ' + i.size : ''), material: i.material, standard: i.standard, qty: i.qty }; }),
            name: v.name, company: v.company, phone: v.phone, email: v.email, city: v.city,
            pin: $('q-pin').value.trim(), gstin: $('q-gstin').value.trim(), notes: $('q-notes').value,
            files: encoded, website: $('q-website').value, openedMs: Date.now() - openedAt, page: location.pathname
          })
        });
      }).then(function (res) {
        return res.json().catch(function () { return { ok: false }; }).then(function (body) { return { status: res.status, body: body }; });
      }).then(function (r) {
        if (r.body && r.body.ok) {
          track('quote_submit', { items_count: items.length, page_path: location.pathname });
          items = []; editing = null; save(); buyer = {}; savedFiles = []; saveBuyer(); step = 'done'; render();
        } else {
          btn.disabled = false; btn.textContent = 'SEND'; btn.style.opacity = '1';
          var msg = (r.body && r.body.error) || 'We could not send your request just now.';
          var pin = $('q-pin').value.trim(), gstin = $('q-gstin').value.trim(), notes = $('q-notes').value.trim();
          var mailto = 'mailto:info@exceltrading.in?subject=' + encodeURIComponent('Quote request') + '&body=' + encodeURIComponent(compileMessage() +
            '\n\nName: ' + v.name + '\nCompany: ' + v.company + '\nPhone: ' + v.phone + '\nEmail: ' + v.email + '\nCity: ' + v.city + (pin ? ' - ' + pin : '') +
            (gstin ? '\nGSTIN: ' + gstin : '') + (notes ? '\n\nNotes:\n' + notes : ''));
          // "Please ..." replies are things the buyer can correct, so the email fallback is not offered for them
          err.innerHTML = esc(msg) + (msg.indexOf('Please') === 0 ? '' : ' You can also <a class="underline" href="' + esc(mailto) + '">send it from your email app</a>.');
          err.style.display = 'block';
        }
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'SEND'; btn.style.opacity = '1';
        fail('Something went wrong. Please check your connection or call us on +91 7204435253.');
      });
    });
  }

  var prefill = '';
  var opener = null;
  function open(name) {
    build();
    opener = document.activeElement;
    prefill = name || '';
    step = 'items'; editing = null;
    openedAt = Date.now();
    render();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    track('quote_open', { page_path: location.pathname });
    var n = document.getElementById(prefill ? 'q-material' : 'q-standard'); if (n) n.focus();
  }
  function close() {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (opener && opener.focus && document.contains(opener)) opener.focus();
    opener = null;
  }

  document.addEventListener('click', function (e) {
    var addBtn = e.target.closest('[data-quote-add]');
    if (addBtn) { e.preventDefault(); open(addBtn.getAttribute('data-quote-add')); return; }
    var openBtn = e.target.closest('[data-quote-open]');
    if (openBtn) { e.preventDefault(); open(''); }
  });

  function addProductButton() {
    if (location.pathname.indexOf('/single-products/') !== 0) return;
    var title = document.getElementById('product-title');
    if (!title) return;
    var cta = document.querySelector('main a[href*="contact-us"] button, section a[href*="contact-us"] button');
    if (!cta || document.querySelector('[data-quote-add]')) return;
    var anchor = cta.closest('a');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-quote-add', title.textContent.trim());
    btn.className = 'mt-4 ml-3 border-2 border-[#00396F] text-[#00396F] py-2 px-8 rounded-full font-roboto text-base hover:bg-[#00396F] hover:text-white transition duration-300 ease-in-out';
    btn.textContent = 'Add to Quote';
    // Keep the pair in one row so style.css can lay them out side by side on phones
    var row = document.createElement('div');
    row.className = 'product-cta-row';
    anchor.parentNode.insertBefore(row, anchor);
    row.appendChild(anchor);
    row.appendChild(btn);
  }

  function init() { addProductButton(); updateBadge(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  // navbar buttons arrive asynchronously, so refresh the badge once they exist
  var tries = 0;
  var timer = setInterval(function () { updateBadge(); if (++tries > 20 || document.querySelector('[data-quote-badge]')) clearInterval(timer); }, 250);
})();
