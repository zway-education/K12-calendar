/**
 * K12 收費行事曆 ・ 後端 API (Apps Script Web App) ・ v2 (2026-05)
 * 雙向同步: HTML 既能讀,也能寫回 Sheet
 *
 * v2 變更 (相對 v1):
 *  - 班別 加 textbookFee 欄
 *  - 規則 加 renewalWeekStart, renewalWeekEnd, textbookFeeEvery 欄
 *  - 新增 重點週 sheet (label/start/end/color)
 *  - doGet 回傳加 highlightWeeks
 *  - doPost saveAll 支援 highlightWeeks 同步
 *
 * 部署方式: 請看 README_設定步驟.md
 * 教育版 (Google Workspace for Education) 注意事項:
 * - 部署時「存取權」若 admin 鎖了「任何人」, 改選「擁有 Google 帳戶的任何人」
 *   或「您網域內的所有人」(K12 教育帳號內成員都能用)
 * - HTML 端使用者用該 Google 帳號登入瀏覽器即可存取
 */

const SHEET_CLASSES    = '班別';
const SHEET_HOLIDAYS   = '連假';
const SHEET_RULES      = '規則';
const SHEET_HIGHLIGHTS = '重點週';

const CLASS_HEADERS = ['id','name','weekday','time','teacher','campus','startDate','fee','studentCount','periodCount','textbookFee','memo'];
const RULE_HEADERS  = ['periodLength','feeDayIndex','renewalDayIndex','renewalWeekStart','renewalWeekEnd','lastIntakeIndex','cutoffIndex','textbookFeeEvery'];
const HIGHLIGHT_HEADERS = ['label','start','end','color'];

// ==================== READ (doGet) ====================
// 支援 JSONP: 若帶 ?callback=foo 則回傳 foo({...}) 包裝, 讓 <script> tag 可載入 (繞過 CORS)
function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = {
      classes:        readClasses(ss),
      holidays:       readHolidays(ss),
      rules:          readRules(ss),
      highlightWeeks: readHighlights(ss),
      fetchedAt:      new Date().toISOString(),
      apiVersion:     'v2',
    };
    return callback ? jsonpResponse(callback, data) : jsonResponse(data);
  } catch (err) {
    const errData = { error: String(err), stack: err.stack };
    return callback ? jsonpResponse(callback, errData) : jsonResponse(errData);
  }
}

// ==================== WRITE (doPost) ====================
// HTML 用 POST + Content-Type: text/plain (避開 CORS 預檢)
// body = { action: 'saveClasses' | 'saveHolidays' | 'saveRules' | 'saveHighlights' | 'saveAll', data: {...} }
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = body.action;
    const data = body.data || {};

    switch (action) {
      case 'saveClasses':    writeClasses(ss, data.classes || []); break;
      case 'saveHolidays':   writeHolidays(ss, data.holidays || []); break;
      case 'saveRules':      writeRules(ss, data.rules || {}); break;
      case 'saveHighlights': writeHighlights(ss, data.highlightWeeks || []); break;
      case 'saveAll':
        if (data.classes)        writeClasses(ss, data.classes);
        if (data.holidays)       writeHolidays(ss, data.holidays);
        if (data.rules)          writeRules(ss, data.rules);
        if (data.highlightWeeks) writeHighlights(ss, data.highlightWeeks);
        break;
      default:
        return jsonResponse({ error: '未知 action: ' + action });
    }

    return jsonResponse({
      ok: true,
      action,
      classes:        readClasses(ss),
      holidays:       readHolidays(ss),
      rules:          readRules(ss),
      highlightWeeks: readHighlights(ss),
      savedAt:        new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse({ error: String(err), stack: err.stack });
  }
}

// ==================== Read helpers ====================
function readClasses(ss) {
  const sheet = ss.getSheetByName(SHEET_CLASSES);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(r => r[0])
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      obj.weekday = Number(obj.weekday);
      obj.fee = Number(obj.fee);
      obj.textbookFee = Number(obj.textbookFee) || 0;
      obj.studentCount = Number(obj.studentCount) || 0;
      obj.periodCount = Number(obj.periodCount) || 4;
      if (obj.startDate instanceof Date) {
        obj.startDate = Utilities.formatDate(obj.startDate, 'Asia/Taipei', 'yyyy-MM-dd');
      }
      return obj;
    });
}

function readHolidays(ss) {
  const sheet = ss.getSheetByName(SHEET_HOLIDAYS);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1)
    .map(r => r[0])
    .filter(Boolean)
    .map(d => d instanceof Date ? Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd') : String(d));
}

