// Single project state, persisted in localStorage. All mutations go through
// `actions`; every status the UI shows is derived from this state + rules.js.
import * as R from './rules.js';

const KEY = 'devoreo.idee.demo.v1';
const UI_KEY = 'devoreo.idee.ui.v1';
const MAX_PAGE_CHARS = 6000;

let SRC = null;          // { seed, publicSources }
let state = null;
let ui = { step: 1, viewer: null, flash: null, edit: null, tab: 'patent', runId: null, filter: '' };
const listeners = new Set();

const nowIso = () => new Date().toISOString();
const clone = o => JSON.parse(JSON.stringify(o));

export function init(sources) {
  SRC = sources;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!state || state.schema !== 'idee-state-1') state = baseline();
  try { ui = { ...ui, ...JSON.parse(localStorage.getItem(UI_KEY) || '{}'), flash: null, viewer: null, edit: null }; } catch { /* ignore */ }
}

function baseline() {
  const s = SRC.seed;
  return {
    schema: 'idee-state-1',
    createdAt: nowIso(),
    project: {
      ...clone(s.project), exclusions: '', confirmed: false, confirmedAt: null,
      existing_markets: [...s.project.existing_markets],
    },
    documents: [],
    capabilities: [],
    reviewQueue: [],           // LLM / unverifiable candidates, never shown as verified
    answers: { 'Q-01': 'Ungeklärt', 'Q-02': 'Ungeklärt', 'Q-03': { load_kg: null, position_error_mm: null, quantity: null, free_hours: null, evidence: '' } },
    profile: { version: 0, history: [] },
    selectedCapIds: null,      // null = all active capabilities selected
    fields: s.search_fields.map(f => ({ ...clone(f), manual: false })),
    selectedFieldIds: [],
    plan: null,
    runs: [],
    manualSources: [],
    hypotheses: s.hypotheses.map(h => ({
      ...clone(h), version: 1, history: [],
      capability_ids: h.id === 'H-01' ? ['CAP-01', 'CAP-02', 'CAP-03', 'CAP-04'] : ['CAP-01', 'CAP-03', 'CAP-04'],
      source_ids: h.source_ids || h.counterevidence_ids || [],
      buyer: h.id === 'H-02' ? 'Prüfmittelverantwortliche / Prüfstellenleitung (Annahme)' : '',
      deliverable: h.id === 'H-02' ? 'Mechanische Wechselaufnahme als Komponente (kein komplettes Prüfsystem)' : 'Universelle modulare Prüfaufnahme',
      alternative: h.id === 'H-02' ? 'Modulare Serienaufnahmen (z. B. ALT-01) – Abdeckung der Sondergeometrie offen' : '',
      questions: h.id === 'H-02' ? [h.next_question, 'Welche Last/Genauigkeit wird belegt gefordert?', 'Wer kauft heute und zu welchem Preis?'] : [],
      reason: null, synthetic_basis: false,
    })),
    matching: { loaded: false, alternativeCovers: false, partnerConfirmed: false },
    audit: [],
  };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
  try { localStorage.setItem(UI_KEY, JSON.stringify({ step: ui.step, tab: ui.tab, runId: ui.runId })); } catch { /* ignore */ }
}
function emit() { save(); listeners.forEach(fn => fn()); }
export const subscribe = fn => listeners.add(fn);
export const getState = () => state;
export const getUi = () => ui;
export const getSources = () => SRC;
export function setUi(patch, render = true) { ui = { ...ui, ...patch }; if (render) emit(); else save(); }
function flash(type, text) { ui.flash = { type, text }; }
function audit(text) { state.audit.unshift({ at: nowIso(), text }); state.audit = state.audit.slice(0, 200); }

function bumpProfile(reason) {
  state.profile.version += 1;
  state.profile.history.unshift({
    version: state.profile.version, at: nowIso(), reason,
    snapshot: state.capabilities.map(c => ({ id: c.id, title: c.title, origin: c.origin, control: c.control, transfer: c.transfer, confirmation: c.confirmation })),
    answers: clone(state.answers),
  });
  audit(`Profilversion v${state.profile.version}: ${reason}`);
}

