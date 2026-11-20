// Unit tests for app/js/rules.js. Runs in any ES-module JS engine:
//   macOS: tests/run_tests.sh (uses the system JavaScriptCore `jsc`)
//   Browser: http://127.0.0.1:8770/app/tests.html
import * as R from '../app/js/rules.js';

// jsc exposes print(); in browsers print() is window.print, so use console there.
const log = typeof window === 'undefined' && typeof print === 'function' ? print : console.log;
let pass = 0, fail = 0;
const results = [];
function t(name, fn) {
  try { fn(); pass++; results.push(['ok', name]); }
  catch (e) { fail++; results.push(['FAIL', `${name}: ${e.message}`]); }
}
function eq(a, b, msg = '') { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function ok(v, msg = 'expected truthy') { if (!v) throw new Error(msg); }

const p2 = 'Das Musterteam montiert den zugekauften Hubantrieb MH-A am Grundrahmen, richtet die\nmechanischen Schnittstellen aus und stellt';
const pages = ['Seite eins Das Musterteam konstruiert den Grundrahmen und die mechanischen Befestigungspunkte. Es', p2];

t('verifyQuote across line break (whitespace normalized)', () => {
  ok(R.verifyQuote(pages, 2, 'richtet die mechanischen Schnittstellen aus').ok);
});
t('verifyQuote rejects wrong page and reports actual page', () => {
  const r = R.verifyQuote(pages, 1, 'richtet die mechanischen Schnittstellen aus');
  eq(r.ok, false); eq(r.foundOn, 2);
});
t('verifyQuote rejects fabricated quote', () => {
  eq(R.verifyQuote(pages, 2, 'Das Musterteam entwickelt eigene Motoren').ok, false);
});

t('checkQuery blocks internal identifiers', () => {
  eq(R.checkQuery('UL-01 Prüfaufnahme').ok, false);
  eq(R.checkQuery('BeispielMed fixture').ok, false);
  eq(R.checkQuery('modular test fixture changeover').ok, true);
});
t('checkQuery bounds length', () => { eq(R.checkQuery('x'.repeat(201)).ok, false); });

const cap = (id, extra = {}) => ({ id, origin: 'documented', confirmation: 'confirmed', verified: true, ...extra });
const SF01 = { id: 'SF-01', capability_ids: ['CAP-01', 'CAP-02', 'CAP-03', 'CAP-04'] };
const SF02 = { id: 'SF-02', capability_ids: ['CAP-01', 'CAP-03'] };
const caps = ['CAP-01', 'CAP-02', 'CAP-03', 'CAP-04'].map(id => cap(id));
const all = caps.map(c => c.id);

t('fields eligible only with all confirmed+selected caps', () => {
  ok(R.fieldEligibility(SF01, caps, all).eligible);
  ok(R.fieldEligibility(SF02, caps, all).eligible);
});
t('deselecting CAP-03 removes SF-01 and SF-02', () => {
  const sel = all.filter(x => x !== 'CAP-03');
  eq(R.fieldEligibility(SF01, caps, sel).eligible, false);
  eq(R.fieldEligibility(SF02, caps, sel).eligible, false);
});
t('deselecting CAP-02 keeps SF-02 only', () => {
  const sel = all.filter(x => x !== 'CAP-02');
  eq(R.fieldEligibility(SF01, caps, sel).eligible, false);
  eq(R.fieldEligibility(SF02, caps, sel).eligible, true);
});
t('unverified or proposed capability is not active', () => {
  eq(R.isActiveCapability(cap('X', { verified: false })), false);
  eq(R.isActiveCapability(cap('X', { confirmation: 'proposed' })), false);
  eq(R.isActiveCapability(cap('X', { confirmation: 'open' })), false);
});

t('Q-01 own development -> separate customer claim, evidence pending, not active', () => {
  const out = R.applyQ01(caps, 'Eigenentwicklung', 'now');
  const q = out.find(c => c.id === 'CAP-Q01');
  eq(q.origin, 'customer_claim'); eq(q.evidence, 'pending'); eq(R.isActiveCapability(q), false);
  eq(out.find(c => c.id === 'CAP-02').origin, 'documented');
});
t('Q-01 integration -> no own drive capability', () => {
  const out = R.applyQ01(R.applyQ01(caps, 'Eigenentwicklung', 'x'), 'Integration zugekaufter Komponenten', 'y');
  eq(out.some(c => c.id === 'CAP-Q01'), false);
});

const SOURCES = [
  { id: 'PAT-01', kind: 'patent', keywords: ['prüfaufnahme', 'test fixture', 'modular', 'changeover'] },
  { id: 'MARKET-01', kind: 'procurement', keywords: ['test fixture', 'mechanical testing'] },
  { id: 'ALT-01', kind: 'product', keywords: ['test fixture', 'modular'] },
  { id: 'PAT-02', kind: 'patent', keywords: ['kaltplasma', 'bodenreinigung', 'plasma'] },
  { id: 'PUB-ET-IND', kind: 'company_public', keywords: ['test fixture'] },
];
t('curated: Kaltplasma query returns only PAT-02', () => {
  eq(R.matchCurated(SOURCES, 'Kaltplasma Bodenreinigung').map(s => s.id), ['PAT-02']);
});
t('curated: unrelated query returns zero', () => {
  eq(R.matchCurated(SOURCES, 'Photovoltaik Wechselrichter').length, 0);
});
t('curated: SF-01 query returns PAT-01, MARKET-01, ALT-01 (no company pages)', () => {
  eq(R.matchCurated(SOURCES, 'modular test fixture changeover').map(s => s.id), ['PAT-01', 'MARKET-01', 'ALT-01']);
});

const now = new Date('2026-11-20');
t('historic award notice is not a recent demand signal', () => {
  eq(R.isRecentDemandSignal({ kind: 'procurement', date: '2025-09-16', notice_type: 'can-standard' }, now), false);
  eq(R.isRecentDemandSignal({ kind: 'procurement', date: '2019-01-01', notice_type: 'cn-standard' }, now), false);
  eq(R.isRecentDemandSignal({ kind: 'procurement', date: '2026-05-01', notice_type: 'cn-standard' }, now), true);
});
t('synthetic signal never counts', () => {
  eq(R.isRecentDemandSignal({ kind: 'procurement', date: '2026-05-01', notice_type: 'cn-standard', synthetic: true }, now), false);
});
t('independent origins: same family counted once', () => {
  eq(R.independentOrigins([{ id: 'a', family: 'F1' }, { id: 'b', family: 'F1' }, { id: 'c', family: 'F2' }]), 2);
});

t('H-01 with PAT-01 + ALT-01: counterevidence, no priority, IP not reviewed', () => {
  const a = R.assessHypothesis({ capability_ids: all }, {
    caps, now, project: { pilot_budget_eur: null },
    sources: [{ id: 'PAT-01', kind: 'patent', family: 'P' }, { id: 'ALT-01', kind: 'product', family: 'A' }],
  });
  eq(a.dims.differenzierung.status, 'Gegenbeleg vorhanden');
  eq(a.dims.bedarf.status, 'nicht belegt');
  eq(a.dims.ip.status, 'nicht geprüft');
  eq(a.dims.ressourcen.status, 'offen');
  eq(a.priorityAllowed, false);
});
t('historic procurement -> "nur historisches Signal"', () => {
  const a = R.assessHypothesis({ capability_ids: all }, { caps, now, sources: [{ id: 'M', kind: 'procurement', date: '2018-01-01', family: 'M' }] });
  eq(a.dims.bedarf.status, 'nur historisches Signal');
});

t('matching: 50 kg / 0.1 mm vs 25 kg / 0.5 mm -> transfer open', () => {
  const m = R.matchCase({ reference_load_kg: 25, reference_position_error_mm: 0.5 }, { required_load_kg: 50, max_position_error_mm: 0.1 });
  eq(m.transfer, 'open'); eq(m.label, 'Transfer offen – Versuch/Nachweis nötig'); eq(m.issues.length, 3);
});
t('matching: alternative covers -> deferred with reason', () => {
  const m = R.matchCase({ reference_load_kg: 25, reference_position_error_mm: 0.5 }, { required_load_kg: 50, max_position_error_mm: 0.1 }, { alternativeCovers: true });
  eq(m.hypothesisStatus, 'deferred'); ok(m.reason);
});

t('signalsByYear counts families once', () => {
  eq(R.signalsByYear([{ year: 2025, family: 'A' }, { year: 2025, family: 'A' }, { year: 2024, family: 'B' }]), [{ year: 2024, n: 1 }, { year: 2025, n: 1 }]);
});

t('validateExtraction rejects bad shape and page', () => {
  const v = R.validateExtraction({ capabilities: [{ title: 'A', page: 9, quote: 'x', origin: 'documented' }, { title: 'B' }] }, 3);
  eq(v.ok, false); eq(v.items.length, 0); eq(v.errors.length, 2);
});

for (const [s, m] of results) log(`${s === 'ok' ? '  ok ' : ' FAIL'}  ${m}`);
log(`\n${pass} passed, ${fail} failed`);
export const summary = { pass, fail, results };
