// Excel Trading - quote request mailer (Google Apps Script web app)
var TO = 'info@exceltrading.in';
var MAX_ITEMS = 30;
var MAX_FILES = 3;
var MAX_TOTAL_BYTES = 3 * 1024 * 1024;
var MIN_FILL_MS = 3000;
var MAX_PER_HOUR = 15;
var ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'dwg', 'dxf', 'step', 'stp', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'zip'];

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim().substring(0, max || 200);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function overLimit() {
  var cache = CacheService.getScriptCache();
  var key = 'hits_' + Math.floor(Date.now() / 3600000);
  var n = Number(cache.get(key) || 0);
  if (n >= MAX_PER_HOUR) return true;
  cache.put(key, String(n + 1), 4000);
  return false;
}

// The same buyer sending the exact same item list within 10 minutes counts as a repeat (double-click or spam).
// A different item list from the same buyer is a new request and is always sent.
// A submission is remembered only after its email has actually been sent.
function dupKey(email, phone, items) {
  var raw = email.toLowerCase() + '|' + phone.replace(/\D/g, '') + '|' + JSON.stringify(items);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw, Utilities.Charset.UTF_8);
  return 'dup_' + Utilities.base64Encode(digest);
}

function isRepeat(email, phone, items) {
  return !!CacheService.getScriptCache().get(dupKey(email, phone, items));
}

function markSent(email, phone, items) {
  CacheService.getScriptCache().put(dupKey(email, phone, items), '1', 600);
}