// ------------------------------------------------------------ derived
export const seedDoc = id => SRC.seed.documents.find(d => d.id === id);
export const publicSource = id => SRC.publicSources.sources.find(s => s.id === id);
export const activeCaps = () => state.capabilities.filter(R.isActiveCapability);
export function selectedCapIds() {
  const active = activeCaps().map(c => c.id);
  return state.selectedCapIds === null ? active : state.selectedCapIds.filter(id => active.includes(id));
}
export function eligibility(field) { return R.fieldEligibility(field, state.capabilities, selectedCapIds()); }
export const currentRun = () => state.runs.find(r => r.id === ui.runId) || state.runs[0] || null;

// Resolve a source id (curated, live result, manual) to an evidence record.
export function resolveSource(id) {
  const pub = publicSource(id);
  if (pub) return { ...pub, mode: 'curated', family: pub.origin || pub.id, date: pub.published || null, synthetic: false };
  for (const run of state.runs) {
    const r = run.results.find(x => x.id === id);
    if (r) return { ...r, synthetic: false };
  }
  const m = state.manualSources.find(x => x.id === id);
  if (m) return { ...m, mode: 'manual', family: m.url, synthetic: false };
  return null;
}
export function foundInRuns(id) { return state.runs.some(r => r.results.some(x => x.id === id || x.curatedId === id)); }

export function assess(h) {
  const sources = (h.source_ids || []).map(resolveSource).filter(Boolean);
  let matching = null;
  if (h.id === 'H-02' && state.matching.loaded) matching = matchingResult();
  return R.assessHypothesis(h, {
    caps: state.capabilities, sources, project: state.project, matching,
    minOrigins: SRC.seed.rules.min_independent_origins_for_priority,
  });
}
export function matchingResult() {
  const cap5 = state.capabilities.find(c => c.id === 'CAP-05');
  const req = SRC.seed.synthetic_matching_case;
  return R.matchCase(cap5?.parameters || {}, req, { partnerConfirmed: state.matching.partnerConfirmed, alternativeCovers: state.matching.alternativeCovers });
}

export function stepStatus(n) {
  const s = state;
  switch (n) {
    case 1: return s.project.confirmed ? 'done' : 'work';
    case 2: return activeCaps().length ? (s.capabilities.some(c => c.confirmation === 'proposed') ? 'work' : 'done') : (s.documents.length ? 'work' : 'todo');
    case 3: return s.selectedFieldIds.length ? 'done' : (activeCaps().length ? 'work' : 'todo');
    case 4: return s.plan?.confirmed ? 'done' : (s.selectedFieldIds.length ? 'work' : 'todo');
    case 5: return s.runs.some(r => r.mode === 'live') ? 'done' : (s.runs.length ? 'work' : 'todo');
    case 6: return s.hypotheses.some(h => h.version > 1) ? 'done' : 'todo';
    default: return 'info';
  }
}

