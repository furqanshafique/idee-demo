// Unit tests for app/js/i18n.js: German stays the default, and every status
// text that rules.js can produce has an English translation.
//   macOS: tests/run_tests.sh (JavaScriptCore `jsc`)
import * as I from '../app/js/i18n.js';
import * as R from '../app/js/rules.js';

const log = typeof window === 'undefined' && typeof print === 'function' ? print : console.log;
let pass = 0, fail = 0;
const results = [];
function t(name, fn) {
  try { fn(); pass++; results.push(['ok', name]); }
  catch (e) { fail++; results.push(['FAIL', `${name}: ${e.message}`]); }
}
function eq(a, b, msg = '') { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function translated(de) { const en = I.toEn(de); if (en === de) throw new Error(`no English text for: ${de}`); return en; }

t('German is the default and tr() leaves text unchanged', () => {
  eq(I.getLang(), 'de');
  eq(I.tr('bestätigt'), 'bestätigt');
  eq(I.L('Ja', 'Yes'), 'Ja');
});
t('setLang("en") switches L() and tr(); unknown codes are ignored', () => {
  I.setLang('en');
  eq(I.L('Ja', 'Yes'), 'Yes'); eq(I.tr('bestätigt'), 'confirmed');
  I.setLang('fr'); eq(I.getLang(), 'en');
  I.setLang('de'); eq(I.getLang(), 'de');
});
t('unknown text (user input, PDF quotes) is returned unchanged', () => {
  eq(I.toEn('Das Musterteam konstruiert den Grundrahmen'), 'Das Musterteam konstruiert den Grundrahmen');
});
t('patterns translate dynamic texts, including nested parts', () => {
  eq(I.toEn('Zitat steht auf Seite 2, nicht auf Seite 1'), 'Quote is on page 2, not on page 1');
  eq(I.toEn('CAP-02 korrigiert'), 'CAP-02 corrected');
  eq(I.toEn('Q-01: Eigenentwicklung'), 'Q-01: In-house development');
  eq(I.toEn('Plan nicht bestätigt: procurement: Interne Kennungen nicht erlaubt: ul-01'), 'Plan not confirmed: procurement: Internal identifiers not allowed: ul-01');
  eq(I.toEn('IDEE-01 gelesen (3 Seiten). 4 Fähigkeiten gefunden, Textstellen geprüft.'), 'IDEE-01 read (3 pages). 4 capabilities found, passages verified.');
});
t('all rules.js label tables have English texts', () => {
  for (const table of [R.ORIGIN, R.CONTROL, R.TRANSFER, R.CONFIRMATION, R.HYP_STATUS]) Object.values(table).forEach(translated);
});
t('all assessHypothesis statuses, notes and blockers have English texts', () => {
  const cap = { id: 'C', origin: 'documented', confirmation: 'confirmed', verified: true };
  const now = new Date('2026-11-20');
  const ctxs = [
    { caps: [], sources: [] },
    { caps: [cap], sources: [{ kind: 'procurement', date: '2015-01-01', id: 'A' }, { kind: 'patent', id: 'P' }], project: { pilot_budget_eur: 1, free_capacity_hours: 2 } },
    { caps: [cap], sources: [{ kind: 'procurement', date: '2026-06-01', id: 'A' }], matching: { transfer: 'open', note: 'x' } },
  ];
  for (const ctx of ctxs) {
    const a = R.assessHypothesis({ capability_ids: ['C'] }, { now, ...ctx });
    for (const d of Object.values(a.dims)) { translated(d.status); if (d.note && d.note !== 'x') translated(d.note); }
    a.blockers.forEach(translated);
  }
});
t('matchCase and checkQuery messages have English texts', () => {
  const m = R.matchCase({ reference_load_kg: 25, reference_position_error_mm: 0.5 }, { required_load_kg: 50, max_position_error_mm: 0.1 }, { alternativeCovers: true });
  translated(m.label); translated(m.reason); m.issues.forEach(translated); translated(m.note);
  translated(R.matchCase({ reference_load_kg: 60, reference_position_error_mm: 0.05 }, { required_load_kg: 50, max_position_error_mm: 0.1 }, { partnerConfirmed: true }).label);
  translated(R.checkQuery('').error); translated(R.checkQuery('x'.repeat(300)).error); translated(R.checkQuery('UL-01 Prüfaufnahme').error);
});

for (const [s, m] of results) log(`${s === 'ok' ? '  ok ' : ' FAIL'}  ${m}`);
log(`\n${pass} passed, ${fail} failed`);
export const summary = { pass, fail, results };
