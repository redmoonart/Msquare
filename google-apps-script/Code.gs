/**
 * M SQUARE — استقبال الطلبات في Google Sheets
 * انسخ هذا الملف في: Extensions > Apps Script داخل جدول Google Sheets،
 * ثم انشره كـ Web App (راجع README.md في نفس المجلد).
 */

const SHEET_NAME = 'Orders';
const HEADERS = [
  'رقم الطلب', 'التاريخ', 'الاسم', 'الهاتف', 'الولاية', 'العنوان',
  'المنتجات', 'عدد القطع', 'المجموع (دج)', 'الحالة'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const order = JSON.parse(e.postData.contents);

    if (!order.name || !order.phone || !order.wilaya || !order.address || !Array.isArray(order.items) || !order.items.length) {
      return json({ ok: false, error: 'missing_fields' });
    }

    const sheet = getSheet();
    const items = order.items
      .map(i => `${clean(i.name)} (${clean(i.brand)}) — مقاس ${clean(i.size)} × ${Number(i.qty) || 1} = ${Number(i.lineTotal) || 0} دج`)
      .join('\n');
    const qty = order.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);

    sheet.appendRow([
      clean(order.id),
      new Date(),
      clean(order.name),
      clean(order.phone),
      clean(order.wilaya),
      clean(order.address),
      items,
      qty,
      Number(order.total) || 0,
      'جديد'
    ]);

    return json({ ok: true, id: order.id });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* للتأكد من أن الرابط يعمل: افتحه في المتصفح */
function doGet() {
  return json({ ok: true, service: 'M SQUARE orders' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#000000').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);
    sheet.setColumnWidth(7, 380);
  }
  return sheet;
}

/* منع حقن الصيغ (=, +, -, @) وتحديد الطول */
function clean(v) {
  let s = String(v == null ? '' : v).slice(0, 500).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
