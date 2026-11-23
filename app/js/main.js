// Bootstrap, event delegation, document import and the source-PDF side panel.
import * as store from './store.js';
import { header, nav, flash, screen, runtime, esc } from './views.js';
import { renderPdf } from './viewer.js';
import { readPdf } from './pdftext.js';
import { fetchStatus, startLive, startOffline, planSpecs } from './research.js';
import { checkQuery, validateExtraction } from './rules.js';
import { buildHtml, buildJson, download } from './export.js';
import { fileUrl } from './base.js';

const $ = sel => document.querySelector(sel);
const { actions } = store;

function render() {
  const a = document.activeElement;
  const focus = a?.dataset?.form || (a?.id && a.closest('#main') ? `#${a.id}` : null);
  const caret = a && 'selectionStart' in a ? a.selectionStart : null;
  const scroll = $('#main-wrap').scrollTop;
  $('#header').innerHTML = header();
  $('#nav').innerHTML = nav();
  $('#flash').innerHTML = flash();
  $('#main').innerHTML = screen();
  $('#main-wrap').scrollTop = scroll;
  const frame = document.getElementById('report-frame');
  if (frame) frame.srcdoc = buildHtml();
  if (focus) {
    const el = focus.startsWith('#') ? document.getElementById(focus.slice(1)) : document.querySelector(`[data-form="${focus}"]`);
    if (el && el.type !== 'checkbox' && el.type !== 'radio' && el.tagName !== 'SELECT') {
      el.focus();
      try { if (caret != null) el.setSelectionRange(caret, caret); } catch { /* number inputs */ }
    }
  }
}

// ------------------------------------------------------------ viewer
let viewerKey = null;
function docInfo(docId) {
  const s = store.getState();
  const d = s.documents.find(x => x.id === docId);
  const seed = store.seedDoc(docId);
  if (seed) return { url: fileUrl(seed.file), title: `${docId} · ${seed.file.split('/').pop()}`, imported: !!d, doc: d };
  if (d) return { url: runtime.blobs[docId] || null, title: `${d.id} · ${d.name}`, imported: true, doc: d, upload: true };
  return null;
}
async function renderViewer() {
  const v = store.getUi().viewer;
  const box = $('#viewer');
  document.body.classList.toggle('viewer-open', !!v);
  if (!v) { box.innerHTML = ''; viewerKey = null; return; }
  const key = `${v.docId}#${v.page}`;
  if (key === viewerKey) return;
  viewerKey = key;
  const info = docInfo(v.docId);
  const quotes = store.getState().capabilities.filter(c => c.source?.document_id === v.docId && c.source.page === v.page);
  box.innerHTML = `
    <header><div><small>Originaldokument ${info?.doc?.synthetic !== false ? '· fiktiv' : ''}</small><strong>${esc(info?.title || v.docId)}</strong></div>
      <button class="btn ghost sm" data-act="close-viewer" aria-label="Schließen">×</button></header>
    <div class="viewer-nav">
      <button class="btn ghost sm" data-act="viewer-page" data-d="-1">‹</button><span id="vp">Seite ${v.page}</span>
      <button class="btn ghost sm" data-act="viewer-page" data-d="1">›</button>
      ${info?.url ? `<a class="link" href="${info.url}#page=${v.page}" target="_blank" rel="noopener">In neuem Tab öffnen</a>` : ''}
    </div>
    ${quotes.length ? `<div class="vquotes">${quotes.map(c => `<div><code>${esc(c.id)}</code> „${esc(c.source.quote)}“</div>`).join('')}</div>` : ''}
    <div id="vcanvas" class="viewer-canvas"></div>`;
  const host = $('#vcanvas');
  if (!info?.url) {
    host.innerHTML = '<div class="viewer-missing"><strong>Upload nicht mehr im Speicher.</strong><br>Hochgeladene Dateien werden nur für die laufende Sitzung gehalten (Text und Hash bleiben gespeichert). Datei erneut hochladen, um sie anzuzeigen.</div>';
    return;
  }
  const res = await renderPdf(host, info.url, v.page);
  const label = $('#vp');
  if (res && label) { label.textContent = `Seite ${res.page} / ${res.pages}`; v.pages = res.pages; }
}
function openDoc(docId, page) {
  store.setUi({ viewer: { docId, page: Number(page) || 1 } }, false);
  renderViewer();
}

// ------------------------------------------------------------ import
async function importBytes(name, bytes, blobUrl) {
  runtime.busy = `${name}: PDF wird gelesen (pdf.js) …`; render();
  try {
    const parsed = await readPdf(bytes);
    const rec = actions.addDocument({ name, size: bytes.byteLength, ...parsed });
    if (blobUrl && rec && !rec.known) runtime.blobs[rec.id] = blobUrl;
    if (parsed.truncated) store.flashMsg('warn', `Nur die ersten Seiten wurden gelesen (Limit).`);
    return rec;
  } catch (e) {
    store.flashMsg('error', `${name}: ${e.message}`);
    return null;
  } finally { runtime.busy = null; render(); }
}
async function importSample(id) {
  const d = store.seedDoc(id);
  const r = await fetch(fileUrl(d.file), { cache: 'no-store' });
  if (!r.ok) return store.flashMsg('error', `${d.file} nicht ladbar (HTTP ${r.status}).`);
  const rec = await importBytes(d.file.split('/').pop(), new Uint8Array(await r.arrayBuffer()));
  if (rec && id !== 'IDEE-03') openDoc(id, 1);
  return rec;
}