function readRules(ss) {
  const sheet = ss.getSheetByName(SHEET_RULES);
  const defaults = {
    periodLength: 10, feeDayIndex: 1, renewalDayIndex: 8,
    renewalWeekStart: 8, renewalWeekEnd: 10,
    lastIntakeIndex: 3, cutoffIndex: 4,
    textbookFeeEvery: 20,
  };
  if (!sheet) return defaults;
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return defaults;
  const headers = values[0].map(String);
  const row = values[1];
  const obj = {};
  headers.forEach((h, i) => { obj[h] = Number(row[i]) || 0; });
  return Object.assign({}, defaults, obj);
}

function readHighlights(ss) {
  const sheet = ss.getSheetByName(SHEET_HIGHLIGHTS);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(r => r[0])
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      if (obj.start instanceof Date) obj.start = Utilities.formatDate(obj.start, 'Asia/Taipei', 'yyyy-MM-dd');
      if (obj.end instanceof Date)   obj.end   = Utilities.formatDate(obj.end, 'Asia/Taipei', 'yyyy-MM-dd');
      obj.label = String(obj.label || '');
      obj.color = String(obj.color || '#888888');
      return obj;
    });
}

// ==================== Write helpers ====================
function writeClasses(ss, classes) {
  let sheet = ss.getSheetByName(SHEET_CLASSES) || ss.insertSheet(SHEET_CLASSES);
  sheet.clear();
  const rows = [CLASS_HEADERS];
  for (const c of classes) {
    rows.push(CLASS_HEADERS.map(h => c[h] != null ? c[h] : ''));
  }
  sheet.getRange(1, 1, rows.length, CLASS_HEADERS.length).setValues(rows);
  sheet.getRange(1, 1, 1, CLASS_HEADERS.length).setFontWeight('bold');
  if (classes.length > 0) {
    const dateColIdx = CLASS_HEADERS.indexOf('startDate') + 1;
    sheet.getRange(2, dateColIdx, classes.length, 1).setNumberFormat('yyyy-mm-dd');
  }
}

function writeHolidays(ss, holidays) {
  let sheet = ss.getSheetByName(SHEET_HOLIDAYS) || ss.insertSheet(SHEET_HOLIDAYS);
  sheet.clear();
  const rows = [['date', 'note']];
  for (const d of holidays) rows.push([d, '']);
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  if (holidays.length > 0) {
    sheet.getRange(2, 1, holidays.length, 1).setNumberFormat('yyyy-mm-dd');
  }
}

function writeRules(ss, rules) {
  let sheet = ss.getSheetByName(SHEET_RULES) || ss.insertSheet(SHEET_RULES);
  sheet.clear();
  const row = RULE_HEADERS.map(h => rules[h] != null ? rules[h] : '');
  sheet.getRange(1, 1, 2, RULE_HEADERS.length).setValues([RULE_HEADERS, row]);
  sheet.getRange(1, 1, 1, RULE_HEADERS.length).setFontWeight('bold');
}

function writeHighlights(ss, highlights) {
  let sheet = ss.getSheetByName(SHEET_HIGHLIGHTS) || ss.insertSheet(SHEET_HIGHLIGHTS);
  sheet.clear();
  const rows = [HIGHLIGHT_HEADERS];
  for (const h of highlights) {
    rows.push(HIGHLIGHT_HEADERS.map(k => h[k] != null ? h[k] : ''));
  }
  sheet.getRange(1, 1, rows.length, HIGHLIGHT_HEADERS.length).setValues(rows);
  sheet.getRange(1, 1, 1, HIGHLIGHT_HEADERS.length).setFontWeight('bold');
  if (highlights.length > 0) {
    const startCol = HIGHLIGHT_HEADERS.indexOf('start') + 1;
    const endCol   = HIGHLIGHT_HEADERS.indexOf('end') + 1;
    sheet.getRange(2, startCol, highlights.length, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(2, endCol, highlights.length, 1).setNumberFormat('yyyy-mm-dd');
  }
}

// ==================== Util ====================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// JSONP 包裝: 給 <script> tag 用, 繞過 CORS
function jsonpResponse(callback, data) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ==================== 測試 (在 Apps Script 編輯器執行) ====================
function testRead() {
  Logger.log(doGet({}).getContent());
}
function testWriteRules() {
  const e = { postData: { contents: JSON.stringify({ action: 'saveRules', data: { rules: { periodLength: 10, feeDayIndex: 1, renewalDayIndex: 8, renewalWeekStart: 8, renewalWeekEnd: 10, lastIntakeIndex: 3, cutoffIndex: 4, textbookFeeEvery: 20 }}})}};
  Logger.log(doPost(e).getContent());
}
function testWriteHighlights() {
  const e = { postData: { contents: JSON.stringify({ action: 'saveHighlights', data: { highlightWeeks: [
    { label: '收費週', start: '2026-05-29', end: '2026-06-06', color: '#ff6d00' },
    { label: '插班週', start: '2026-06-06', end: '2026-06-20', color: '#1976d2' },
  ]}})}};
  Logger.log(doPost(e).getContent());
}
