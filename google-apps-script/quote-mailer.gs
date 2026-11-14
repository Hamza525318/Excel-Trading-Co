// Excel Trading - website enquiry mailer (Google Apps Script web app)
// Handles the quote request form (every page) and the Contact Us form.
// Every enquiry is logged to the "Website Enquiries" Google Sheet, emailed to TO, and acknowledged to the buyer.
var TO = 'info@exceltrading.in';
var PHONE = '+91 7204435253';
var MAX_ITEMS = 30;
var MAX_FILES = 3;
var MAX_TOTAL_BYTES = 3 * 1024 * 1024;
var MIN_FILL_MS = 3000;
var MAX_PER_HOUR = 15;
var ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'dwg', 'dxf', 'step', 'stp', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'zip'];
var SHEET_NAME = 'Website Enquiries';
var HEADERS = ['Reference', 'Received', 'Form', 'Name', 'Company', 'Phone', 'Email', 'City', 'PIN', 'GSTIN', 'Items', 'Message / Notes', 'Attachments', 'Page', 'Status', 'Team notes'];
var STATUSES = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'];

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim().substring(0, max || 200);
}

function cleanBlock(s, max) {
  return String(s == null ? '' : s).replace(/\r/g, '').trim().substring(0, max);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// A cell starting with = + - or @ would run as a formula in the sheet
function cellText(s) {
  s = String(s == null ? '' : s);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function overLimit() {
  var cache = CacheService.getScriptCache();
  var key = 'hits_' + Math.floor(Date.now() / 3600000);
  var n = Number(cache.get(key) || 0);
  if (n >= MAX_PER_HOUR) return true;
  cache.put(key, String(n + 1), 4000);
  return false;
}

// The same buyer sending the exact same enquiry within 10 minutes counts as a repeat (double-click or spam).
// A different enquiry from the same buyer is new and is always sent.
// A submission is remembered only after its email has actually been sent.
function dupKey(email, phone, content) {
  var raw = email.toLowerCase() + '|' + phone.replace(/\D/g, '') + '|' + JSON.stringify(content);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw, Utilities.Charset.UTF_8);
  return 'dup_' + Utilities.base64Encode(digest);
}

function isRepeat(email, phone, content) {
  return !!CacheService.getScriptCache().get(dupKey(email, phone, content));
}

function markSent(email, phone, content) {
  CacheService.getScriptCache().put(dupKey(email, phone, content), '1', 600);
}

// Reference numbers run EQ-1001, EQ-1002, ... across both forms
function nextRef() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var n = Number(props.getProperty('LAST_REF') || 1000) + 1;
    props.setProperty('LAST_REF', String(n));
    return 'EQ-' + n;
  } finally {
    lock.releaseLock();
  }
}

// The sheet is created in the script owner's Drive on first use; its id is kept in script properties
function getSheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty('SHEET_ID', ss.getId());
    var sh = ss.getSheets()[0];
    sh.setName('Enquiries');
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#00396F').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(2, HEADERS.indexOf('Status') + 1, 2000, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build());
    sh.setColumnWidth(HEADERS.indexOf('Items') + 1, 380);
    sh.setColumnWidth(HEADERS.indexOf('Message / Notes') + 1, 320);
  }
  return ss.getSheets()[0];
}

function logRow(rec) {
  var row = [rec.ref, new Date(), rec.form, rec.name, rec.company, rec.phone, rec.email, rec.city, rec.pin, rec.gstin,
    rec.itemsText, rec.message, rec.attachments, rec.page, 'New', ''];
  getSheet().appendRow(row.map(function (v) { return v instanceof Date ? v : cellText(v); }));
}