// ------------------------------------------------------------ helpers
const val = id => document.getElementById(id)?.value ?? '';
async function refreshStatus() { runtime.status = await fetchStatus(); render(); }

// ------------------------------------------------------------ events
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) return;
  const { act } = el.dataset;
  const s = store.getState();
  switch (act) {
    case 'goto': {
      // A new step starts clean: the source panel and the last step's message
      // belong to the screen they were opened on.
      const step = Number(el.dataset.step);
      if (step !== store.getUi().step) store.setUi({ viewer: null, flash: null }, false);
      return actions.goto(step);
    }
    case 'flash-x': return store.setUi({ flash: null });
    case 'reset-ask': return store.setUi({ confirmReset: true });
    case 'reset-no': return store.setUi({ confirmReset: false });
    case 'reset-yes': runtime.blobs = {}; store.setUi({ confirmReset: false }, false); actions.reset(); viewerKey = null; return renderViewer();
    case 'project-confirm': return actions.confirmProject();
    case 'project-reopen': return actions.reopenProject();
    case 'import-sample': return importSample(el.dataset.id);
    case 'open-doc': return openDoc(el.dataset.doc, el.dataset.page);
    case 'close-viewer': store.setUi({ viewer: null }, false); return renderViewer();
    case 'viewer-page': {
      const v = store.getUi().viewer;
      const page = Math.min(Math.max(1, v.page + Number(el.dataset.d)), v.pages || 99);
      return openDoc(v.docId, page);
    }
    case 'cap-decide': return actions.setCapDecision(el.dataset.id, el.dataset.d);
    case 'cap-edit': return store.setUi({ edit: el.dataset.id });
    case 'cap-cancel': return store.setUi({ edit: null });
    case 'cap-save': return actions.correctCap(el.dataset.id, { title: val('ed-title').trim() || undefined, control: val('ed-control'), transfer: val('ed-transfer'), note: val('ed-note').trim() });
    case 'goto-cap': {
      store.setUi({ flash: null }, false);
      actions.goto(2);
      requestAnimationFrame(() => document.getElementById(`cap-${el.dataset.id}`)?.scrollIntoView({ block: 'center' }));
      return;
    }
    case 'q3-commit': return actions.commitQ03();
    case 'manual-cap': return actions.addManualCap({ docId: val('mc-doc'), page: val('mc-page'), quote: val('mc-quote'), title: val('mc-title') });
    case 'llm-extract': {
      if (!document.getElementById('llm-ok')?.checked) return store.flashMsg('warn', 'Bitte zuerst die Übermittlung ausdrücklich freigeben.');
      const doc = s.documents.find(d => d.id === el.dataset.doc);
      runtime.busy = 'KI-Extraktion läuft …'; render();
      try {
        const r = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc_id: doc.id, approved: true, pages: doc.pageTexts }) });
        const body = await r.json();
        if (body.status !== 'succeeded') return store.flashMsg('error', `KI-Extraktion: ${body.error || body.status}`);
        const v = validateExtraction(body.data, doc.pages);
        actions.addLlmCandidates(doc.id, v.items, body.model);
        if (!v.ok) store.flashMsg('warn', `Schemafehler verworfen: ${v.errors.join('; ')}`);
      } catch (err) { store.flashMsg('error', `KI-Extraktion fehlgeschlagen: ${err.message}`); } finally { runtime.busy = null; render(); }
      return;
    }
    case 'field-toggle': return actions.toggleField(el.dataset.id);
    case 'field-add': return actions.addField({ title: val('nf-title'), query_de: val('nf-de'), query_en: val('nf-en'), capability_ids: [...document.querySelectorAll('.nf-cap:checked')].map(x => x.value) });
    case 'plan-init': return actions.initPlan(el.dataset.id);
    case 'plan-confirm': return actions.confirmPlan();
    case 'run-live': {
      const p = s.plan;
      const specs = planSpecs(p);
      const bad = specs.map(sp => checkQuery(sp.query)).find(r => !r.ok);
      if (bad) return store.flashMsg('error', bad.error);
      await startLive({ specs, limit: p.cap, timeout: p.timeout, label: `${p.fieldId} Plan v${p.version}` });
      return refreshStatus();
    }
    case 'run-offline': {
      const p = s.plan;
      return startOffline({ queries: Object.values(p.terms).map(q => ({ query: q })), label: `${p.fieldId} Plan v${p.version}` });
    }
    case 'example-kaltplasma': {
      startOffline({ queries: [{ query: 'Kaltplasma, Bodenreinigung' }], label: 'Beispiel Kaltplasma', separate: true });
      return store.setUi({ tab: 'patent' });
    }
    case 'tab': return store.setUi({ tab: el.dataset.tab });
    case 'manual-src': return actions.addManualSource({ url: val('ms-url'), title: val('ms-title'), note: val('ms-note'), kind: val('ms-kind') });
    case 'h01-review': return actions.reviewH01();
    case 'hyp-save': {
      const id = el.dataset.id;
      const patch = { buyer: val(`h-buyer-${id}`), deliverable: val(`h-deliv-${id}`), alternative: val(`h-alt-${id}`), questions: val(`h-q-${id}`).split('\n').map(x => x.trim()).filter(Boolean) };
      // Only a real change creates a new version; otherwise the history fills with empty entries.
      const h = s.hypotheses.find(x => x.id === id);
      if (h && Object.entries(patch).every(([k, v]) => JSON.stringify(h[k] ?? (Array.isArray(v) ? [] : '')) === JSON.stringify(v))) {
        return store.flashMsg('info', `${id}: keine Änderung – keine neue Version angelegt.`);
      }
      return actions.updateHyp(id, patch, 'Felder bearbeitet');
    }
    case 'hyp-add': return actions.addHyp({ title: val('nh-title'), buyer: val('nh-buyer'), deliverable: val('nh-deliv'), alternative: val('nh-alt'), capability_ids: [...document.querySelectorAll('.nh-cap:checked')].map(x => x.value) });
    case 'matching-load': {
      for (const id of ['IDEE-02', 'IDEE-03']) if (!s.documents.some(d => d.id === id)) await importSample(id);
      const cap5 = store.getState().capabilities.find(c => c.id === 'CAP-05');
      if (!cap5) return store.flashMsg('error', 'CAP-05 konnte nicht verifiziert werden – Matchingfall nicht geladen.');
      actions.loadMatching(); return actions.goto(6);
    }
    case 'export-html': return download(`IDEE_${s.project.id}_Zusammenfassung_v${s.profile.version}.html`, buildHtml(), 'text/html');
    case 'export-json': return download(`IDEE_${s.project.id}_v${s.profile.version}.json`, JSON.stringify(buildJson(), null, 2), 'application/json');
    case 'export-view': return store.setUi({ showReport: !store.getUi().showReport });
    default:
  }
});

