/**
 * Frontier Compass: adds a menu to the content Sheet.
 *   Check content    validates the Sheet against the site's rules and lists any problems
 *   Publish to site  checks first; only if there are no problems, asks Vercel to rebuild the site
 *   Settings         stores the site URL, check token and Vercel deploy hook (in Script Properties, not in the Sheet)
 *
 * Install: Extensions > Apps Script, replace the contents of Code.gs with this file, save, reload the Sheet.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Frontier Compass')
    .addItem('Check content', 'checkContent')
    .addItem('Publish to site', 'publishToSite')
    .addSeparator()
    .addItem('Settings', 'settings')
    .addToUi();
}

function props_() {
  return PropertiesService.getScriptProperties();
}

function settings() {
  const ui = SpreadsheetApp.getUi();
  const p = props_();
  const fields = [
    ['SITE_URL', 'Site URL (e.g. https://frontier-compass-five.vercel.app)'],
    ['CHECK_TOKEN', 'Content check token (CONTENT_CHECK_TOKEN in Vercel)'],
    ['DEPLOY_HOOK', 'Vercel deploy hook URL'],
  ];
  for (const [key, label] of fields) {
    const current = p.getProperty(key);
    const shown = current ? (key === 'SITE_URL' ? current : 'set, leave blank to keep') : 'not set';
    const r = ui.prompt('Frontier Compass settings', label + '\nCurrently: ' + shown, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    const v = r.getResponseText().trim();
    if (v) p.setProperty(key, key === 'SITE_URL' ? v.replace(/\/+$/, '') : v);
  }
  ui.alert('Saved.');
}

function requireSettings_() {
  const p = props_();
  const missing = ['SITE_URL', 'CHECK_TOKEN', 'DEPLOY_HOOK'].filter(function (k) { return !p.getProperty(k); });
  if (missing.length) {
    SpreadsheetApp.getUi().alert('Missing settings: ' + missing.join(', ') + '.\nUse Frontier Compass > Settings first.');
    return null;
  }
  return { site: p.getProperty('SITE_URL'), token: p.getProperty('CHECK_TOKEN'), hook: p.getProperty('DEPLOY_HOOK') };
}

function runCheck_(s) {
  SpreadsheetApp.flush(); // make sure the latest edits are saved before the site reads them
  const res = UrlFetchApp.fetch(s.site + '/api/check-content', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + s.token },
    muteHttpExceptions: true,
  });
  let body;
  try { body = JSON.parse(res.getContentText()); } catch (e) { body = { ok: false, error: 'Unexpected response (' + res.getResponseCode() + ')' }; }
  return body;
}

function report_(body, title) {
  const lines = [];
  if (body.error) lines.push(body.error);
  if (body.summary) lines.push(body.summary);
  if (body.problems && body.problems.length) {
    lines.push('', body.problems.length + ' problem(s) to fix:');
    body.problems.slice(0, 40).forEach(function (x) { lines.push('• ' + x); });
    if (body.problems.length > 40) lines.push('…and ' + (body.problems.length - 40) + ' more');
  }
  if (body.warnings && body.warnings.length) {
    lines.push('', body.warnings.length + ' warning(s) (will still publish):');
    body.warnings.slice(0, 15).forEach(function (x) { lines.push('• ' + x); });
  }
  SpreadsheetApp.getUi().alert(title, lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

function checkContent() {
  const s = requireSettings_();
  if (!s) return;
  const body = runCheck_(s);
  report_(body, body.ok ? 'No problems found' : 'Content check failed');
}

function publishToSite() {
  const s = requireSettings_();
  if (!s) return;
  const body = runCheck_(s);
  if (!body.ok) {
    report_(body, 'Not published: fix these first');
    return;
  }
  const ui = SpreadsheetApp.getUi();
  const go = ui.alert('Publish to site?', body.summary + (body.warnings.length ? '\n' + body.warnings.length + ' warning(s).' : ''), ui.ButtonSet.OK_CANCEL);
  if (go !== ui.Button.OK) return;
  const res = UrlFetchApp.fetch(s.hook, { method: 'post', muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) {
    ui.alert('Vercel refused the deploy hook (' + res.getResponseCode() + '). Check the DEPLOY_HOOK setting.');
    return;
  }
  ui.alert('Publishing', 'The site is rebuilding from this Sheet. Changes are live in about 1 to 2 minutes.', ui.ButtonSet.OK);
}