function doGet() {
  return out({ ok: true, status: 'Quote mailer is running' });
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Spam traps: hidden field must be empty and the form must have been open a few seconds
    if (data.website) return out({ ok: true });
    if (typeof data.openedMs !== 'number' || data.openedMs < MIN_FILL_MS) return out({ ok: true });

    var buyer = {
      name: clean(data.name, 100),
      company: clean(data.company, 150),
      phone: clean(data.phone, 30),
      email: clean(data.email, 150),
      city: clean(data.city, 80),
      pin: clean(data.pin, 12),
      gstin: clean(data.gstin, 20),
      notes: String(data.notes || '').replace(/\r/g, '').trim().substring(0, 1500),
      page: clean(data.page, 200)
    };
    if (!buyer.name || !buyer.company || !buyer.phone || !buyer.email || !buyer.city) {
      return out({ ok: false, error: 'Please fill in all required details.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) return out({ ok: false, error: 'Please enter a valid email address.' });
    if (!/^[0-9+()\-\s]{7,20}$/.test(buyer.phone)) return out({ ok: false, error: 'Please enter a valid phone number.' });

    var items = [];
    var rawItems = Array.isArray(data.items) ? data.items.slice(0, MAX_ITEMS) : [];
    for (var i = 0; i < rawItems.length; i++) {
      var it = {
        name: clean(rawItems[i].name, 150),
        material: clean(rawItems[i].material, 80),
        standard: clean(rawItems[i].standard, 80),
        qty: clean(rawItems[i].qty, 40)
      };
      if (it.name && it.qty) items.push(it);
    }
    if (!items.length) return out({ ok: false, error: 'Please add at least one item.' });

    if (isRepeat(buyer.email, buyer.phone, items)) return out({ ok: true });

    var blobs = [];
    var names = [];
    var total = 0;
    var rawFiles = Array.isArray(data.files) ? data.files.slice(0, MAX_FILES) : [];
    for (var f = 0; f < rawFiles.length; f++) {
      var filename = clean(rawFiles[f].name, 120).replace(/[^\w.\- ()]/g, '_');
      var ext = (filename.split('.').pop() || '').toLowerCase();
      if (ALLOWED_EXT.indexOf(ext) === -1) return out({ ok: false, error: 'File type .' + ext + ' is not allowed.' });
      var bytes = Utilities.base64Decode(String(rawFiles[f].data || ''));
      total += bytes.length;
      if (total > MAX_TOTAL_BYTES) return out({ ok: false, error: 'Attachments are too large (3 MB total).' });
      blobs.push(Utilities.newBlob(bytes, 'application/octet-stream', filename));
      names.push(filename);
    }

    if (overLimit()) return out({ ok: false, error: 'Too many requests right now. Please call or WhatsApp us on +91 7204435253.' });

    var subject = 'Quote Request - ' + items.length + (items.length === 1 ? ' item' : ' items') + ' - ' + buyer.company + ' (' + buyer.city + ')';

    var lines = ['NEW QUOTE REQUEST', '', 'ITEMS'];
    for (var a = 0; a < items.length; a++) {
      lines.push((a + 1) + '. ' + items[a].name + ' | Material: ' + (items[a].material || '-') + ' | Standard: ' + (items[a].standard || '-') + ' | Qty: ' + items[a].qty);
    }
    lines.push('', 'BUYER', 'Name: ' + buyer.name, 'Company: ' + buyer.company, 'Phone: ' + buyer.phone, 'Email: ' + buyer.email,
      'City: ' + buyer.city + (buyer.pin ? ' - ' + buyer.pin : ''));
    if (buyer.gstin) lines.push('GSTIN: ' + buyer.gstin);
    if (buyer.notes) lines.push('', 'Notes:', buyer.notes);
    if (names.length) lines.push('', 'Attachments: ' + names.join(', '));
    lines.push('', 'Sent from: ' + (buyer.page || 'exceltrading.in'));

    var cell = 'padding:8px;border:1px solid #d1d5db;';
    var head = 'padding:8px;border:1px solid #00396F;';
    var rows = '';
    for (var r = 0; r < items.length; r++) {
      rows += '<tr><td style="' + cell + '">' + (r + 1) + '</td><td style="' + cell + '"><strong>' + esc(items[r].name) + '</strong></td>' +
        '<td style="' + cell + '">' + (esc(items[r].material) || '-') + '</td><td style="' + cell + '">' + (esc(items[r].standard) || '-') + '</td>' +
        '<td style="' + cell + '">' + esc(items[r].qty) + '</td></tr>';
    }
    var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;max-width:720px;">' +
      '<h2 style="color:#00396F;margin:0 0 12px;">New Quote Request</h2>' +
      '<table style="border-collapse:collapse;width:100%;margin-bottom:20px;"><thead><tr style="background:#00396F;color:#fff;text-align:left;">' +
      '<th style="' + head + '">#</th><th style="' + head + '">Item</th><th style="' + head + '">Material</th><th style="' + head + '">Standard</th><th style="' + head + '">Qty</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<h3 style="color:#00396F;margin:0 0 8px;">Buyer</h3>' +
      '<p style="margin:0 0 4px;"><strong>' + esc(buyer.name) + '</strong> - ' + esc(buyer.company) + '</p>' +
      '<p style="margin:0 0 4px;">Phone: ' + esc(buyer.phone) + '</p>' +
      '<p style="margin:0 0 4px;">Email: <a href="mailto:' + esc(buyer.email) + '">' + esc(buyer.email) + '</a></p>' +
      '<p style="margin:0 0 4px;">City: ' + esc(buyer.city) + (buyer.pin ? ' - ' + esc(buyer.pin) : '') + '</p>' +
      (buyer.gstin ? '<p style="margin:0 0 4px;">GSTIN: ' + esc(buyer.gstin) + '</p>' : '') +
      (buyer.notes ? '<h3 style="color:#00396F;margin:16px 0 8px;">Notes</h3><p style="white-space:pre-wrap;margin:0;">' + esc(buyer.notes) + '</p>' : '') +
      (names.length ? '<p style="margin:16px 0 0;color:#6b7280;">Attachments: ' + esc(names.join(', ')) + '</p>' : '') +
      '<p style="margin:16px 0 0;color:#6b7280;font-size:12px;">Sent from ' + esc(buyer.page || 'exceltrading.in') + '</p></div>';

    MailApp.sendEmail({
      to: TO,
      subject: subject,
      body: lines.join('\n'),
      htmlBody: html,
      replyTo: buyer.email,
      name: 'Excel Trading Website',
      attachments: blobs
    });
    markSent(buyer.email, buyer.phone, items);

    return out({ ok: true });
  } catch (err) {
    console.error('quote mailer error: ' + err);
    return out({ ok: false, error: 'We could not send your request just now. Please call or WhatsApp us on +91 7204435253.' });
  }
}

// Run this once from the editor to grant permission and confirm email sending works
function authorizeOnce() {
  MailApp.sendEmail(TO, 'Quote mailer is authorised', 'If you can read this, the Excel Trading quote mailer can send email.');
}