document.addEventListener('change', async e => {
  const el = e.target;
  const act = el.dataset.act;
  if (act === 'upload') {
    const f = el.files?.[0];
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { el.value = ''; return store.flashMsg('error', `${f.name}: Dateityp nicht unterstützt (nur PDF).`); }
    const bytes = new Uint8Array(await f.arrayBuffer());
    await importBytes(f.name, bytes, URL.createObjectURL(f));
    el.value = '';
  } else if (act === 'answer') actions.setAnswer(el.dataset.q, el.value);
  else if (act === 'cap-select') actions.toggleCapSelection(el.dataset.id);
  else if (act === 'plan-provider') { const p = store.getState().plan; actions.updatePlan({ providers: { ...p.providers, [el.dataset.p]: el.checked } }); render(); }
  else if (act === 'run-select') store.setUi({ runId: el.value });
  else if (act === 'link-src' && el.value) actions.linkSource(el.value, el.dataset.sid);
  else if (act === 'matching-alt') actions.toggleAlternative();
  else if (el.dataset.form?.startsWith('plan:') || el.dataset.form?.startsWith('term:')) render();
});

document.addEventListener('input', e => {
  const f = e.target.dataset?.form;
  if (!f) return;
  const v = e.target.value;
  if (f === 'existing_markets') actions.updateProject({ existing_markets: v.split('\n').map(x => x.trim()).filter(Boolean) });
  else if (f === 'pilot_budget_eur') actions.updateProject({ pilot_budget_eur: v === '' ? null : Number(v) });
  else if (['goal', 'region', 'exclusions'].includes(f)) actions.updateProject({ [f]: v });
  else if (f.startsWith('q3:')) { const k = f.slice(3); actions.setQ03({ [k]: k === 'evidence' ? v : (v === '' ? null : Number(v)) }); }
  else if (f.startsWith('term:')) actions.updatePlanTerm(f.slice(5), v);
  else if (f.startsWith('plan:')) actions.updatePlan({ [f.slice(5)]: v });
  else if (f === 'filter') store.setUi({ filter: v });
});

// ------------------------------------------------------------ boot
(async function boot() {
  try {
    const get = p => fetch(p, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); });
    const [seed, publicSources] = await Promise.all([get(fileUrl('data/seed.json')), get(fileUrl('data/public_sources.json'))]);
    store.init({ seed, publicSources });
    store.subscribe(() => { render(); renderViewer(); });
    render();
    await refreshStatus();
    window.__idee = { store, actions };
  } catch (e) {
    $('#main').innerHTML = `<div class="fatal"><b>App konnte nicht starten.</b><br>${esc(e.message)}<br>Lokal: <code>python3 server/server.py</code> starten und <code>http://127.0.0.1:8770/app/</code> öffnen.</div>`;
  }
})();
