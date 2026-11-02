/**
 * Time Allocation Survey backend (Google Apps Script web app).
 *
 * What it does: receives answers from the survey page and keeps one row per respondent in a Google Sheet.
 * Respondents can re-submit from the same browser and it replaces their row. Results are only returned
 * to someone holding the owner key.
 *
 * Set up once (see README.md):
 *   1. Paste this file into a new project at script.google.com.
 *   2. Run setup(). Approve permissions. Read the owner key and sheet link in the Execution log.
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the /exec URL.
 */

var SHEET_NAME = 'Responses';
var HEADER = ['id', 'submittedAt', 'name', 'role', 'tenure', 'territory', 'json'];
var MAX_JSON = 60000;

function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('OWNER_KEY')) {
    props.setProperty('OWNER_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  }
  if (!props.getProperty('SHEET_ID')) {
    var ss = SpreadsheetApp.create('Time Allocation Survey (Responses)');
    props.setProperty('SHEET_ID', ss.getId());
  }
  var sheet = getSheet_();
  Logger.log('Owner key (keep private): ' + props.getProperty('OWNER_KEY'));
  Logger.log('Responses sheet: ' + sheet.getParent().getUrl());
}

function getSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function keyOk_(key) {
  var real = PropertiesService.getScriptProperties().getProperty('OWNER_KEY') || '';
  key = String(key || '');
  if (!real || key.length !== real.length) return false;
  var diff = 0;
  for (var i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}

function findRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function doGet() {
  return json_({ ok: true, status: 'running' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action;
    var sheet = getSheet_();

    if (action === 'submit') {
      var id = String(body.id || '');
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return json_({ ok: false, error: 'bad id' });
      if (!body.rows || typeof body.rows !== 'object') return json_({ ok: false, error: 'bad rows' });
      var data = {};
      Object.keys(body).forEach(function (k) { if (k !== 'action' && k !== 'key') data[k] = body[k]; });
      data.submittedAt = new Date().toISOString();
      var text = JSON.stringify(data);
      if (text.length > MAX_JSON) return json_({ ok: false, error: 'too large' });
      var row = [id, data.submittedAt, String(data.name || '').slice(0, 120), String(data.role || '').slice(0, 120),
                 String(data.tenure || '').slice(0, 120), String(data.territory || '').slice(0, 120), text];
      var at = findRow_(sheet, id);
      if (at > 0) sheet.getRange(at, 1, 1, row.length).setValues([row]);
      else sheet.appendRow(row);
      return json_({ ok: true });
    }

    if (action === 'list') {
      if (!keyOk_(body.key)) return json_({ ok: false, error: 'forbidden' });
      var last = sheet.getLastRow();
      var rows = [];
      if (last >= 2) {
        sheet.getRange(2, 1, last - 1, HEADER.length).getValues().forEach(function (r) {
          try {
            var o = JSON.parse(r[6]);
            o.id = String(r[0]);
            rows.push(o);
          } catch (err) {}
        });
      }
      return json_({ ok: true, rows: rows });
    }

    if (action === 'delete') {
      if (!keyOk_(body.key)) return json_({ ok: false, error: 'forbidden' });
      var del = findRow_(sheet, String(body.id || ''));
      if (del > 0) sheet.deleteRow(del);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'unknown action' });
  } catch (err2) {
    return json_({ ok: false, error: 'server error' });
  } finally {
    lock.releaseLock();
  }
}