// ------------------------------------------------------------ actions
export const actions = {
  goto(step) { ui.step = step; ui.edit = null; emit(); },

  updateProject(patch) { Object.assign(state.project, patch); save(); },
  confirmProject() {
    state.project.confirmed = true; state.project.confirmedAt = nowIso();
    audit('Projektumfang bestätigt'); flash('ok', 'Projekt angelegt. Weiter mit dem Unternehmensprofil.'); emit();
  },
  reopenProject() { state.project.confirmed = false; emit(); },

  // doc: { name, sha256, pages, pageTexts, size }
  addDocument(doc) {
    const dup = state.documents.find(d => d.sha256 === doc.sha256);
    if (dup) { flash('info', `Identische Datei bereits importiert (${dup.id}) – keine Duplikate angelegt.`); emit(); return dup; }
    const known = SRC.seed.documents.find(d => d.sha256 === doc.sha256);
    const rec = {
      id: known ? known.id : `UPL-${doc.sha256.slice(0, 8)}`,
      name: doc.name, file: known ? known.file : null, sha256: doc.sha256, pages: doc.pages, size: doc.size,
      known: !!known, synthetic: known ? known.synthetic : null, kind: known?.kind || 'unknown_upload',
      importedAt: nowIso(),
      pageTexts: doc.pageTexts.map(t => t.slice(0, MAX_PAGE_CHARS)),
      textChars: doc.pageTexts.reduce((a, t) => a + t.length, 0),
      method: known ? 'Musterextraktion / regelbasiert' : 'Textextraktion (pdf.js), keine Fallmetadaten',
    };
    state.documents.push(rec);
    let added = 0, failed = 0;
    if (known) {
      for (const cand of SRC.seed.capability_candidates.filter(c => c.source.document_id === known.id)) {
        if (state.capabilities.some(c => c.id === cand.id)) continue;
        const v = R.verifyQuote(rec.pageTexts, cand.source.page, cand.source.quote);
        const cap = {
          ...clone(cand), verified: v.ok, verifyNote: v.ok ? `Zitat auf Seite ${cand.source.page} gefunden` : v.reason,
          method: 'Musterextraktion / regelbasiert', createdAt: nowIso(), history: [],
          source: { ...cand.source, file: known.file },
        };
        if (v.ok) { state.capabilities.push(cap); added++; }
        else { state.reviewQueue.push({ ...cap, reviewReason: v.reason }); failed++; }
      }
      bumpProfile(`${rec.id} importiert (${added} Vorschläge${failed ? `, ${failed} zur Prüfung` : ''})`);
    } else {
      audit(`Unbekannte Datei ${doc.name} importiert (${doc.pages} Seiten, nur Text)`);
    }
    const msg = known
      ? `${rec.id}: ${doc.pages} Seiten gelesen, Hash bekannt. ${added} Fähigkeitsvorschläge mit verifiziertem Zitat${failed ? `, ${failed} nicht verifizierbar → Prüfliste` : ''}.`
      : `${doc.name}: ${doc.pages} Seiten, ${rec.textChars} Zeichen Text extrahiert. Unbekannte Datei – keine Musterdaten angewendet; Fähigkeiten manuell mit Belegstelle anlegen.`;
    flash(known ? 'ok' : 'info', rec.textChars === 0 && !known ? `${msg} Hinweis: kein lesbarer Text (evtl. Scan).` : msg);
    emit();
    return rec;
  },

  setCapDecision(id, decision) {
    const c = state.capabilities.find(x => x.id === id);
    if (!c) return;
    if (c.origin !== 'documented' && decision === 'confirmed') { flash('warn', 'Kundenaussagen bleiben Kundenaussagen, bis ein Nachweis vorliegt.'); emit(); return; }
    c.history.push({ at: nowIso(), from: c.confirmation, to: decision });
    c.confirmation = decision;
    bumpProfile(`${id} ${R.CONFIRMATION[decision]}`);
    emit();
  },
  correctCap(id, patch) {
    const c = state.capabilities.find(x => x.id === id);
    if (!c) return;
    c.history.push({ at: nowIso(), from: { title: c.title, control: c.control, transfer: c.transfer, note: c.note }, to: patch, kind: 'correction' });
    Object.assign(c, patch, { confirmation: 'corrected' });
    ui.edit = null;
    bumpProfile(`${id} korrigiert`);
    emit();
  },
  addManualCap({ docId, page, quote, title }) {
    const doc = state.documents.find(d => d.id === docId);
    if (!doc || !title?.trim() || !quote?.trim()) { flash('error', 'Titel, Dokument und Belegstelle sind Pflicht.'); emit(); return; }
    const v = R.verifyQuote(doc.pageTexts, Number(page), quote);
    const n = state.capabilities.filter(c => c.id.startsWith('CAP-M')).length + state.reviewQueue.filter(c => c.id?.startsWith('CAP-M')).length + 1;
    const cap = {
      id: `CAP-M${String(n).padStart(2, '0')}`, title: title.trim(),
      source: { document_id: docId, page: Number(page), quote: quote.trim(), file: doc.file },
      origin: 'documented', control: 'unknown', transfer: 'open', confirmation: 'proposed',
      verified: v.ok, verifyNote: v.ok ? 'Belegstelle im Text gefunden' : v.reason, method: 'manuell mit Belegstelle',
      parameters: {}, requires: [], createdAt: nowIso(), history: [],
    };
    if (v.ok) { state.capabilities.push(cap); bumpProfile(`${cap.id} manuell angelegt`); flash('ok', `${cap.id} angelegt – Belegstelle verifiziert.`); }
    else { state.reviewQueue.push({ ...cap, reviewReason: v.reason }); flash('warn', `Belegstelle nicht verifiziert (${v.reason}). Eintrag in Prüfliste, nicht im Profil.`); }
    emit();
  },
  addLlmCandidates(docId, items, model) {
    const doc = state.documents.find(d => d.id === docId);
    let ok = 0, bad = 0;
    items.forEach((it, i) => {
      const v = R.verifyQuote(doc.pageTexts, it.page, it.quote);
      const rec = {
        id: `LLM-${docId}-${state.reviewQueue.length + i + 1}`, title: it.title, source: { document_id: docId, page: it.page, quote: it.quote, file: doc.file },
        origin: it.origin, verified: v.ok, verifyNote: v.ok ? 'Zitat verifiziert' : v.reason, method: `KI-Extraktion (${model}) – Review nötig`,
        reviewReason: v.ok ? 'KI-Vorschlag: Zitat verifiziert, fachlich prüfen' : `KI-Vorschlag: ${v.reason}`, createdAt: nowIso(),
      };
      state.reviewQueue.push(rec); v.ok ? ok++ : bad++;
    });
    flash(bad ? 'warn' : 'ok', `KI-Extraktion: ${ok} Zitate verifiziert, ${bad} nicht verifizierbar. Alle Vorschläge liegen in der Prüfliste.`);
    emit();
  },

  setAnswer(qid, value) {
    if (state.answers[qid] === value) return;
    state.answers[qid] = value;
    if (qid === 'Q-01') {
      state.capabilities = R.applyQ01(state.capabilities, value, nowIso());
      const c2 = state.capabilities.find(c => c.id === 'CAP-02');
      if (c2) c2.q01Note = value === 'Integration zugekaufter Komponenten' ? 'Q-01: Integration bestätigt – keine eigene Motorenentwicklung ableiten.'
        : value === 'Eigenentwicklung' ? 'Q-01: Kundenaussage Eigenentwicklung → separater Eintrag CAP-Q01, Nachweis offen.' : null;
    }
    bumpProfile(`${qid}: ${value}`);
    emit();
  },
  setQ03(patch) {
    const q = { ...state.answers['Q-03'], ...patch };
    state.answers['Q-03'] = q;
    save();
  },
  commitQ03() {
    const q = state.answers['Q-03'];
    const filled = ['load_kg', 'position_error_mm', 'quantity', 'free_hours'].filter(k => q[k] !== null && q[k] !== '');
    if (filled.length && !q.evidence?.trim()) {
      flash('warn', 'Werte ohne Beleg werden nicht übernommen. Bitte Nachweis (Dokument/Seite) angeben oder Felder leer lassen.');
      emit(); return;
    }
    bumpProfile(filled.length ? `Q-03: ${filled.length} belegte Werte` : 'Q-03: keine belegten Werte – offen');
    emit();
  },

  toggleCapSelection(id) {
    const cur = selectedCapIds();
    state.selectedCapIds = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    state.selectedFieldIds = state.selectedFieldIds.filter(fid => eligibility(state.fields.find(f => f.id === fid)).eligible);
    emit();
  },
  toggleField(id) {
    const f = state.fields.find(x => x.id === id);
    if (state.selectedFieldIds.includes(id)) state.selectedFieldIds = state.selectedFieldIds.filter(x => x !== id);
    else {
      if (!eligibility(f).eligible) { flash('warn', 'Feld ist mit der aktuellen Auswahl nicht ableitbar.'); emit(); return; }
      if (state.selectedFieldIds.length >= 2) { flash('warn', 'Maximal zwei Suchfelder pro Demo-Sprint. Erst eines abwählen.'); emit(); return; }
      state.selectedFieldIds.push(id);
    }
    emit();
  },
  addField({ title, query_de, query_en, capability_ids }) {
    if (!title?.trim() || !capability_ids?.length) { flash('error', 'Titel und mindestens eine Fähigkeit sind Pflicht.'); emit(); return; }
    const id = `SF-M${String(state.fields.filter(f => f.manual).length + 1).padStart(2, '0')}`;
    state.fields.push({ id, title: title.trim(), query_de: query_de || '', query_en: query_en || '', capability_ids, status: 'hypothesis', manual: true, sources: ['patent', 'procurement', 'research'] });
    audit(`Feld ${id} manuell angelegt`); flash('ok', `${id} angelegt.`); emit();
  },

  initPlan(fieldId) {
    const f = state.fields.find(x => x.id === fieldId);
    const prev = state.plan;
    state.plan = {
      version: (prev?.version || 0) + 1, fieldId, confirmed: false, confirmedAt: null,
      terms: {
        patent: f.id === 'SF-01' ? 'modular test fixture, test fixture changeover, Prüfaufnahme' : [f.query_en, f.query_de].filter(Boolean).join(', '),
        procurement: f.id === 'SF-01' ? 'test fixture, Prüfvorrichtung, mechanical testing fixtures' : [f.query_en, f.query_de].filter(Boolean).join(', '),
        research: f.query_en || f.query_de,
      },
      geography: 'EU (TED), weltweit (EPO DOCDB, Crossref)',
      providers: { epo: true, ted: true, crossref: true },
      cap: 25, timeout: 15,
    };
    emit();
  },
  updatePlan(patch) {
    if (!state.plan) return;
    state.plan = { ...state.plan, ...patch, confirmed: false };
    save();
  },
  updatePlanTerm(key, value) { state.plan.terms[key] = value; state.plan.confirmed = false; save(); },
  confirmPlan() {
    const p = state.plan;
    const bad = Object.entries(p.terms).map(([k, v]) => [k, R.checkQuery(v)]).filter(([, r]) => !r.ok);
    if (bad.length) { flash('error', `Plan nicht bestätigt: ${bad.map(([k, r]) => `${k}: ${r.error}`).join('; ')}`); emit(); return; }
    p.cap = Math.max(20, Math.min(50, Number(p.cap) || 25));
    p.timeout = Math.max(5, Math.min(30, Number(p.timeout) || 15));
    p.confirmed = true; p.confirmedAt = nowIso(); p.version += 1;
    audit(`Rechercheplan v${p.version} bestätigt`); flash('ok', 'Plan bestätigt. Externe Abfragen sind jetzt freigegeben.'); emit();
  },

  addRun(run) {
    state.runs.unshift(run); ui.runId = run.id; ui.tab = run.results[0]?.kind || 'patent';
    audit(`${run.id} (${run.mode === 'live' ? 'live' : 'vorbereitet/offline'}) gestartet`); emit();
  },
  updateRun(id, patch) {
    const r = state.runs.find(x => x.id === id);
    if (r) Object.assign(r, patch);
    emit();
  },
  nextRunId() { return `RUN-${String(state.runs.length + 1).padStart(3, '0')}`; },

  addManualSource({ url, title, note, kind }) {
    let u;
    try { u = new URL(url); } catch { flash('error', 'Ungültige URL.'); emit(); return; }
    if (u.protocol !== 'https:') { flash('error', 'Nur https-Links.'); emit(); return; }
    const id = `MAN-${String(state.manualSources.length + 1).padStart(2, '0')}`;
    state.manualSources.push({ id, url: u.href, title: (title || u.hostname).slice(0, 200), note: (note || '').slice(0, 1000), kind: kind || 'product', addedAt: nowIso(), mode: 'manual' });
    audit(`Manuelle Quelle ${id}`); flash('ok', `${id} als manuelle Quelle (Analystennotiz) erfasst – nicht abgerufen, nicht geprüft.`); emit();
  },

  // Hypotheses are versioned: every change keeps the previous version in history.
  updateHyp(id, patch, reason) {
    const h = state.hypotheses.find(x => x.id === id);
    if (!h) return;
    const { history, ...snap } = h;
    h.history.unshift({ ...clone(snap), replacedAt: nowIso(), reason: reason || 'bearbeitet' });
    Object.assign(h, patch);
    h.version += 1;
    audit(`${id} v${h.version}: ${reason || 'bearbeitet'}`);
    emit();
  },
  reviewH01() {
    const missing = ['PAT-01', 'ALT-01'].filter(x => !foundInRuns(x));
    if (missing.length) { flash('warn', `Gegenbelege noch nicht in einem Recherchelauf gefunden: ${missing.join(', ')}.`); emit(); return; }
    actions.updateHyp('H-01', { status: 'novelty_rejected', source_ids: ['PAT-01', 'ALT-01'], reason: 'Grundidee bereits beschrieben (PAT-01) und kommerziell angeboten (ALT-01). Breite Markthypothese zurückgestellt; Marktbedarf ungeklärt. Keine Aussage zu Schutzrechtslage oder Verkaufsverbot.' }, 'Gegenbeleg geprüft');
    flash('ok', 'H-01: Neuheitsbehauptung verworfen, breite Hypothese zurückgestellt. Weiter mit der engeren H-02.');
    emit();
  },
  linkSource(hid, sid) {
    const h = state.hypotheses.find(x => x.id === hid);
    if (!h || h.source_ids.includes(sid)) return;
    actions.updateHyp(hid, { source_ids: [...h.source_ids, sid] }, `Quelle ${sid} verknüpft`);
  },
  addHyp({ title, buyer, deliverable, alternative, capability_ids, parent_id }) {
    if (!title?.trim()) { flash('error', 'Titel ist Pflicht.'); emit(); return; }
    const id = `H-U${String(state.hypotheses.filter(h => h.id.startsWith('H-U')).length + 1).padStart(2, '0')}`;
    state.hypotheses.push({ id, parent_id: parent_id || null, title: title.trim(), status: 'hypothesis', version: 1, history: [], buyer: buyer || '', deliverable: deliverable || '', alternative: alternative || '', capability_ids: capability_ids || [], source_ids: [], questions: ['Bedarf beim Käufer bestätigen', 'Technische Machbarkeit nachweisen'], reason: null, user: true });
    audit(`Eigene Hypothese ${id}`); flash('ok', `${id} angelegt (Status: Forschungshypothese).`); emit();
  },

  loadMatching() { state.matching.loaded = true; audit('Synthetischer Matchingfall geladen'); emit(); },
  togglePartner() { state.matching.partnerConfirmed = !state.matching.partnerConfirmed; emit(); },
  toggleAlternative() {
    state.matching.alternativeCovers = !state.matching.alternativeCovers;
    const m = matchingResult();
    if (m.hypothesisStatus === 'deferred') actions.updateHyp('H-02', { status: 'deferred', reason: m.reason, synthetic_basis: true }, 'Synthetischer Gegenbeleg-Test: Alternative deckt Anforderungen');
    else actions.updateHyp('H-02', { status: 'hypothesis', reason: null, synthetic_basis: false }, 'Synthetischer Gegenbeleg-Test zurückgenommen');
  },

  reset() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(UI_KEY); } catch { /* storage blocked */ }
    state = baseline();
    ui = { step: 1, viewer: null, flash: { type: 'ok', text: 'Demo auf Ausgangszustand zurückgesetzt.' }, edit: null, tab: 'patent', runId: null, filter: '' };
    emit();
  },
};

export function flashMsg(type, text) { flash(type, text); emit(); }