// Short and fixed on purpose: nothing the visitor typed is echoed back, so the form cannot be used to send spam to others
function acknowledge(email, ref, what) {
  var subject = 'We have received your ' + what + ' - ' + ref;
  var body = 'Hello,\n\nThank you for contacting Excel Trading Corporation. We have received your ' + what + '.\n\n' +
    'Your reference number is ' + ref + '. If you would like to add drawings, sizes or quantities, simply reply to this email.\n\n' +
    'Our team will reply by email or phone within one business day (Monday to Saturday, 10 AM to 6 PM). ' +
    'For anything urgent, call or WhatsApp us on ' + PHONE + '.\n\n' +
    'Regards,\nExcel Trading Corporation\n163/1, Sadar Patrappa Road, Bengaluru 560002\nhttps://exceltrading.in';
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;max-width:560px;line-height:1.55;">' +
    '<div style="background:#00396F;color:#ffffff;padding:16px 20px;font-size:18px;font-weight:bold;">Excel Trading Corporation</div>' +
    '<div style="padding:20px;border:1px solid #e5e7eb;border-top:0;">' +
    '<p style="margin:0 0 12px;">Hello,</p>' +
    '<p style="margin:0 0 12px;">Thank you for contacting Excel Trading Corporation. We have received your ' + what + '.</p>' +
    '<p style="margin:0 0 12px;">Your reference number is <strong style="color:#00396F;">' + ref + '</strong>. If you would like to add drawings, sizes or quantities, simply reply to this email.</p>' +
    '<p style="margin:0 0 12px;">Our team will reply by email or phone within one business day (Monday to Saturday, 10 AM to 6 PM). ' +
    'For anything urgent, call or WhatsApp us on <a href="tel:+917204435253" style="color:#00396F;">' + PHONE + '</a>.</p>' +
    '<p style="margin:16px 0 0;">Regards,<br><strong>Excel Trading Corporation</strong><br>' +
    '<span style="color:#6b7280;font-size:12px;">163/1, Sadar Patrappa Road, Bengaluru 560002 &middot; <a href="https://exceltrading.in" style="color:#6b7280;">exceltrading.in</a></span></p>' +
    '</div></div>';
  MailApp.sendEmail({ to: email, subject: subject, body: body, htmlBody: html, replyTo: TO, name: 'Excel Trading Corporation' });
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

    return data.form === 'contact' ? handleContact(data) : handleQuote(data);
  } catch (err) {
    console.error('enquiry mailer error: ' + err);
    return out({ ok: false, error: 'We could not send your request just now. Please call or WhatsApp us on ' + PHONE + '.' });
  }
}

// Logs, emails the team and acknowledges the buyer. The sheet row is written first, so a lead is kept even if email fails.
function deliver(rec, teamMail, ackWhat) {
  try { logRow(rec); } catch (err) { console.error('sheet log failed for ' + rec.ref + ': ' + err); }
  MailApp.sendEmail(teamMail);
  try { acknowledge(rec.email, rec.ref, ackWhat); } catch (err) { console.error('acknowledgement failed for ' + rec.ref + ': ' + err); }
}

