(function () {
  var STORAGE_KEY = 'excel_quote_items';
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbyUcYOQ19D-8qSJM_knXg0vQFBlaXRJ1JBJrDECC-cOCs4vckg5ToXzYj3nu3XC5Oo0/exec';
  var MAX_ITEMS = 30;
  var MAX_FILES = 3;
  var MAX_FILE_BYTES = 3 * 1024 * 1024;

  var MATERIALS = ['Steel - Zinc Plated', 'Steel - Plain', 'SS 301 - A1', 'SS 304 - A2/70', 'SS 316 - A4/70', 'SS 316L - A4/80', 'Spring Steel', 'Brass', 'Aluminium', 'Nylon 6/6', 'Titanium Grade 2', 'Titanium Grade 5', 'Other'];
  var MATERIAL_GROUPS = [
    ['Steel', ['Steel - Zinc Plated', 'Steel - Plain', 'Spring Steel']],
    ['Stainless steel', ['SS 301 - A1', 'SS 304 - A2/70', 'SS 316 - A4/70', 'SS 316L - A4/80']],
    ['Other metals', ['Brass', 'Aluminium', 'Titanium Grade 2', 'Titanium Grade 5']],
    ['Plastic', ['Nylon 6/6']]
  ];
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
  var lastAdded = -1;

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
  function $(id) { return document.getElementById(id); }

  function updateBadge() {
    document.querySelectorAll('[data-quote-badge]').forEach(function (b) {
      b.textContent = items.length;
      b.style.display = items.length ? 'inline-flex' : 'none';
    });
  }

  function options(list) { return list.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join(''); }
  // The general material list is shown in groups; shorter lists stay flat
  function materialOptions(list) {
    if (list !== MATERIALS) return options(list);
    return MATERIAL_GROUPS.map(function (g) { return '<optgroup label="' + esc(g[0]) + '">' + options(g[1]) + '</optgroup>'; }).join('') + options(['Other']);
  }

  function compileMessage() {
    var lines = ['Quote request - ' + items.length + (items.length === 1 ? ' item' : ' items'), ''];
    items.forEach(function (it, i) {
      lines.push((i + 1) + '. ' + itemLabel(it) + (it.size ? ' | Size: ' + it.size : '') + ' | Material: ' + (it.material || '-') + ' | Standard: ' + (it.standard || '-') + ' | Qty: ' + it.qty);
    });
    return lines.join('\n');
  }

  // ---------- Icons ----------
  function icon(path, size, extra) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + path + '</svg>';
  }
  var IC = {
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/>',
    clip: '<path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 7"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/>'
  };
  var CHEV = '<svg class="qdd-chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 8 10 13 15 8"/></svg>';
  var TICK = '<svg class="qdd-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 10.5 8 14.5 16 5.5"/></svg>';

  // ---------- Styles ----------
  var Q_CSS = `
#quote-modal{--navy:#00396F;--navy-d:#002D62;--orange:#F97316;--orange-d:#EA6A0A;--ink:#101828;--text:#344054;--muted:#667085;--line:#D0D5DD;--line-soft:#EAECF0;--bg-soft:#F9FAFB;--err:#D92D20;--err-bg:#FEF3F2;--ok:#12B76A;
position:fixed;inset:0;z-index:10000;display:none;align-items:flex-start;justify-content:center;overflow-y:auto;padding:32px 16px;background:rgba(9,20,38,.58);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);scroll-padding-top:150px;scroll-padding-bottom:110px;font-family:Roboto,system-ui,sans-serif;color:var(--text);animation:qf-fade .18s ease}
#quote-modal *{box-sizing:border-box}
.qf-panel{position:relative;width:100%;max-width:44rem;margin:auto;background:#fff;border-radius:20px;box-shadow:0 28px 70px rgba(9,20,38,.35);animation:qf-pop .24s cubic-bezier(.2,.8,.2,1)}
@keyframes qf-fade{from{opacity:0}to{opacity:1}}
@keyframes qf-pop{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
@keyframes qf-flash{0%{background:#FFF4E5;border-color:#FDBA74;transform:translateY(-4px);opacity:.4}60%{transform:none;opacity:1}100%{background:#fff;border-color:var(--line-soft)}}
@keyframes qf-spin{to{transform:rotate(360deg)}}
@keyframes qf-draw{to{stroke-dashoffset:0}}
@keyframes qf-ring{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}

.qf-head{position:sticky;top:0;z-index:25;background:#fff;border-radius:20px 20px 0 0;padding:22px 28px 16px;border-bottom:1px solid var(--line-soft)}
.qf-head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.qf-title{margin:0;font:600 22px/1.25 Outfit,Roboto,sans-serif;color:var(--navy);letter-spacing:-.01em}
.qf-sub{margin:4px 0 0;font-size:14px;line-height:1.45;color:var(--muted)}
.qf-x{flex-shrink:0;width:40px;height:40px;margin:-6px -8px 0 0;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:transparent;color:var(--muted);cursor:pointer;transition:background .15s,color .15s}
.qf-x:hover{background:var(--bg-soft);color:var(--ink)}
.qf-steps{display:flex;align-items:center;gap:10px;margin:18px 0 0;padding:0;list-style:none;font-size:13px;font-weight:500}
.qf-step{display:inline-flex;align-items:center;gap:8px;color:var(--muted);background:none;border:0;padding:0;font:inherit;font-weight:500}
.qf-step .dot{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:1.5px solid var(--line);background:#fff;color:var(--muted)}
.qf-step.is-active{color:var(--navy)}
.qf-step.is-active .dot{background:var(--navy);border-color:var(--navy);color:#fff}
.qf-step.is-done{color:var(--ok);cursor:pointer}
.qf-step.is-done .dot{background:var(--ok);border-color:var(--ok);color:#fff}
.qf-step-line{flex:1;max-width:56px;height:2px;border-radius:2px;background:var(--line-soft)}
.qf-step-line.is-done{background:var(--ok)}

.qf-body{padding:24px 28px 28px}
.qf-section{display:flex;align-items:center;gap:10px;margin:0 0 14px;font:600 15px/1.3 Outfit,Roboto,sans-serif;color:var(--ink)}
.qf-count{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;border-radius:999px;background:#EFF6FF;color:var(--navy);font:600 12px Roboto,sans-serif}
.qf-divider{height:1px;margin:26px 0;background:var(--line-soft);border:0}

.qf-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 16px}
.qf-span2{grid-column:1/-1}
.qf-field{min-width:0;scroll-margin-top:150px}
.qf-label{display:flex;align-items:center;gap:6px;margin:0 0 6px;font-size:13px;font-weight:600;color:var(--text)}
.qf-req{color:var(--orange-d);font-weight:700}
.qf-opt{margin-left:auto;font-size:12px;font-weight:500;color:var(--muted)}
.qf-help{margin:6px 0 0;font-size:12.5px;line-height:1.4;color:var(--muted)}
.qf-err{display:none;margin:6px 0 0;font-size:12.5px;line-height:1.4;font-weight:500;color:var(--err)}
.qf-field.has-error .qf-input,.qf-field.has-error .qdd-btn,.qf-field.has-error .qf-drop{border-color:var(--err)}
.qf-field.has-error .qf-input:focus,.qf-field.has-error .qdd-btn:focus{box-shadow:0 0 0 3px rgba(217,45,32,.15)}
.qf-row{display:flex;gap:10px}
.qf-row>*{min-width:0}
.qf-row>.qf-grow{flex:1 1 0}
.qf-mt{margin-top:10px}

.qf-input{display:block;width:100%;height:46px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:#fff;font:400 15px Roboto,system-ui,sans-serif;color:var(--ink);transition:border-color .15s,box-shadow .15s;-webkit-appearance:none;appearance:none}
textarea.qf-input{height:auto;min-height:96px;padding:12px 14px;line-height:1.5;resize:vertical}
.qf-input::placeholder{color:#8B94A3}
.qf-input:hover{border-color:#98A2B3}
.qf-input:focus{outline:none;border-color:var(--navy);box-shadow:0 0 0 3px rgba(0,57,111,.14)}
.qf-input[type=number]{-moz-appearance:textfield}
.qf-input[type=number]::-webkit-outer-spin-button,.qf-input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.qf-suffix-wrap{position:relative}
.qf-suffix-wrap .qf-input{padding-right:52px}
.qf-suffix{position:absolute;top:0;right:0;bottom:0;display:flex;align-items:center;padding:0 14px;font-size:13px;font-weight:500;color:var(--muted);pointer-events:none}

.qf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 24px;border:0;border-radius:999px;font:600 15px Roboto,system-ui,sans-serif;cursor:pointer;text-decoration:none;white-space:nowrap;transition:transform .08s,box-shadow .15s,background .15s,color .15s,border-color .15s}
.qf-btn:active{transform:scale(.98)}
.qf-btn:focus-visible,.qf-icon:focus-visible,.qf-x:focus-visible,.qf-link:focus-visible,.qf-step:focus-visible,.qdd-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(0,57,111,.28)}
.qf-btn-primary{background:var(--orange);color:#fff;box-shadow:0 6px 16px rgba(249,115,22,.28)}
.qf-btn-primary:hover{background:var(--orange-d);box-shadow:0 8px 20px rgba(249,115,22,.36)}
.qf-btn-navy{background:var(--navy);color:#fff}
.qf-btn-navy:hover{background:var(--navy-d)}
.qf-btn-ghost{background:#fff;color:var(--text);border:1px solid var(--line)}
.qf-btn-ghost:hover{background:var(--bg-soft);border-color:#98A2B3}
.qf-btn[disabled]{opacity:.65;cursor:not-allowed;box-shadow:none}
.qf-btn.is-loading{pointer-events:none}
.qf-spin{width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;animation:qf-spin .7s linear infinite}
.qf-link{background:none;border:0;padding:8px 4px;font:500 14px Roboto,sans-serif;color:var(--muted);cursor:pointer;border-radius:8px}
.qf-link:hover{color:var(--ink);text-decoration:underline}
.qf-link.danger:hover{color:var(--err)}
.qf-actions{display:flex;align-items:center;gap:12px;align-self:end}

.qf-editing{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px;padding:10px 14px;border:1px solid #FDDCAB;border-radius:10px;background:#FFFAEB;font-size:13.5px;font-weight:500;color:#93370D}
.qf-alert{display:none;align-items:flex-start;gap:10px;margin:16px 0 0;padding:12px 14px;border:1px solid #FDA29B;border-radius:10px;background:var(--err-bg);font-size:14px;line-height:1.45;color:#B42318}
.qf-alert svg{flex-shrink:0;margin-top:1px}
.qf-alert a{color:inherit;font-weight:600}

.qf-list{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.qf-item{display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid var(--line-soft);border-radius:14px;background:#fff;transition:box-shadow .15s,border-color .15s}
.qf-item:hover{border-color:var(--line);box-shadow:0 2px 10px rgba(16,24,40,.06)}
.qf-item.is-new{animation:qf-flash .9s ease}
.qf-item-n{flex-shrink:0;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#EFF6FF;color:var(--navy);font:600 13px Roboto,sans-serif}
.qf-item-main{flex:1;min-width:0}
.qf-item-name{margin:0;font:600 15px/1.35 Roboto,sans-serif;color:var(--ink);overflow-wrap:anywhere}
.qf-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.qf-chip{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;background:var(--bg-soft);border:1px solid var(--line-soft);font-size:12px;font-weight:500;color:var(--text)}
.qf-item-qty{flex-shrink:0;text-align:right;font:600 15px Roboto,sans-serif;color:var(--ink)}
.qf-item-qty small{display:block;font-size:11.5px;font-weight:500;color:var(--muted)}
.qf-item-actions{display:flex;gap:2px;flex-shrink:0}
.qf-icon{width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:10px;background:transparent;color:var(--muted);cursor:pointer;transition:background .15s,color .15s}
.qf-icon:hover{background:var(--bg-soft);color:var(--navy)}
.qf-icon.danger:hover{background:var(--err-bg);color:var(--err)}
.qf-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:26px 16px;border:1.5px dashed var(--line);border-radius:14px;background:var(--bg-soft);text-align:center;color:var(--muted);font-size:14px}
.qf-empty svg{color:#98A2B3}

.qf-foot{position:sticky;bottom:0;z-index:25;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 28px;padding-bottom:max(14px,env(safe-area-inset-bottom));background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-top:1px solid var(--line-soft);border-radius:0 0 20px 20px}

.qf-sum{margin:0;padding:0;list-style:none;border:1px solid var(--line-soft);border-radius:14px;overflow:hidden}
.qf-sum li{display:flex;justify-content:space-between;gap:14px;padding:12px 16px;font-size:14px;border-bottom:1px solid var(--line-soft)}
.qf-sum li:last-child{border-bottom:0}
.qf-sum strong{display:block;color:var(--ink);font-weight:600}
.qf-sum span{color:var(--muted);font-size:12.5px}
.qf-sum b{flex-shrink:0;font-weight:600;color:var(--ink);white-space:nowrap}
.qf-sum-head{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px}

.qf-file-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0)}
.qf-drop{display:flex;align-items:center;gap:14px;padding:16px;border:1.5px dashed var(--line);border-radius:12px;background:var(--bg-soft);cursor:pointer;transition:border-color .15s,background .15s}
.qf-drop:hover,.qf-file-input:focus-visible+.qf-drop{border-color:var(--navy);background:#F5F9FF}
.qf-file-input:focus-visible+.qf-drop{box-shadow:0 0 0 3px rgba(0,57,111,.18)}
.qf-drop svg{flex-shrink:0;color:var(--navy)}
.qf-drop strong{display:block;font-size:14px;color:var(--ink)}
.qf-drop span{font-size:12.5px;color:var(--muted)}
.qf-files{display:grid;gap:8px;margin:10px 0 0;padding:0;list-style:none}
.qf-files li{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 12px;border:1px solid var(--line-soft);border-radius:10px;font-size:13.5px;color:var(--ink)}
.qf-files li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qf-files li small{color:var(--muted);font-size:12px}
.qf-files .qf-icon{width:30px;height:30px}

.qf-done{padding:36px 28px 40px;text-align:center}
.qf-done-badge{width:84px;height:84px;margin:0 auto 20px;border-radius:50%;background:#ECFDF3;display:flex;align-items:center;justify-content:center;animation:qf-ring .4s cubic-bezier(.2,.8,.2,1)}
.qf-done-badge svg{stroke:var(--ok);stroke-width:2.6}
.qf-done-badge path{stroke-dasharray:30;stroke-dashoffset:30;animation:qf-draw .5s .25s ease forwards}
.qf-done h3{margin:0 0 8px;font:600 22px Outfit,Roboto,sans-serif;color:var(--ink)}
.qf-done p{margin:0 auto;max-width:30rem;font-size:15px;line-height:1.55;color:var(--muted)}
.qf-next{display:grid;gap:10px;margin:26px auto 0;max-width:26rem;padding:0;list-style:none;text-align:left}
.qf-next li{display:flex;gap:12px;align-items:flex-start;font-size:14px;color:var(--text)}
.qf-next .dot{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#EFF6FF;color:var(--navy);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}

/* dropdowns */
.qdd{position:relative;width:100%;min-width:0;font-family:Roboto,system-ui,sans-serif}
.qdd-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;height:46px;padding:0 14px;text-align:left;background:#fff;border:1px solid var(--line);border-radius:10px;font:400 15px Roboto,system-ui,sans-serif;color:var(--ink);cursor:pointer;transition:border-color .15s,box-shadow .15s}
.qdd-btn:hover{border-color:#98A2B3}
.qdd-btn:focus,.qdd-btn[aria-expanded=true]{outline:none;border-color:var(--navy);box-shadow:0 0 0 3px rgba(0,57,111,.14)}
.qdd-ph{color:#8B94A3}
.qdd-txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qdd-chev{flex-shrink:0;width:18px;height:18px;color:var(--muted);transition:transform .15s}
[aria-expanded=true]>.qdd-chev,[aria-expanded=true] .qdd-chev{transform:rotate(180deg)}
.qdd-menu{position:absolute;z-index:30;left:0;display:none;max-height:16rem;overflow-y:auto;overscroll-behavior:contain;background:#fff;border:1px solid var(--line-soft);border-radius:12px;box-shadow:0 16px 40px rgba(16,24,40,.18),0 2px 6px rgba(16,24,40,.06);padding:6px;font-size:14.5px}
.qdd-menu.open{display:block;animation:qf-fade .12s ease}
.qdd-group{padding:10px 10px 4px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#98A2B3}
.qdd-opt{display:flex;align-items:center;gap:12px;min-height:40px;padding:8px 10px;border-radius:8px;color:var(--ink);cursor:pointer;line-height:1.3}
.qdd-opt.active{background:#EFF6FF}
.qdd-opt[aria-selected=true]{color:var(--navy);font-weight:600}
.qdd-opt.qdd-clear{color:var(--muted);font-size:13.5px}
.qdd-main{min-width:0;flex:0 1 auto}
.qdd-sub{margin-left:auto;text-align:right;color:var(--muted);font-size:12.5px;font-weight:400}
.qdd-check{flex-shrink:0;width:16px;height:16px;color:var(--navy)}
.qdd-empty{padding:14px 12px;font-size:13.5px;line-height:1.45;color:var(--muted)}
.qdd-combo .qf-input{padding-right:42px}
.qdd-arrow{position:absolute;top:0;right:0;bottom:0;width:42px;display:flex;align-items:center;justify-content:center;background:none;border:0;border-radius:0 10px 10px 0;cursor:pointer;color:var(--muted)}
.qdd-arrow:hover .qdd-chev{color:var(--navy)}

@media (max-width:640px){
#quote-modal{padding:0;scroll-padding-top:130px}
.qf-panel{max-width:none;min-height:100%;border-radius:0;animation:qf-fade .2s ease}
.qf-head{border-radius:0;padding:18px 18px 14px}
.qf-title{font-size:20px}
.qf-body{padding:20px 18px 24px}
.qf-foot{border-radius:0;padding:12px 18px;padding-bottom:max(12px,env(safe-area-inset-bottom))}
.qf-grid{grid-template-columns:1fr}
.qf-input,.qdd-btn{font-size:16px}
.qf-btn{height:48px}
.qf-actions{align-self:stretch}
.qf-actions .qf-btn{flex:1}
.qf-item{padding:12px;gap:10px}
.qf-item-qty{font-size:14px}
.qf-opt{display:none}
.qdd-opt{min-height:44px;padding:10px;font-size:15.5px}
.qdd-menu{max-height:14rem}
#q-size-wti{flex-wrap:wrap}#q-size-wti>div{max-width:none!important}
#q-size-wti>div:nth-of-type(1){flex:0 0 36%}#q-size-wti>div:nth-of-type(2){flex:1 1 0}#q-size-wti>div:nth-of-type(3){flex:1 1 100%}
.qf-foot .qf-btn-primary{flex:1}
.qf-done{padding:30px 18px 36px}
}
@media (prefers-reduced-motion:reduce){#quote-modal,#quote-modal *{animation:none!important;transition:none!important}}
`;

  // ---------- Custom dropdowns (replace the browser's native select / datalist) ----------
  var openDd = null;
  function closeDd() { if (openDd) { var d = openDd; openDd = null; d(); } }
  // capture phase: runs before any handler can rebuild the menu under the pointer
  document.addEventListener('mousedown', function (e) { if (openDd && !(e.target.closest && e.target.closest('.qdd'))) closeDd(); }, true);

  // Opens the menu below the control, or above it when there is no room, keeping clear of the sticky header and footer
  function placeMenu(wrap, menu) {
    var panel = $('quote-panel');
    var pr = panel.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    var head = panel.querySelector('.qf-head'), foot = panel.querySelector('.qf-foot');
    var topLimit = Math.max(0, head ? head.getBoundingClientRect().bottom : 0) + 8;
    var botLimit = Math.min(window.innerHeight, foot ? foot.getBoundingClientRect().top : window.innerHeight) - 8;
    var w = Math.min(Math.max(wr.width, 240), pr.width - 24);
    menu.style.width = w + 'px';
    menu.style.left = Math.min(0, (pr.right - 12) - (wr.left + w)) + 'px';
    menu.style.top = ''; menu.style.bottom = ''; menu.style.maxHeight = '';
    var natural = Math.min(menu.scrollHeight + 14, 256);
    var below = botLimit - wr.bottom - 6, above = wr.top - topLimit - 6;
    if (below < Math.min(natural, 200) && above > below) {
      menu.style.maxHeight = Math.max(140, Math.min(natural, above)) + 'px';
      menu.style.bottom = 'calc(100% + 6px)';
    } else {
      menu.style.maxHeight = Math.max(140, Math.min(natural, below)) + 'px';
      menu.style.top = 'calc(100% + 6px)';
    }
  }

  function makeWrap(el, extraCls) {
    var wrap = document.createElement('div');
    wrap.className = 'qdd' + (extraCls ? ' ' + extraCls : '');
    if (el.style.maxWidth) wrap.style.maxWidth = el.style.maxWidth;
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    return wrap;
  }

  function optRow(label, sub, selected, extraCls) {
    var row = document.createElement('div');
    row.className = 'qdd-opt' + (extraCls ? ' ' + extraCls : '');
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', selected ? 'true' : 'false');
    var main = document.createElement('span'); main.className = 'qdd-main'; main.textContent = label; row.appendChild(main);
    if (sub) { var s = document.createElement('span'); s.className = 'qdd-sub'; s.textContent = sub; row.appendChild(s); }
    if (selected) row.insertAdjacentHTML('beforeend', TICK);
    return row;
  }

  function scrollRowIntoView(menu, el) {
    if (el.offsetTop < menu.scrollTop) menu.scrollTop = el.offsetTop - 6;
    else if (el.offsetTop + el.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = el.offsetTop + el.offsetHeight - menu.clientHeight + 6;
  }

  // A native <select> stays in the page as the source of truth (so .value and change events keep working); this draws the control
  function enhanceSelect(sel) {
    var wrap = makeWrap(sel);
    sel.style.display = 'none'; sel.tabIndex = -1;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.id = sel.id + '-btn'; btn.className = 'qdd-btn';
    btn.setAttribute('role', 'combobox'); btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="qdd-txt"></span>' + CHEV;
    var menu = document.createElement('div');
    menu.className = 'qdd-menu'; menu.id = sel.id + '-menu'; menu.setAttribute('role', 'listbox');
    btn.setAttribute('aria-controls', menu.id);
    wrap.appendChild(btn); wrap.appendChild(menu);
    document.querySelectorAll('label[for="' + sel.id + '"]').forEach(function (l) { l.setAttribute('for', btn.id); });
    var txt = btn.firstChild;

    function placeholder() { var f = sel.options[0]; return f && f.value === '' ? f.textContent : 'Select'; }
    function sync() {
      var o = sel.options[sel.selectedIndex];
      if (o && o.value !== '') { txt.textContent = o.textContent; txt.className = 'qdd-txt'; }
      else { txt.textContent = placeholder(); txt.className = 'qdd-txt qdd-ph'; }
    }
    var d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', { configurable: true, get: function () { return d.get.call(sel); }, set: function (v) { d.set.call(sel, v); sync(); } });
    new MutationObserver(sync).observe(sel, { childList: true, subtree: true });
    sel.addEventListener('change', sync);
    sync();

    var rows = [], active = -1, typed = '', typedAt = 0;
    function setActive(i, scroll) {
      if (!rows.length) return;
      active = (i + rows.length) % rows.length;
      rows.forEach(function (r, n) { r.el.classList.toggle('active', n === active); });
      btn.setAttribute('aria-activedescendant', rows[active].el.id);
      if (scroll !== false) scrollRowIntoView(menu, rows[active].el);
    }
    function pick(v) {
      closeDd();
      if (d.get.call(sel) !== v) { d.set.call(sel, v); sync(); sel.dispatchEvent(new Event('change', { bubbles: true })); }
      btn.focus();
    }
    function build() {
      menu.innerHTML = ''; rows = [];
      var cur = d.get.call(sel);
      var add = function (v, label, extra) {
        var row = optRow(label, '', v === cur && v !== '', extra);
        var rec = { el: row, v: v };
        row.id = sel.id + '-opt-' + rows.length;
        row.addEventListener('mousedown', function (e) { e.preventDefault(); pick(v); });
        row.addEventListener('mousemove', function () { var i = rows.indexOf(rec); if (i !== active) setActive(i, false); });
        rows.push(rec); menu.appendChild(row);
      };
      if (cur !== '' && sel.options[0] && sel.options[0].value === '') add('', 'Clear selection', 'qdd-clear');
      Array.prototype.forEach.call(sel.children, function (ch) {
        if (ch.tagName === 'OPTGROUP') {
          var g = document.createElement('div'); g.className = 'qdd-group'; g.textContent = ch.label; menu.appendChild(g);
          Array.prototype.forEach.call(ch.children, function (o) { add(o.value, o.textContent); });
        } else if (ch.tagName === 'OPTION' && ch.value !== '') add(ch.value, ch.textContent);
      });
    }
    function open() {
      closeDd();
      build();
      menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      placeMenu(wrap, menu);
      var sel0 = rows.findIndex(function (r) { return r.el.getAttribute('aria-selected') === 'true'; });
      var first = rows.findIndex(function (r) { return !r.el.classList.contains('qdd-clear'); });
      setActive(sel0 > -1 ? sel0 : Math.max(first, 0));
      openDd = function () { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.removeAttribute('aria-activedescendant'); };
    }
    btn.addEventListener('click', function () { if (menu.classList.contains('open')) closeDd(); else open(); });
    btn.addEventListener('keydown', function (e) {
      var isOpen = menu.classList.contains('open');
      if (e.key === 'Escape' && isOpen) { e.stopPropagation(); closeDd(); return; }
      if (e.key === 'Tab') { if (isOpen) closeDd(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen) open(); else setActive(active + (e.key === 'ArrowDown' ? 1 : -1)); return; }
      if (e.key === 'Home' && isOpen) { e.preventDefault(); setActive(0); return; }
      if (e.key === 'End' && isOpen) { e.preventDefault(); setActive(rows.length - 1); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isOpen) open(); else if (active > -1) pick(rows[active].v); return; }
      if (isOpen && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        var now = Date.now(); typed = (now - typedAt > 700 ? '' : typed) + e.key.toLowerCase(); typedAt = now;
        var from = typed.length === 1 ? active + 1 : active;
        for (var n = 0; n < rows.length; n++) { var r = rows[(from + n + rows.length) % rows.length]; if (r.el.textContent.toLowerCase().indexOf(typed) === 0) { setActive(rows.indexOf(r)); break; } }
      }
    });
  }

  // A text box with a suggestion list: clicking it or its arrow always shows the whole list, typing narrows it
  function enhanceCombo(inp) {
    var dl = $(inp.getAttribute('list'));
    inp.removeAttribute('list');
    var wrap = makeWrap(inp, 'qdd-combo');
    var arrow = document.createElement('button');
    arrow.type = 'button'; arrow.className = 'qdd-arrow'; arrow.tabIndex = -1; arrow.setAttribute('aria-label', 'Show all options'); arrow.innerHTML = CHEV;
    var menu = document.createElement('div');
    menu.className = 'qdd-menu'; menu.id = inp.id + '-menu'; menu.setAttribute('role', 'listbox');
    wrap.appendChild(arrow); wrap.appendChild(menu);
    inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'false'); inp.setAttribute('aria-controls', menu.id);

    var rows = [], active = -1, quiet = false;
    function all() { return dl ? Array.prototype.map.call(dl.options, function (o) { return { v: o.value, l: (o.textContent || '').trim() }; }) : []; }
    function setActive(i, scroll) {
      if (!rows.length) return;
      active = (i + rows.length) % rows.length;
      rows.forEach(function (r, n) { r.el.classList.toggle('active', n === active); });
      inp.setAttribute('aria-activedescendant', rows[active].el.id);
      if (scroll !== false) scrollRowIntoView(menu, rows[active].el);
    }
    // quiet stops the input event from re-opening a filtered list straight after a choice
    function pick(v) {
      quiet = true;
      inp.value = v;
      closeDd();
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      quiet = false;
      inp.focus();
    }
    function show(filter) {
      closeDd();
      var list = all(), q = (filter || '').trim().toLowerCase(), cur = inp.value.trim().toLowerCase();
      var shown = q ? list.filter(function (o) { return o.v.toLowerCase().indexOf(q) > -1 || o.l.toLowerCase().indexOf(q) > -1; }) : list;
      menu.innerHTML = ''; rows = [];
      shown.forEach(function (o) {
        var row = optRow(o.v, o.l && o.l.toLowerCase() !== o.v.toLowerCase() ? o.l : '', o.v.toLowerCase() === cur);
        var rec = { el: row, v: o.v };
        row.id = inp.id + '-opt-' + rows.length;
        row.addEventListener('mousedown', function (e) { e.preventDefault(); pick(o.v); });
        row.addEventListener('mousemove', function () { var i = rows.indexOf(rec); if (i !== active) setActive(i, false); });
        rows.push(rec); menu.appendChild(row);
      });
      if (!rows.length) {
        var e = document.createElement('div'); e.className = 'qdd-empty';
        e.textContent = !list.length
          ? (inp.id === 'q-standard-no' ? 'Choose a standard (DIN, ISO ...) first to see its numbers, or type one.' : 'No suggestions yet. You can type your own.')
          : 'No match in our list. What you type will be used as entered.';
        menu.appendChild(e);
      }
      menu.classList.add('open'); inp.setAttribute('aria-expanded', 'true');
      placeMenu(wrap, menu);
      var sel0 = rows.findIndex(function (r) { return r.el.getAttribute('aria-selected') === 'true'; });
      var start = q ? 0 : sel0;
      if (rows.length && start > -1) setActive(start);
      openDd = function () { menu.classList.remove('open'); inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); };
    }
    var isOpen = function () { return menu.classList.contains('open'); };
    // A click or tap in the box shows everything; only typing narrows the list
    inp.addEventListener('mousedown', function () { if (!isOpen()) setTimeout(function () { if (!isOpen()) show(''); }, 0); });
    inp.addEventListener('input', function () { if (!quiet) show(inp.value); });
    arrow.addEventListener('mousedown', function (e) { e.preventDefault(); });
    arrow.addEventListener('click', function () { if (isOpen()) closeDd(); else { show(''); inp.focus(); } });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); closeDd(); return; }
      if (e.key === 'Tab') { if (isOpen()) closeDd(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen()) show(''); else setActive(active + (e.key === 'ArrowDown' ? 1 : -1)); return; }
      if (e.key === 'Enter' && isOpen() && active > -1) { e.preventDefault(); pick(rows[active].v); }
    });
  }

  function enhanceForm() {
    ['q-standard', 'q-wti-type', 'q-material', 'q-wti-thread', 'q-wti-len'].forEach(function (id) { var s = $(id); if (s) enhanceSelect(s); });
    ['q-name', 'q-standard-no', 'q-dia', 'q-wti-size'].forEach(function (id) { var i = $(id); if (i) enhanceCombo(i); });
  }

  // ---------- Field errors ----------
  function setFieldError(id, msg) {
    var p = document.querySelector('[data-err-for="' + id + '"]');
    if (!p) return;
    p.textContent = msg; p.style.display = 'block';
    var f = p.closest('.qf-field'); if (f) f.classList.add('has-error');
    var el = $(id + '-btn') || $(id); if (el) el.setAttribute('aria-invalid', 'true');
  }
  function clearFieldError(field) {
    field.classList.remove('has-error');
    var p = field.querySelector('.qf-err'); if (p) { p.textContent = ''; p.style.display = 'none'; }
    field.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }
  function watchErrors(form) {
    var clear = function (e) { var f = e.target.closest && e.target.closest('.qf-field'); if (f && f.classList.contains('has-error')) clearFieldError(f); };
    form.addEventListener('input', clear); form.addEventListener('change', clear);
  }
  function focusField(id) { var el = $(id + '-btn') || $(id); if (el && el.focus) el.focus(); }
  function showAlert(id, msg, html) {
    var a = $(id); if (!a) return;
    a.querySelector('.qf-alert-text').innerHTML = html || esc(msg);
    a.style.display = 'flex';
  }
  function alertBox(id) { return '<div id="' + id + '" role="alert" class="qf-alert">' + icon(IC.alert, 18) + '<div class="qf-alert-text"></div></div>'; }

  function field(forId, label, control, o) {
    o = o || {};
    return '<div class="qf-field' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + (o.hidden ? ' style="display:none"' : '') + '>' +
      '<label class="qf-label"' + (o.labelId ? ' id="' + o.labelId + '"' : '') + ' for="' + forId + '">' + label + (o.req ? '<span class="qf-req" aria-hidden="true">*</span>' : '') + (o.optional ? '<span class="qf-opt">Optional</span>' : '') + '</label>' +
      control + (o.help ? '<p class="qf-help">' + o.help + '</p>' : '') + '<p class="qf-err" data-err-for="' + forId + '"></p></div>';
  }

  // ---------- Shell ----------
  function build() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'quote-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Request a quote');
    var st = document.createElement('style');
    st.id = 'qdd-style'; st.textContent = Q_CSS;
    document.head.appendChild(st);
    modal.innerHTML = '<div id="quote-panel" class="qf-panel"></div>';
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

  function head(active) {
    var title = active === 'done' ? 'Request sent' : active === 'send' ? 'Your details' : 'Request a Quote';
    var sub = active === 'done' ? 'Thank you.' : active === 'send' ? 'Tell us where to send the quote.' : 'Add what you need. We reply within one business day.';
    var steps = '';
    if (active !== 'done') {
      steps = '<ol class="qf-steps" aria-label="Progress">' +
        '<li>' + (active === 'send'
          ? '<button type="button" class="qf-step is-done" data-goto="items" aria-label="Back to items"><span class="dot">' + icon(IC.check, 14) + '</span>Items</button>'
          : '<span class="qf-step is-active" aria-current="step"><span class="dot">1</span>Items</span>') + '</li>' +
        '<li class="qf-step-line' + (active === 'send' ? ' is-done' : '') + '" aria-hidden="true"></li>' +
        '<li><span class="qf-step' + (active === 'send' ? ' is-active' : '') + '"' + (active === 'send' ? ' aria-current="step"' : '') + '><span class="dot">2</span>Your details</span></li></ol>';
    }
    return '<div class="qf-head"><div class="qf-head-row"><div><h2 class="qf-title">' + title + '</h2><p class="qf-sub">' + sub + '</p></div>' +
      '<button type="button" id="quote-close" class="qf-x" aria-label="Close">' + icon(IC.x, 22) + '</button></div>' + steps + '</div>';
  }

  function itemChips(it) {
    return [it.size ? 'Size ' + it.size : '', it.material, it.standard].filter(Boolean).map(function (c) { return '<span class="qf-chip">' + esc(c) + '</span>'; }).join('');
  }

  function itemsView() {
    var list = items.length
      ? '<ul class="qf-list">' + items.map(function (it, i) {
          return '<li class="qf-item' + (i === lastAdded ? ' is-new' : '') + '"><span class="qf-item-n">' + (i + 1) + '</span>' +
            '<div class="qf-item-main"><p class="qf-item-name">' + esc(itemLabel(it)) + '</p><div class="qf-chips">' + itemChips(it) + '</div></div>' +
            '<div class="qf-item-qty">' + esc(Number(it.qtyNum || parseInt(it.qty, 10) || 0).toLocaleString('en-IN')) + '<small>pcs</small></div>' +
            '<div class="qf-item-actions"><button type="button" class="qf-icon" data-edit="' + i + '" aria-label="Edit item ' + (i + 1) + '" title="Edit">' + icon(IC.pencil, 18) + '</button>' +
            '<button type="button" class="qf-icon danger" data-remove="' + i + '" aria-label="Remove item ' + (i + 1) + '" title="Remove">' + icon(IC.trash, 18) + '</button></div></li>';
        }).join('') + '</ul>'
      : '<div class="qf-empty">' + icon(IC.box, 32) + '<span>No items yet. Fill in the form above and press <b>Add item</b>.</span></div>';
    lastAdded = -1;

    var body =
      '<form id="quote-item-form" novalidate>' +
        '<h3 class="qf-section">' + (editing === null ? 'Add an item' : 'Edit item') + '</h3>' +
        (editing === null ? '' : '<div class="qf-editing"><span>Editing item ' + (editing + 1) + '</span><button type="button" id="q-cancel-edit" class="qf-link">Cancel</button></div>') +
        '<div class="qf-grid">' +
          field('q-standard', 'Standard', '<div class="qf-row"><select id="q-standard" class="qf-input" style="max-width:11rem"><option value="">Select</option>' + options(STANDARDS) + '</select>' +
            '<div class="qf-grow"><input id="q-standard-no" list="q-standard-list" class="qf-input" placeholder="Number, e.g. 931" maxlength="30" autocomplete="off"><datalist id="q-standard-list"></datalist></div></div>',
            { cls: 'qf-span2', optional: true, help: 'Choose a DIN or ISO number and we fill in the item name for you.' }) +
          field('q-name', 'Item name', '<input id="q-name" aria-required="true" list="q-name-list" class="qf-input" placeholder="e.g. Hex Flange Bolt" maxlength="100" autocomplete="off"><datalist id="q-name-list"></datalist>',
            { cls: 'qf-span2', req: true }) +
          field('q-wti-type', 'Insert type', '<select id="q-wti-type" class="qf-input"><option value="">Select type</option>' + options(WTI_TYPES) + '</select>', { id: 'q-wti-type-wrap', hidden: true, req: true }) +
          field('q-material', 'Material', '<select id="q-material" class="qf-input"><option value="">Select material</option>' + materialOptions(MATERIALS) + '</select>' +
            '<input id="q-material-other" class="qf-input qf-mt" style="display:none" placeholder="Specify material" maxlength="60">', { optional: true }) +
          field('q-dia', 'Size',
            '<div id="q-size-std" class="qf-row"><div class="qf-grow"><input id="q-dia" list="q-dia-list" class="qf-input" placeholder="Dia, e.g. M8" maxlength="15" autocomplete="off"><datalist id="q-dia-list">' + options(DIAS) + '</datalist></div>' +
              '<div class="qf-grow"><input id="q-len" class="qf-input" placeholder="Length (mm)" maxlength="8" inputmode="decimal" autocomplete="off"></div></div>' +
            '<div id="q-size-wti" class="qf-row" style="display:none">' +
              '<select id="q-wti-thread" aria-label="Thread" class="qf-input" style="max-width:7.5rem">' + options(Object.keys(WTI_SIZES)) + '</select>' +
              '<input id="q-wti-size" aria-label="Thread size" list="q-wti-size-list" class="qf-input" maxlength="20" autocomplete="off"><datalist id="q-wti-size-list"></datalist>' +
              '<select id="q-wti-len" aria-label="Insert length" class="qf-input" style="max-width:7rem"></select></div>',
            { id: 'q-size-wrap', labelId: 'q-size-label', optional: true }) +
          field('q-qty', 'Quantity', '<div class="qf-suffix-wrap"><input id="q-qty" aria-required="true" type="number" min="1" step="1" inputmode="numeric" class="qf-input" placeholder="e.g. 5000"><span class="qf-suffix">pcs</span></div>', { req: true }) +
          '<div class="qf-actions"><button type="submit" id="q-add" class="qf-btn qf-btn-navy">' + (editing === null ? 'Add item' : 'Save changes') + '</button></div>' +
        '</div>' +
        alertBox('q-item-error') +
      '</form>' +
      '<hr class="qf-divider">' +
      '<h3 class="qf-section">Your items <span class="qf-count">' + items.length + '</span></h3>' + list;

    var foot = '<div class="qf-foot"><button type="button" id="q-clear" class="qf-link danger"' + (items.length ? '' : ' style="visibility:hidden"') + '>Clear all</button>' +
      '<button type="button" id="q-continue" class="qf-btn qf-btn-primary">Review &amp; Send' + icon(IC.right, 18) + '</button></div>';
    return head('items') + '<div class="qf-body">' + body + '</div>' + foot;
  }

  function summaryList() {
    return '<ul class="qf-sum">' + items.map(function (it, i) {
      var meta = [it.size ? 'Size ' + it.size : '', it.material, it.standard].filter(Boolean).join('  ·  ');
      return '<li><div><strong>' + (i + 1) + '. ' + esc(itemLabel(it)) + '</strong>' + (meta ? '<span>' + esc(meta) + '</span>' : '') + '</div><b>' + esc(Number(it.qtyNum || parseInt(it.qty, 10) || 0).toLocaleString('en-IN')) + ' pcs</b></li>';
    }).join('') + '</ul>';
  }

  function sendView() {
    var text = function (id, label, o) {
      o = o || {};
      return field(id, label, '<input id="' + id + '"' + (o.req ? ' aria-required="true"' : '') + ' type="' + (o.type || 'text') + '" class="qf-input" maxlength="' + (o.max || 100) + '"' +
        (o.auto ? ' autocomplete="' + o.auto + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + (o.ph ? ' placeholder="' + o.ph + '"' : '') + '>', { req: o.req, optional: o.optional, cls: o.cls });
    };
    var body =
      '<form id="quote-send-form" novalidate>' +
        '<div class="qf-sum-head"><h3 class="qf-section" style="margin:0">Your request <span class="qf-count">' + items.length + '</span></h3><button type="button" id="q-edit-items" class="qf-link">Edit items</button></div>' +
        summaryList() +
        '<hr class="qf-divider">' +
        '<h3 class="qf-section">Contact details</h3>' +
        '<div class="qf-grid">' +
          text('q-buyer-name', 'Your name', { req: true, auto: 'name' }) +
          text('q-company', 'Company', { req: true, max: 150, auto: 'organization' }) +
          text('q-phone', 'Phone', { req: true, type: 'tel', max: 30, auto: 'tel', ph: '+91 98765 43210' }) +
          text('q-email', 'Email', { req: true, type: 'email', max: 150, auto: 'email', ph: 'name@company.com' }) +
        '</div>' +
        '<hr class="qf-divider">' +
        '<h3 class="qf-section">Delivery location</h3>' +
        '<div class="qf-grid">' +
          text('q-city', 'City', { req: true, max: 80, auto: 'address-level2' }) +
          text('q-pin', 'PIN code', { optional: true, max: 12, inputmode: 'numeric', auto: 'postal-code' }) +
        '</div>' +
        '<hr class="qf-divider">' +
        '<h3 class="qf-section">Anything else?</h3>' +
        '<div class="qf-grid">' +
          field('q-gstin', 'GSTIN', '<input id="q-gstin" class="qf-input" maxlength="20" autocapitalize="characters">', { cls: 'qf-span2', optional: true }) +
          field('q-notes', 'Notes', '<textarea id="q-notes" rows="3" class="qf-input" maxlength="1500" placeholder="Finish, packaging, delivery date, drawing details..."></textarea>', { cls: 'qf-span2', optional: true }) +
          field('q-files', 'Drawing or sample photo',
            '<input id="q-files" type="file" multiple class="qf-file-input" accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,.step,.stp,.xls,.xlsx,.csv,.doc,.docx,.zip">' +
            '<label class="qf-drop" for="q-files">' + icon(IC.clip, 24) + '<div><strong>Attach files</strong><span>PDF, DWG, DXF, STEP, images, Excel. Up to 3 files, 3 MB in total.</span></div></label>' +
            '<ul id="q-file-list" class="qf-files"></ul>', { cls: 'qf-span2', optional: true }) +
        '</div>' +
        '<div style="position:absolute;left:-9999px;" aria-hidden="true"><label>Website<input id="q-website" tabindex="-1" autocomplete="off"></label></div>' +
        alertBox('q-send-error') +
      '</form>';
    var foot = '<div class="qf-foot"><button type="button" id="q-back" class="qf-btn qf-btn-ghost">' + icon(IC.left, 18) + 'Back</button>' +
      '<button type="submit" form="quote-send-form" id="q-send" class="qf-btn qf-btn-primary"><span class="qf-btn-label">Send request</span></button></div>';
    return head('send') + '<div class="qf-body">' + body + '</div>' + foot;
  }

  function doneView() {
    return head('done') +
      '<div class="qf-done"><div class="qf-done-badge"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<h3>We have received your request</h3>' +
      '<p>Thank you. Our team will reply by email or phone within one business day (Mon-Sat, 10 AM to 6 PM).</p>' +
      '<ol class="qf-next"><li><span class="dot">1</span><span>We check your items and sizes.</span></li><li><span class="dot">2</span><span>We send you a quote, usually within one business day.</span></li><li><span class="dot">3</span><span>Need it sooner? Call <a href="tel:+917204435253" style="color:var(--navy);font-weight:600">+91 7204435253</a>.</span></li></ol></div>' +
      '<div class="qf-foot" style="justify-content:center"><button type="button" id="quote-close-done" class="qf-btn qf-btn-navy">Close</button></div>';
  }

  function render() {
    build();
    var panel = $('quote-panel');
    closeDd();
    panel.innerHTML = step === 'items' ? itemsView() : step === 'send' ? sendView() : doneView();
    var closeBtn = $('quote-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    var closeDone = $('quote-close-done');
    if (closeDone) closeDone.addEventListener('click', close);
    var goto = panel.querySelector('[data-goto="items"]');
    if (goto) goto.addEventListener('click', function () { step = 'items'; render(); });
    if (step === 'items') { enhanceForm(); wireItems(); }
    if (step === 'send') wireSend();
  }

  var productNames = null;
  function loadProductNames() {
    if (productNames) return Promise.resolve(productNames);
    return fetch('/assets/data/site-index.json').then(function (r) { return r.json(); }).then(function (d) {
      productNames = (d.docs || []).filter(function (e) { return e.y === 'Product'; }).map(function (e) { return e.t; });
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
    watchErrors($('quote-item-form'));
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
      $('q-len').parentNode.style.display = diaOnly ? 'none' : '';
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
        $('q-size-wrap').className = on ? 'qf-field qf-span2' : 'qf-field';
        $('q-size-label').firstChild.textContent = on ? 'Thread, size & length' : 'Size';
        $('q-size-label').setAttribute('for', on ? 'q-wti-thread-btn' : 'q-dia');
        var mat = $('q-material'), cur = mat.value, list = on ? WTI_MATERIALS : MATERIALS;
        mat.innerHTML = '<option value="">Select material</option>' + materialOptions(list);
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
      $('q-wti-size').placeholder = 'e.g. ' + (WTI_EXAMPLE[sys] || '');
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

    function itemError(id, msg) { setFieldError(id, msg); focusField(id); return false; }
    // Adds (or saves) the item in the form; returns false and shows why if it is incomplete
    function commitItem() {
      $('quote-item-form').querySelectorAll('.qf-field.has-error').forEach(clearFieldError);
      var name = $('q-name').value.trim();
      var qty = Number($('q-qty').value);
      var wti = $('q-size-wti').style.display !== 'none';
      var wtiType = wti ? $('q-wti-type').value : '';
      if (!name) return itemError('q-name', 'Enter the item name, for example Hex Flange Bolt.');
      if (wti && !wtiType) return itemError('q-wti-type', 'Choose tanged or tangless.');
      if (!(qty > 0) || Math.floor(qty) !== qty) return itemError('q-qty', 'Enter the quantity as a whole number of pieces.');
      if (editing === null && items.length >= MAX_ITEMS) { showAlert('q-item-error', 'You can add up to ' + MAX_ITEMS + ' items per request.'); return false; }
      var matSel = $('q-material').value, matOther = $('q-material-other').value.trim();
      var stdSel = $('q-standard').value, stdNo = $('q-standard-no').value.trim();
      var material = matSel === 'Other' ? (matOther || 'Other') : matSel;
      var standard = stdSel ? (stdSel.indexOf('Other') === 0 ? (stdNo || 'Not specified') : (stdSel + (stdNo ? ' ' + stdNo : ''))) : (stdNo || '');
      var dia = $('q-dia').value.trim();
      var len = $('q-len').parentNode.style.display === 'none' ? '' : $('q-len').value.trim();
      var size = [dia, len].filter(Boolean).join(' x ');
      var tSys = $('q-wti-thread').value, tSize = $('q-wti-size').value.trim(), tLen = $('q-wti-len').value;
      // e.g. "M8 x 1.25 - 1.5D" or "UNC 1/4 x 20 - 2D"
      if (wti) size = [tSize ? (tSys === 'Metric' ? '' : tSys + ' ') + tSize : (tLen ? tSys : ''), tLen].filter(Boolean).join(' - ');
      var item = { name: name, size: size, dia: wti ? '' : dia, len: wti ? '' : len, material: material, standard: standard, qty: qty + ' pcs', qtyNum: qty, materialSel: matSel, materialOther: matOther, standardSel: stdSel, standardNo: stdNo };
      if (wti) { item.wti = true; item.wtiType = wtiType; item.wtiThread = tSys; item.wtiSize = tSize; item.wtiLen = tLen; }
      if (editing !== null) { items[editing] = item; lastAdded = editing; editing = null; } else { items.push(item); lastAdded = items.length - 1; track('quote_item_add', { item_name: name, page_path: location.pathname }); }
      prefill = '';
      save();
      return true;
    }
    $('quote-item-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!commitItem()) return;
      render();
      var n = $('q-standard-btn'); if (n) n.focus();
    });
    document.querySelectorAll('[data-remove]').forEach(function (b) { b.addEventListener('click', function () { items.splice(parseInt(b.getAttribute('data-remove'), 10), 1); editing = null; save(); render(); }); });
    document.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { editing = parseInt(b.getAttribute('data-edit'), 10); render(); modal.scrollTop = 0; }); });
    var cancelEdit = $('q-cancel-edit'); if (cancelEdit) cancelEdit.addEventListener('click', function () { editing = null; render(); });
    var clr = $('q-clear'); if (clr) clr.addEventListener('click', function () { items = []; editing = null; save(); render(); });
    var cont = $('q-continue'); if (cont) cont.addEventListener('click', function () {
      // An item typed but not yet added goes into the request instead of being dropped
      var name = $('q-name').value.trim();
      var pending = editing !== null || $('q-qty').value.trim() !== '' || (name && name !== prefill);
      if (pending && !commitItem()) return;
      if (!items.length) { showAlert('q-item-error', 'Please add at least one item first.'); modal.scrollTop = 0; return; }
      step = 'send'; render(); modal.scrollTop = 0;
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
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  function wireSend() {
    var form = $('quote-send-form');
    watchErrors(form);
    $('q-back').addEventListener('click', function () { step = 'items'; render(); modal.scrollTop = 0; });
    $('q-edit-items').addEventListener('click', function () { step = 'items'; render(); modal.scrollTop = 0; });
    BUYER_FIELDS.forEach(function (id) { if (buyer[id]) $(id).value = buyer[id]; });
    form.addEventListener('input', function () {
      BUYER_FIELDS.forEach(function (id) { buyer[id] = $(id).value; });
      saveBuyer();
    });

    var fileInput = $('q-files');
    function renderFiles() {
      var files = Array.prototype.slice.call(fileInput.files || []);
      $('q-file-list').innerHTML = files.map(function (f, i) {
        return '<li>' + icon(IC.file, 18) + '<span>' + esc(f.name) + '</span><small>' + fmtSize(f.size) + '</small>' +
          '<button type="button" class="qf-icon danger" data-file-remove="' + i + '" aria-label="Remove ' + esc(f.name) + '" title="Remove">' + icon(IC.x, 16) + '</button></li>';
      }).join('');
      $('q-file-list').querySelectorAll('[data-file-remove]').forEach(function (b) {
        b.addEventListener('click', function () {
          var keep = Array.prototype.slice.call(fileInput.files).filter(function (f, i) { return i !== parseInt(b.getAttribute('data-file-remove'), 10); });
          try { var dt = new DataTransfer(); keep.forEach(function (f) { dt.items.add(f); }); fileInput.files = dt.files; } catch (e) { fileInput.value = ''; keep = []; }
          savedFiles = keep; renderFiles();
        });
      });
    }
    if (savedFiles.length) {
      try { var dt = new DataTransfer(); savedFiles.forEach(function (f) { dt.items.add(f); }); fileInput.files = dt.files; } catch (e) {}
      renderFiles();
    }
    fileInput.addEventListener('change', function () {
      savedFiles = Array.prototype.slice.call(this.files || []); renderFiles();
      var f = this.closest('.qf-field'); if (f) clearFieldError(f);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('q-send-error'); err.style.display = 'none';
      form.querySelectorAll('.qf-field.has-error').forEach(clearFieldError);
      var v = { name: $('q-buyer-name').value.trim(), company: $('q-company').value.trim(), phone: $('q-phone').value.trim(), email: $('q-email').value.trim(), city: $('q-city').value.trim() };
      var firstBad = '';
      var bad = function (id, msg) { setFieldError(id, msg); if (!firstBad) firstBad = id; };
      if (!v.name) bad('q-buyer-name', 'Please enter your name.');
      if (!v.company) bad('q-company', 'Please enter your company name.');
      if (!v.phone) bad('q-phone', 'Please enter your phone number.');
      else if (!/^[0-9+()\-\s]{7,20}$/.test(v.phone)) bad('q-phone', 'Enter a valid phone number, for example +91 98765 43210.');
      if (!v.email) bad('q-email', 'Please enter your email address.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) bad('q-email', 'Enter a valid email, for example name@company.com.');
      if (!v.city) bad('q-city', 'Please enter your city.');
      var files = Array.prototype.slice.call(fileInput.files || []);
      var total = files.reduce(function (s, f) { return s + f.size; }, 0);
      if (files.length > MAX_FILES) bad('q-files', 'Please attach at most ' + MAX_FILES + ' files.');
      else if (total > MAX_FILE_BYTES) bad('q-files', 'Attachments are too large. Please keep them under 3 MB in total.');
      if (firstBad) { focusField(firstBad); return; }

      var btn = $('q-send'), label = btn.querySelector('.qf-btn-label');
      btn.disabled = true; btn.classList.add('is-loading'); label.textContent = 'Sending...'; btn.insertAdjacentHTML('afterbegin', '<span class="qf-spin"></span>');
      var reset = function () { btn.disabled = false; btn.classList.remove('is-loading'); label.textContent = 'Send request'; var s = btn.querySelector('.qf-spin'); if (s) s.remove(); };
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
          items = []; editing = null; save(); buyer = {}; savedFiles = []; saveBuyer(); step = 'done'; render(); modal.scrollTop = 0;
        } else {
          reset();
          var msg = (r.body && r.body.error) || 'We could not send your request just now.';
          var pin = $('q-pin').value.trim(), gstin = $('q-gstin').value.trim(), notes = $('q-notes').value.trim();
          var mailto = 'mailto:info@exceltrading.in?subject=' + encodeURIComponent('Quote request') + '&body=' + encodeURIComponent(compileMessage() +
            '\n\nName: ' + v.name + '\nCompany: ' + v.company + '\nPhone: ' + v.phone + '\nEmail: ' + v.email + '\nCity: ' + v.city + (pin ? ' - ' + pin : '') +
            (gstin ? '\nGSTIN: ' + gstin : '') + (notes ? '\n\nNotes:\n' + notes : ''));
          // "Please ..." replies are things the buyer can correct, so the email fallback is not offered for them
          showAlert('q-send-error', '', esc(msg) + (msg.indexOf('Please') === 0 ? '' : ' You can also <a href="' + esc(mailto) + '">send it from your email app</a>.'));
          err.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }).catch(function () {
        reset();
        showAlert('q-send-error', 'Something went wrong. Please check your connection or call us on +91 7204435253.');
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
    modal.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    track('quote_open', { page_path: location.pathname });
    var n = $(prefill ? 'q-material-btn' : 'q-standard-btn'); if (n) n.focus({ preventScroll: true });
  }
  function close() {
    if (!modal) return;
    closeDd();
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
    var title = $('product-title');
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