function handleContact(data) {
  var c = {
    name: clean(data.name, 100),
    phone: clean(data.phone, 30),
    email: clean(data.email, 150),
    message: cleanBlock(data.message, 3000),
    page: clean(data.page, 200)
  };
  if (!c.name || !c.phone || !c.email || !c.message) return out({ ok: false, error: 'Please fill in all the fields.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return out({ ok: false, error: 'Please enter a valid email address.' });
  if (!/^[0-9+()\-\s]{7,20}$/.test(c.phone)) return out({ ok: false, error: 'Please enter a valid phone number.' });

  if (isRepeat(c.email, c.phone, c.message)) return out({ ok: true });
  if (overLimit()) return out({ ok: false, error: 'Too many requests right now. Please call or WhatsApp us on ' + PHONE + '.' });

  var ref = nextRef();
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;max-width:720px;">' +
    '<h2 style="color:#00396F;margin:0 0 12px;">New Website Enquiry <span style="color:#6b7280;font-size:14px;font-weight:normal;">' + ref + '</span></h2>' +
    '<p style="margin:0 0 4px;"><strong>' + esc(c.name) + '</strong></p>' +
    '<p style="margin:0 0 4px;">Phone: ' + esc(c.phone) + '</p>' +
    '<p style="margin:0 0 4px;">Email: <a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></p>' +
    '<h3 style="color:#00396F;margin:16px 0 8px;">Message</h3><p style="white-space:pre-wrap;margin:0;">' + esc(c.message) + '</p>' +
    '<p style="margin:16px 0 0;color:#6b7280;font-size:12px;">Sent from ' + esc(c.page || 'exceltrading.in') + ' &middot; logged in the Website Enquiries sheet as ' + ref + '</p></div>';
  var body = ['NEW WEBSITE ENQUIRY ' + ref, '', 'Name: ' + c.name, 'Phone: ' + c.phone, 'Email: ' + c.email, '', 'Message:', c.message, '',
    'Sent from: ' + (c.page || 'exceltrading.in')].join('\n');

  deliver(
    { ref: ref, form: 'Contact', name: c.name, company: '', phone: c.phone, email: c.email, city: '', pin: '', gstin: '',
      itemsText: '', message: c.message, attachments: '', page: c.page },
    { to: TO, subject: 'Website Enquiry ' + ref + ' - ' + c.name, body: body, htmlBody: html, replyTo: c.email, name: 'Excel Trading Website' },
    'enquiry');
  markSent(c.email, c.phone, c.message);
  return out({ ok: true, ref: ref });
}

function handleQuote(data) {
  var buyer = {
    name: clean(data.name, 100),
    company: clean(data.company, 150),
    phone: clean(data.phone, 30),
    email: clean(data.email, 150),
    city: clean(data.city, 80),
    pin: clean(data.pin, 12),
    gstin: clean(data.gstin, 20),
    notes: cleanBlock(data.notes, 1500),
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

  if (overLimit()) return out({ ok: false, error: 'Too many requests right now. Please call or WhatsApp us on ' + PHONE + '.' });

  var ref = nextRef();
  var subject = 'Quote Request ' + ref + ' - ' + items.length + (items.length === 1 ? ' item' : ' items') + ' - ' + buyer.company + ' (' + buyer.city + ')';

  var itemLines = [];
  for (var a = 0; a < items.length; a++) {
    itemLines.push((a + 1) + '. ' + items[a].name + ' | Material: ' + (items[a].material || '-') + ' | Standard: ' + (items[a].standard || '-') + ' | Qty: ' + items[a].qty);
  }
  var lines = ['NEW QUOTE REQUEST ' + ref, '', 'ITEMS'].concat(itemLines);
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
    '<h2 style="color:#00396F;margin:0 0 12px;">New Quote Request <span style="color:#6b7280;font-size:14px;font-weight:normal;">' + ref + '</span></h2>' +
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
    '<p style="margin:16px 0 0;color:#6b7280;font-size:12px;">Sent from ' + esc(buyer.page || 'exceltrading.in') + ' &middot; logged in the Website Enquiries sheet as ' + ref + '</p></div>';

  deliver(
    { ref: ref, form: 'Quote', name: buyer.name, company: buyer.company, phone: buyer.phone, email: buyer.email, city: buyer.city,
      pin: buyer.pin, gstin: buyer.gstin, itemsText: itemLines.join('\n'), message: buyer.notes, attachments: names.join(', '), page: buyer.page },
    { to: TO, subject: subject, body: lines.join('\n'), htmlBody: html, replyTo: buyer.email, name: 'Excel Trading Website', attachments: blobs },
    'quote request');
  markSent(buyer.email, buyer.phone, items);

  return out({ ok: true, ref: ref });
}

// Run once from the editor after pasting this version: grants the new Sheets permission,
// creates the Website Enquiries sheet and emails its link to TO.
function authorizeOnce() {
  var sheet = getSheet();
  MailApp.sendEmail(TO, 'Website enquiry mailer is authorised',
    'The Excel Trading enquiry mailer can send email and log enquiries.\n\nEnquiry sheet: ' + sheet.getParent().getUrl());
}
