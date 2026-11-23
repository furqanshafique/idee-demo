// Screens as pure render functions of store state. All external/untrusted
// text goes through esc(); links are only rendered for https URLs.
// UI text: L(de, en) for inline strings, tr() for German text from data/rules/store.
import * as store from './store.js';
import * as R from './rules.js';
import { L, tr, getLang, locale } from './i18n.js';

export const runtime = { status: null, blobs: {}, busy: null };

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(u || '') ? u : null);
const ext = (u, label) => (safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label || L('Original öffnen', 'Open original'))} ↗</a>` : `<span class="muted">${L('kein Link', 'no link')}</span>`);
const badge = (tone, t) => `<span class="badge ${tone}">${esc(t)}</span>`;
const fmtTime = iso => (iso ? new Date(iso).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' }) : '–');
const fmtDate = iso => (iso ? new Date(iso).toLocaleDateString(locale()) : L('unbekannt', 'unknown'));
const num = v => (getLang() === 'en' ? String(v) : String(v).replace('.', ','));
const provName = p => ({ epo: 'EPO OPS', 'epo-demo': L('Patente (Demo-Bestand)', 'Patents (demo set)'), ted: 'TED', crossref: 'Crossref', curated: L('Kuratiert', 'Curated') }[p] || p);

export const prov = {
  syn: () => `<span class="prov syn" title="${L('Erfundene Beispieldaten – keine Aussage über Ergo-Tec', 'Invented sample data – says nothing about Ergo-Tec')}">${L('Fiktiv', 'Fictional')}</span>`,
  cur: () => `<span class="prov cur" title="${L('Echte öffentliche Quelle, vorab herausgesucht – nicht live abgerufen', 'Real public source, selected in advance – not fetched live')}">${L('Vorbereitet', 'Prepared')}</span>`,
  pub: () => `<span class="prov cur" title="${L('Angabe von der Firmenwebsite, vorab geprüft', 'Taken from the company website, checked in advance')}">Website</span>`,
  live: (p, t) => `<span class="prov live" title="${L('Echte API-Antwort dieses Laufs', 'Real API response from this run')}">Live · ${esc(provName(p))}</span>`,
  man: () => `<span class="prov man" title="${L('Von Hand eingetragen – nicht abgerufen', 'Entered by hand – not fetched')}">${L('Manuell', 'Manual')}</span>`,
  claim: () => `<span class="prov claim">${L('Kundenaussage', 'Customer statement')}</span>`,
};
function provFor(r) {
  if (r.mode === 'live') return prov.live(r.provider, r.retrieved_at);
  if (r.mode === 'curated') return prov.cur();
  return prov.man();
}

const steps = () => [
  [1, L('Auftrag', 'Brief')], [2, L('Unternehmensprofil', 'Company profile')], [3, L('Anwendungsfelder', 'Application fields')], [4, L('Rechercheplan', 'Research plan')],
  [5, L('Recherche', 'Research')], [6, L('Chancen', 'Opportunities')], [7, 'Review', true], [8, L('Übergabe', 'Handover'), true],
];
const PREVIEW = () => L('Vorschau', 'Preview');

// ------------------------------------------------------------ chrome
export function header() {
  const s = store.getState();
  const st = runtime.status;
  const chip = (k, label) => {
    const v = st?.ok ? st.providers[k]?.status : st?.static ? 'demo' : 'offline';
    const tone = v === 'ready' ? 'ok' : v === 'not_configured' || v === 'demo' ? 'warn' : 'bad';
    const text = v === 'ready' ? L('bereit', 'ready') : v === 'demo' ? L('Demo-Bestand', 'demo set') : v === 'not_configured' ? (k === 'epo' ? L('Demo-Bestand', 'demo set') : L('nicht konfiguriert', 'not configured')) : L('Server fehlt', 'no server');
    return `<span class="pchip ${tone}" title="${esc(st?.ok ? st.providers[k]?.label : tr(st?.error) || '')}">${esc(label)}: ${text}</span>`;
  };
  const confirming = store.getUi().confirmReset;
  const lang = getLang();
  const langBtn = (code, label, name) => `<button class="lang-btn ${lang === code ? 'on' : ''}" data-act="lang" data-lang="${code}" aria-pressed="${lang === code}" title="${name}">${label}</button>`;
  return `
  <div class="demo-strip">${L('DEMO · Beispieldaten sind erfunden – keine echten Ergo-Tec-Daten', 'DEMO · Sample data is invented – no real Ergo-Tec data')}</div>
  <div class="topbar">
    <div class="brand"><div class="logo">D</div><div><strong>DEVOREO / IDEE</strong><small>Innovation Discovery Engine</small></div></div>
    <div class="ctx">
      <div class="ctx-item"><small>${L('Projekt', 'Project')}</small><strong title="${esc(tr(s.project.case))}">${esc(s.project.id)} · ${esc(s.project.company)} (Demo)</strong></div>
      <div class="ctx-item"><small>${L('Profilstand', 'Profile version')}</small><strong>v${s.profile.version}</strong></div>
    </div>
    <div class="tools">
      <div class="lang-switch" role="group" aria-label="${L('Sprache', 'Language')}">${langBtn('de', 'DE', 'Deutsch')}${langBtn('en', 'EN', 'English')}</div>
      ${confirming
        ? `<span class="confirm-reset">${L('Alle Demo-Daten löschen?', 'Delete all demo data?')} <button class="btn sm danger" data-act="reset-yes">${L('Ja, zurücksetzen', 'Yes, reset')}</button><button class="btn sm ghost" data-act="reset-no">${L('Abbrechen', 'Cancel')}</button></span>`
        : `<button class="btn ghost sm" data-act="reset-ask">${L('Demo zurücksetzen', 'Reset demo')}</button>`}
    </div>
  </div>`;
}

export function nav() {
  const cur = store.getUi().step;
  return steps().map(([n, label, preview]) => `
    <button class="nav-item ${n === cur ? 'active' : ''}" data-act="goto" data-step="${n}">
      <span class="num">${n}</span><span>${label}${preview ? ` <em class="pv">${PREVIEW()}</em>` : ''}</span><i class="dot ${store.stepStatus(n)}"></i>
    </button>`).join('') ;
}

export function flash() {
  const f = store.getUi().flash;
  return f ? `<div class="flash ${f.type}">${esc(tr(f.text))}<button class="x" data-act="flash-x" aria-label="${L('Schließen', 'Close')}">×</button></div>` : '';
}

export function screen() {
  const step = store.getUi().step;
  return [null, s1, s2, s3, s4, s5, s6, s7, s8][step]?.() || '';
}

// ------------------------------------------------------------ 1 Auftrag
function s1() {
  const s = store.getState();
  const p = s.project;
  const pubs = ['PUB-ET-MED', 'PUB-ET-IND'].map(store.publicSource);
  const ro = p.confirmed ? 'disabled' : '';
  return `
  <div class="page-head"><div><h2>1 · ${L('Auftrag', 'Brief')}</h2><p class="lead">${L('„Welche weiteren Leistungen können wir mit unseren vorhandenen Kompetenzen anbieten?“', '“Which other services can we offer with the skills we already have?”')}</p></div>
    ${p.confirmed ? badge('ok', `${L('Umfang bestätigt', 'Scope confirmed')} ${fmtTime(p.confirmedAt)}`) : badge('warn', L('Umfang noch nicht bestätigt', 'Scope not confirmed yet'))}</div>
  <div class="grid2">
    <section class="card">
      <header><h3>${L('Suchauftrag', 'Search brief')}</h3></header>
      <label class="lbl">${L('Ziel', 'Goal')}<textarea class="inp" rows="2" data-form="goal" ${ro}>${esc(tr(p.goal))}</textarea></label>
      <div class="form-grid">
        <label class="lbl">Region<input class="inp" data-form="region" value="${esc(tr(p.region))}" ${ro}></label>
        <label class="lbl">${L('Pilotbudget (EUR, leer = unbekannt)', 'Pilot budget (EUR, empty = unknown)')}<input class="inp" type="number" min="0" data-form="pilot_budget_eur" value="${esc(p.pilot_budget_eur ?? '')}" placeholder="${L('unbekannt', 'unknown')}" ${ro}></label>
      </div>
      <label class="lbl">${L('Bestehende Märkte (eine pro Zeile)', 'Existing markets (one per line)')}<textarea class="inp" rows="3" data-form="existing_markets" ${ro}>${esc(p.existing_markets.map(tr).join('\n'))}</textarea></label>
      <label class="lbl">${L('Ausschlüsse', 'Exclusions')}<input class="inp" data-form="exclusions" value="${esc(p.exclusions)}" placeholder="${L('z. B. keine Medizinprodukte-Zulassung als Hersteller', 'e.g. no medical device approval as manufacturer')}" ${ro}></label>
      <p class="note">${L('Budget, Personal und freie Kapazität bleiben offen, bis Ergo-Tec sie nennt.', 'Budget, staff and free capacity stay open until Ergo-Tec states them.')}</p>
      <div class="row">${p.confirmed
        ? `<button class="btn ghost" data-act="project-reopen">${L('Umfang bearbeiten', 'Edit scope')}</button><button class="btn primary" data-act="goto" data-step="2">${L('Weiter: Unternehmensprofil →', 'Next: Company profile →')}</button>`
        : `<button class="btn primary" data-act="project-confirm">${L('Umfang bestätigen und Projekt anlegen', 'Confirm scope and create project')}</button>`}</div>
    </section>
    <section class="card">
      <header><h3>${L('Öffentliche Unternehmensinformation', 'Public company information')}</h3>${prov.pub()}</header>
      <p class="small muted">${L('Echte Angaben von der Ergo-Tec-Website.', 'Real information from the Ergo-Tec website.')}</p>
      ${pubs.map(x => `<div class="src"><strong>${esc(tr(x.title))}</strong><span>${esc(tr(x.summary))}</span>${ext(x.url)}</div>`).join('')}
      <div class="callout warn">${L('Ergo-Tec baut bereits Prüfvorrichtungen. Prüftechnik ist also kein neuer Markt – offen ist, welche Anwendungen neu wären.', 'Ergo-Tec already builds test rigs, so testing is not a new market. What is open is which applications would be new.')}</div>
    </section>
  </div>`;
}

// ------------------------------------------------------------ 2 Profil
function capCard(c) {
  const ui = store.getUi();
  const editing = ui.edit === c.id;
  const doc = c.source?.document_id ? store.getState().documents.find(d => d.id === c.source.document_id) : null;
  const isClaim = c.origin === 'customer_claim';
  const tone = { proposed: 'neutral', confirmed: 'ok', corrected: 'ok', open: 'warn' }[c.confirmation];
  const params = Object.entries(c.parameters || {});
  const page = L('Seite', 'page');
  return `
  <article class="cap ${c.confirmation}" id="cap-${esc(c.id)}">
    <header><div><code>${esc(c.id)}</code> <strong>${esc(tr(c.title))}</strong></div>
      <div>${isClaim ? prov.claim() : prov.syn()} ${badge(tone, tr(R.CONFIRMATION[c.confirmation]))}</div></header>
    ${c.source?.quote ? `
    <blockquote${getLang() === 'en' ? ` lang="de" title="Original quote from the document (German)"` : ''}>„${esc(c.source.quote)}“</blockquote>
    <div class="meta">
      <button class="link" data-act="open-doc" data-doc="${esc(c.source.document_id)}" data-page="${c.source.page}">${esc(doc?.name || c.source.document_id)} · ${page} ${c.source.page}</button>
      ${c.verified ? badge('ok', L('Textstelle geprüft', 'Passage verified')) : badge('bad', L('Textstelle nicht gefunden', 'Passage not found'))}
    </div>` : `<div class="callout warn small">${L('Quelle: Interviewantwort', 'Source: interview answer')} ${esc(c.source?.interview || '')} · <b>${L('Nachweis ausstehend', 'Evidence pending')}</b>. ${L('Keine dokumentierte Fähigkeit.', 'Not a documented capability.')}</div>`}
    <dl class="kv3">
      <div><dt>${L('Quelle', 'Source')}</dt><dd>${esc(tr(R.ORIGIN[c.origin]))}</dd></div>
      <div><dt>${L('Wer macht es', 'Who does it')}</dt><dd>${esc(tr(R.CONTROL[c.control] || c.control))}</dd></div>
      <div><dt>${L('Übertragbar', 'Transferable')}</dt><dd>${esc(tr(R.TRANSFER[c.transfer]))}</dd></div>
    </dl>
    ${params.length ? `<div class="small"><b>${L('Nur für diesen Referenzaufbau:', 'Only for this reference setup:')}</b> ${params.map(([k, v]) => `${esc(k)} = ${esc(tr(v))}`).join(' · ')}</div>` : ''}
    ${(c.requires || []).length ? `<div class="small muted">${L('Voraussetzung/Grenze:', 'Prerequisite/limit:')} ${c.requires.map(r => (r === 'PB-17' ? `<button class="link" data-act="open-doc" data-doc="PB-17" data-page="2">${L('PB-17 S. 2 (nur Halteversuch R1/A, keine Grenzwerte)', 'PB-17 p. 2 (holding test R1/A only, no limit values)')}</button>` : esc(tr(r)))).join(', ')}</div>` : ''}
    ${c.q01Note ? `<div class="small note">${esc(tr(c.q01Note))}</div>` : ''}
    ${c.note ? `<div class="small note">${L('Korrektur:', 'Correction:')} ${esc(c.note)}</div>` : ''}
    ${editing ? `
    <div class="edit">
      <label class="lbl">${L('Titel', 'Title')}<input class="inp" id="ed-title" value="${esc(tr(c.title))}"></label>
      <div class="form-grid">
        <label class="lbl">${L('Kontrolle', 'Control')}<select class="inp" id="ed-control">${Object.entries(R.CONTROL).map(([k, v]) => `<option value="${k}" ${k === c.control ? 'selected' : ''}>${esc(tr(v))}</option>`).join('')}</select></label>
        <label class="lbl">Transfer<select class="inp" id="ed-transfer">${Object.entries(R.TRANSFER).map(([k, v]) => `<option value="${k}" ${k === c.transfer ? 'selected' : ''}>${esc(tr(v))}</option>`).join('')}</select></label>
      </div>
      <label class="lbl">${L('Begründung der Korrektur', 'Reason for the correction')}<input class="inp" id="ed-note" value="${esc(c.note || '')}"></label>
      <div class="row"><button class="btn primary sm" data-act="cap-save" data-id="${esc(c.id)}">${L('Korrektur speichern (neue Profilversion)', 'Save correction (new profile version)')}</button><button class="btn ghost sm" data-act="cap-cancel">${L('Abbrechen', 'Cancel')}</button></div>
    </div>` : `
    <div class="row">
      ${isClaim ? `<span class="small muted">${L('Kundenaussage bleibt offen, bis ein Nachweis vorliegt.', 'A customer statement stays open until there is evidence.')}</span>` : `
      <button class="btn sm ${c.confirmation === 'confirmed' ? 'primary' : 'secondary'}" data-act="cap-decide" data-id="${esc(c.id)}" data-d="confirmed">${L('Bestätigen', 'Confirm')}</button>
      <button class="btn sm ${c.confirmation === 'corrected' ? 'primary' : 'secondary'}" data-act="cap-edit" data-id="${esc(c.id)}">${L('Korrigieren', 'Correct')}</button>
      <button class="btn sm ${c.confirmation === 'open' ? 'primary' : 'ghost'}" data-act="cap-decide" data-id="${esc(c.id)}" data-d="open">${L('Offenlassen', 'Leave open')}</button>`}
    </div>`}
  </article>`;
}

function s2() {
  const s = store.getState();
  const seed = store.getSources().seed;
  const samples = [
    ['IDEE-01', L('Projektakte UL-01 (3 S.) – Hauptdokument', 'Project file UL-01 (3 pp.) – main document')],
    ['PB-17', L('Prüfbericht PB-17 R1/A – stützt CAP-04', 'Test report PB-17 R1/A – supports CAP-04')],
    ['IDEE-02', L('Ergänzender Fähigkeitsnachweis – optional, fügt CAP-05/06 hinzu', 'Additional capability evidence – optional, adds CAP-05/06')],
  ];
  const unknown = s.documents.filter(d => !d.known);
  const a = s.answers;
  const q3 = a['Q-03'];
  const anth = runtime.status?.providers?.anthropic?.status;
  const P = L('S.', 'p.');
  return `
  <div class="page-head"><div><h2>2 · ${L('Unternehmensprofil', 'Company profile')}</h2><p class="lead">${L('Was das Team im Beispielauftrag UL-01 nachweislich gemacht hat – jeweils mit Textstelle.', 'What the team demonstrably did in the sample order UL-01 – each with its text passage.')}</p></div>
    ${badge('neutral', `${L('Profilstand', 'Profile version')} v${s.profile.version}`)}</div>
  <section class="card">
    <header><h3>${L('Dokumente', 'Documents')}</h3>${prov.syn()}</header>
    <div class="docpick">
      ${samples.map(([id, label]) => {
        const done = s.documents.find(d => d.id === id);
        return `<div class="docopt ${done ? 'done' : ''}"><div><code>${id}</code> ${esc(label)}</div>
          <button class="btn sm ${done ? 'ghost' : 'secondary'}" data-act="import-sample" data-id="${id}">${done ? L('Erneut importieren', 'Import again') : L('Musterdokument übernehmen', 'Use sample document')}</button></div>`;
      }).join('')}
      <div class="docopt upload"><div><b>${L('Eigene PDF hochladen', 'Upload your own PDF')}</b><br><span class="small muted">${L('Nur synthetische/Demo-Unterlagen. Verarbeitung lokal im Browser.', 'Synthetic/demo documents only. Processed locally in the browser.')}</span></div>
        <label class="btn sm secondary filebtn">${L('Datei wählen', 'Choose file')}<input type="file" accept="application/pdf,.pdf" data-act="upload" hidden></label></div>
    </div>
    ${runtime.busy ? `<p class="callout info">${esc(runtime.busy)}</p>` : ''}
    ${s.documents.length ? `
    <table class="tbl"><thead><tr><th>ID</th><th>${L('Datei', 'File')}</th><th>${L('Seiten', 'Pages')}</th><th>${L('Seite öffnen', 'Open page')}</th></tr></thead><tbody>
      ${s.documents.map(d => `<tr><td><code>${esc(d.id)}</code></td><td>${esc(d.name)}${d.known ? '' : ' ' + badge('warn', L('unbekannt', 'unknown'))}</td><td>${d.pages}</td>
        <td>${Array.from({ length: Math.min(d.pages, 6) }, (_, i) => `<button class="link" data-act="open-doc" data-doc="${esc(d.id)}" data-page="${i + 1}">${P}${i + 1}</button>`).join(' ')}</td></tr>`).join('')}
    </tbody></table>` : `<p class="empty">${L('Noch kein Dokument importiert. Das Profil ist leer und unbestätigt.', 'No document imported yet. The profile is empty and unconfirmed.')}</p>`}
  </section>

  <section class="card">
    <header><h3>${L('Fähigkeiten', 'Capabilities')}</h3><span class="small muted">${L('Je Karte: Bestätigen, Korrigieren oder Offenlassen', 'Per card: confirm, correct or leave open')}</span></header>
    ${s.capabilities.length ? `<div class="caps">${s.capabilities.map(capCard).join('')}</div>` : `<p class="empty">${L('Keine Vorschläge. Musterdokument übernehmen oder Fähigkeit manuell mit Belegstelle anlegen.', 'No suggestions. Use a sample document or add a capability by hand with an evidence passage.')}</p>`}
    <div class="callout info small"><b>${L('Nicht belegt', 'Not evidenced')}</b> (IDEE-01, ${P} 3): ${L('Lastgrenzen, Genauigkeit, eigene CNC-Fertigung, eigene Motorenentwicklung, freie Kapazität.', 'load limits, accuracy, in-house CNC manufacturing, in-house motor development, free capacity.')}</div>
  </section>

  ${s.reviewQueue.length ? `<section class="card"><header><h3>${L('Prüfliste (nicht im Profil)', 'Review list (not in the profile)')}</h3>${badge('warn', `${s.reviewQueue.length} ${L('Einträge', 'entries')}`)}</header>
    <table class="tbl"><thead><tr><th>${L('Vorschlag', 'Suggestion')}</th><th>${L('Stelle', 'Location')}</th><th>${L('Zitat', 'Quote')}</th><th>Status</th></tr></thead><tbody>
    ${s.reviewQueue.map(r => `<tr><td>${esc(tr(r.title))}<div class="small muted">${esc(tr(r.method))}</div></td><td>${esc(r.source.document_id)} ${P}${esc(r.source.page)}</td><td class="small">„${esc(r.source.quote)}“</td><td>${r.verified ? badge('warn', L('verifiziert, Review', 'verified, review')) : badge('bad', L('nicht verifiziert', 'not verified'))}<div class="small">${esc(tr(r.reviewReason))}</div></td></tr>`).join('')}
    </tbody></table></section>` : ''}

  <div class="grid2">
    <section class="card">
      <header><h3>${L('Rückfragen an Ergo-Tec', 'Questions for Ergo-Tec')}</h3></header>
      ${seed.questions.slice(0, 2).map(q => `
      <div class="question"><b>${q.id}</b> ${esc(tr(q.question))}
        <div class="radios">${q.options.map(o => `<label><input type="radio" name="${q.id}" data-act="answer" data-q="${q.id}" value="${esc(o)}" ${a[q.id] === o ? 'checked' : ''}> ${esc(tr(o))}</label>`).join('')}</div>
</div>`).join('')}
      <div class="question"><b>Q-03</b> ${esc(tr(seed.questions[2].question))}
        <div class="form-grid4">
          ${[['load_kg', L('Last (kg)', 'Load (kg)')], ['position_error_mm', L('Pos.-Abw. (mm)', 'Pos. error (mm)')], ['quantity', L('Stück/Jahr', 'Units/year')], ['free_hours', L('freie Std.', 'free hours')]].map(([k, l]) => `<label class="lbl">${l}<input class="inp" type="number" step="any" data-form="q3:${k}" value="${esc(q3[k] ?? '')}" placeholder="${L('offen', 'open')}"></label>`).join('')}
        </div>
        <label class="lbl">${L('Beleg (Dokument + Seite) – ohne Beleg kein Wert', 'Evidence (document + page) – no evidence, no value')}<input class="inp" data-form="q3:evidence" value="${esc(q3.evidence)}" placeholder="${L('z. B. IDEE-02 S. 1', 'e.g. IDEE-02 p. 1')}"></label>
        <button class="btn sm secondary" data-act="q3-commit">${L('Q-03 übernehmen', 'Apply Q-03')}</button>
      </div>
    </section>
    <section class="card">
      <header><h3>${L('Fähigkeit von Hand ergänzen', 'Add a capability by hand')}</h3></header>
      ${s.documents.length ? `
      <div class="form-grid"><label class="lbl">${L('Dokument', 'Document')}<select class="inp" id="mc-doc">${s.documents.map(d => `<option value="${esc(d.id)}">${esc(d.id)} – ${esc(d.name)}</option>`).join('')}</select></label>
      <label class="lbl">${L('Seite', 'Page')}<input class="inp" id="mc-page" type="number" min="1" value="1"></label></div>
      <label class="lbl">${L('Titel', 'Title')}<input class="inp" id="mc-title" placeholder="${L('z. B. Baugruppenzeichnung erstellen', 'e.g. create assembly drawing')}"></label>
      <label class="lbl">${L('Textstelle (wörtlich aus dem Dokument)', 'Text passage (verbatim from the document)')}<textarea class="inp" id="mc-quote" rows="2"></textarea></label>
      <button class="btn sm secondary" data-act="manual-cap">${L('Anlegen', 'Create')}</button>` : `<p class="empty">${L('Zuerst ein Dokument importieren.', 'Import a document first.')}</p>`}
      ${unknown.map(d => `<details class="txt"><summary>${L('Extrahierter Text', 'Extracted text')} ${esc(d.name)} (${d.textChars} ${L('Zeichen', 'characters')})</summary>${d.pageTexts.map((t, i) => `<h4>${L('Seite', 'Page')} ${i + 1}</h4><pre>${esc(t.slice(0, 2500)) || `<i>${L('kein Text', 'no text')}</i>`}</pre>`).join('')}</details>`).join('')}
      ${anth === 'ready' ? `<hr><h4>${L('Optionale KI-Extraktion', 'Optional AI extraction')}</h4>
        <label class="switch"><input type="checkbox" id="llm-ok"> ${L('Ich gebe frei, dass der <b>Text eines synthetischen Musterdokuments</b> an die Claude API gesendet wird.', 'I approve sending the <b>text of a synthetic sample document</b> to the Claude API.')}</label>
        <div class="row">${s.documents.filter(d => d.known).map(d => `<button class="btn sm ghost" data-act="llm-extract" data-doc="${esc(d.id)}">${esc(d.id)} ${L('extrahieren', 'extract')}</button>`).join('') || `<span class="small muted">${L('Kein synthetisches Dokument importiert.', 'No synthetic document imported.')}</span>`}</div>
        <p class="small muted">${L('Antwort wird gegen ein Schema geprüft, jedes Zitat gegen den Seitentext verifiziert. Ergebnisse landen immer in der Prüfliste.', 'The answer is checked against a schema and every quote is verified against the page text. Results always go to the review list.')}</p>`
        : ''}
    </section>
  </div>
  <section class="card"><details><summary><b>${L('Änderungsverlauf', 'Change history')}</b></summary>
    ${s.profile.history.length ? `<ol class="hist">${s.profile.history.slice(0, 12).map(h => `<li><b>v${h.version}</b> <span class="muted">${fmtTime(h.at)}</span> ${esc(tr(h.reason))}</li>`).join('')}</ol>` : `<p class="empty">${L('Noch keine Änderungen.', 'No changes yet.')}</p>`}
  </details></section>
  ${store.activeCaps().length ? `<div class="row end"><button class="btn primary" data-act="goto" data-step="3">${L('Weiter: Anwendungsfelder →', 'Next: Application fields →')}</button></div>` : ''}`;
}

// ------------------------------------------------------------ 3 Anwendungsfelder
function s3() {
  const s = store.getState();
  const active = store.activeCaps();
  const sel = store.selectedCapIds();
  const fields = s.fields.map(f => ({ f, e: store.eligibility(f) }));
  const stepsDone = s.capabilities.filter(c => c.verified && c.source?.quote);
  const P = L('S.', 'p.');
  return `
  <div class="page-head"><div><h2>3 · ${L('Anwendungsfelder', 'Application fields')}</h2><p class="lead">${L('Vom Beispielauftrag zur Frage: Wem könnte Ergo-Tec dieses Können noch verkaufen?', 'From the sample order to the question: who else could Ergo-Tec sell this skill to?')}</p></div></div>
  <section class="card">
    <header><h3>${L('Vom Auftrag zur Idee', 'From order to idea')}</h3></header>
    <div class="chain4">
      <div class="lvl"><small>${L('Beispielauftrag', 'Sample order')}</small><b>UL-01 / Standard / R1</b><span>${L('Fiktive Untersuchungsliege für BeispielMed (Demo)', 'Fictional examination table for BeispielMed (demo)')}</span></div>
      <div class="lvl"><small>${L('Was gemacht wurde', 'What was done')}</small>${stepsDone.length ? stepsDone.map(c => `<button class="link chip" data-act="open-doc" data-doc="${esc(c.source.document_id)}" data-page="${c.source.page}" title="${esc(c.source.quote)}">${esc(c.source.document_id)} ${P}${c.source.page}: „${esc(c.source.quote.slice(0, 48))}…“</button>`).join('') : `<span class="muted">${L('Keine verifizierten Belegstellen', 'No verified evidence passages')}</span>`}</div>
      <div class="lvl"><small>${L('Was das Team kann', 'What the team can do')}</small>
        ${active.length ? active.map(c => `<label class="capsel ${sel.includes(c.id) ? 'on' : ''}"><input type="checkbox" data-act="cap-select" data-id="${esc(c.id)}" ${sel.includes(c.id) ? 'checked' : ''}> <button class="link" data-act="goto-cap" data-id="${esc(c.id)}">${esc(c.id)}</button> ${esc(tr(c.title))}</label>`).join('') : `<span class="muted">${L('Keine bestätigten Fähigkeiten – zuerst in Schritt 2 bestätigen.', 'No confirmed capabilities – confirm them in step 2 first.')}</span>`}
      </div>
      <div class="lvl"><small>${L('Wem man es verkaufen könnte', 'Who it could be sold to')}</small>
        ${fields.filter(x => x.e.eligible).map(({ f }) => `<span class="chip ok">${esc(f.id)} ${esc(tr(f.title))}</span>`).join('') || `<span class="muted">${L('Mit dieser Auswahl kein Feld ableitbar.', 'No field can be derived from this selection.')}</span>`}</div>
    </div>
  </section>
  <section class="card">
    <header><h3>${L('Ideen für neue Märkte', 'Ideas for new markets')}</h3><span class="small muted">${s.selectedFieldIds.length} ${L('von max. 2 ausgewählt', 'of max. 2 selected')}</span></header>
    <div class="fields">${fields.map(({ f, e }) => {
      const on = s.selectedFieldIds.includes(f.id);
      return `<article class="field ${e.eligible ? '' : 'inactive'} ${on ? 'on' : ''}">
        <header><div><code>${esc(f.id)}</code> <strong>${esc(tr(f.title))}</strong></div>${f.manual ? prov.man() : ''}</header>
        <div class="small">${L('Fähigkeiten', 'Capabilities')}: ${f.capability_ids.map(id => `<button class="link" data-act="goto-cap" data-id="${esc(id)}">${esc(id)}</button>`).join(', ')}</div>
        <div class="small">${L('Suchbegriffe', 'Search terms')}: <i>${esc(f.query_de)}</i> / <i>${esc(f.query_en)}</i></div>
        ${f.buyer_role ? `<div class="small">${L('Käuferrolle (Annahme)', 'Buyer role (assumption)')}: ${esc(tr(f.buyer_role))}</div>` : ''}
        ${f.id === 'SF-01' ? `<div class="small note">${L('Möglicher Lieferumfang: Komponente / Wechselaufnahme – <b>nicht</b> Bau einer kompletten Universalprüfmaschine.', 'Possible scope of supply: component / changeover fixture – <b>not</b> building a complete universal testing machine.')}</div>` : ''}
        ${f.id === 'SF-02' ? `<div class="small note warn">${L('Ausdrücklich unvalidierte Richtung.', 'Explicitly unvalidated direction.')}</div>` : ''}
        ${e.eligible ? `<button class="btn sm ${on ? 'primary' : 'secondary'}" data-act="field-toggle" data-id="${esc(f.id)}">${on ? L('✓ Ausgewählt', '✓ Selected') : L('Auswählen', 'Select')}</button>`
          : `<div class="small bad">${L('Inaktiv – fehlt', 'Inactive – missing')}: ${e.missing.map(m => `${esc(m.id)} (${esc(tr(m.reason))})`).join(', ')}</div>`}
      </article>`;
    }).join('')}</div>
    <div class="callout warn small">${L('Ob das für Ergo-Tec wirklich neu ist, klärt Rückfrage Q-02 (aktuell:', 'Whether this is really new for Ergo-Tec is settled by question Q-02 (currently:')} <b>${esc(tr(s.answers['Q-02']))}</b>).</div>
  </section>
  <section class="card"><details><summary><b>${L('Eigene Idee ergänzen', 'Add your own idea')}</b></summary>
    <div class="form-grid"><label class="lbl">${L('Titel', 'Title')}<input class="inp" id="nf-title"></label><label class="lbl">${L('Fähigkeiten (bestätigt)', 'Capabilities (confirmed)')}<div class="radios">${active.map(c => `<label><input type="checkbox" class="nf-cap" value="${esc(c.id)}"> ${esc(c.id)}</label>`).join('') || `<span class="muted">${L('keine', 'none')}</span>`}</div></label></div>
    <div class="form-grid"><label class="lbl">${L('Suchbegriffe DE', 'Search terms DE')}<input class="inp" id="nf-de"></label><label class="lbl">${L('Suchbegriffe EN', 'Search terms EN')}<input class="inp" id="nf-en"></label></div>
    <button class="btn sm secondary" data-act="field-add">${L('Anlegen', 'Create')}</button>
  </details></section>
  ${s.selectedFieldIds.length ? `<div class="row end"><button class="btn primary" data-act="goto" data-step="4">${L('Weiter: Rechercheplan →', 'Next: Research plan →')}</button></div>` : ''}`;
}

// ------------------------------------------------------------ 4 Rechercheplan
function s4() {
  const s = store.getState();
  const sel = s.selectedFieldIds.map(id => s.fields.find(f => f.id === id));
  const p = s.plan;
  const st = runtime.status;
  if (!sel.length) return `<div class="page-head"><h2>4 · ${L('Rechercheplan', 'Research plan')}</h2></div><p class="empty">${L('Zuerst in Schritt 3 eine Idee auswählen.', 'Select an idea in step 3 first.')}</p>`;
  const epoReady = st?.ok && st.providers.epo.status === 'ready';
  const termRow = (key, label, provider) => {
    const chk = R.checkQuery(p.terms[key]);
    return `<tr><td><b>${label}</b><div class="small muted">${provName(provider)}</div></td>
      <td><input class="inp" data-form="term:${key}" value="${esc(p.terms[key])}"></td>
      <td>${chk.ok ? badge('ok', 'ok') : badge('bad', tr(chk.error))}</td>
      <td><label class="switch"><input type="checkbox" data-act="plan-provider" data-p="${provider}" ${p.providers[provider] ? 'checked' : ''}> ${L('aktiv', 'active')}</label></td></tr>`;
  };
  const ready = L('bereit', 'ready');
  const demo = L('Demo-Bestand', 'demo set');
  return `
  <div class="page-head"><div><h2>4 · ${L('Rechercheplan', 'Research plan')}</h2><p class="lead">${L('Nur allgemeine Fachbegriffe gehen nach außen – keine Namen, Produkte oder Dokumente.', 'Only general technical terms leave the system – no names, products or documents.')}</p></div>
    ${p?.confirmed ? badge('ok', `Plan v${p.version} ${L('bestätigt', 'confirmed')} ${fmtTime(p.confirmedAt)}`) : badge('warn', L('Plan nicht bestätigt', 'Plan not confirmed'))}</div>
  <section class="card">
    <header><h3>${L('Suchfeld', 'Search field')}</h3></header>
    <div class="row">${sel.map(f => `<button class="btn sm ${p?.fieldId === f.id ? 'primary' : 'secondary'}" data-act="plan-init" data-id="${esc(f.id)}">${esc(f.id)} ${esc(tr(f.title))}</button>`).join('')}</div>
    ${!p ? `<p class="empty">${L('Suchfeld wählen, um den Plan zu erzeugen.', 'Choose a search field to create the plan.')}</p>` : `
    <table class="tbl plan"><thead><tr><th>${L('Quelltyp', 'Source type')}</th><th>${L('Suchbegriffe (Komma trennt)', 'Search terms (comma separated)')}</th><th>${L('Prüfung', 'Check')}</th><th></th></tr></thead><tbody>
      ${termRow('patent', L('Patente', 'Patents'), 'epo')}${termRow('procurement', L('Beschaffung', 'Procurement'), 'ted')}${termRow('research', L('Forschungssignale', 'Research signals'), 'crossref')}
    </tbody></table>
    <details><summary class="small">${L('Quellen und Grenzen', 'Sources and limits')}</summary>
    <div class="form-grid4">
      <label class="lbl">${L('Zielgebiet', 'Target region')}<input class="inp" data-form="plan:geography" value="${esc(tr(p.geography))}"></label>
      <label class="lbl">${L('Max. Treffer je Anbieter (20–50)', 'Max. hits per provider (20–50)')}<input class="inp" type="number" min="20" max="50" data-form="plan:cap" value="${esc(p.cap)}"></label>
      <label class="lbl">Timeout (s)<input class="inp" type="number" min="5" max="30" data-form="plan:timeout" value="${esc(p.timeout)}"></label>
      <label class="lbl">Budget<input class="inp" value="${L('0 EUR – nur frei zugängliche APIs', '0 EUR – freely accessible APIs only')}" disabled></label>
    </div>
    <table class="tbl small"><thead><tr><th>${L('Anbieter', 'Provider')}</th><th>${L('Erwartete Quelle', 'Expected source')}</th><th>${L('Abdeckung / Grenzen', 'Coverage / limits')}</th><th>Status</th></tr></thead><tbody>
      <tr><td>EPO OPS</td><td>${L('Veröffentlichte Patentanmeldungen (Titel/Abstract-Suche)', 'Published patent applications (title/abstract search)')}</td><td>${L('DOCDB weltweit; kein Rechtsstand, keine FTO; max. 25 je Abfrage; Fair-Use-Kontingent', 'DOCDB worldwide; no legal status, no FTO; max. 25 per query; fair-use quota')}</td><td>${epoReady ? badge('ok', ready) : badge('warn', L('Demo-Bestand (EPO nicht konfiguriert)', 'Demo set (EPO not configured)'))}</td></tr>
      <tr><td>TED</td><td>${L('EU-Bekanntmachungen (Volltext)', 'EU notices (full text)')}</td><td>${L('Nur öffentliche EU-Vergaben oberhalb der Schwellenwerte; Zuschläge ≠ neue Leads', 'Only public EU contracts above the thresholds; awards ≠ new leads')}</td><td>${st?.ok ? badge('ok', ready) : badge('warn', demo)}</td></tr>
      <tr><td>Crossref</td><td>${L('Publikations-Metadaten', 'Publication metadata')}</td><td>${L('Nur Metadaten; Stichprobe ≠ Markttrend', 'Metadata only; sample ≠ market trend')}</td><td>${st?.ok ? badge('ok', ready) : badge('warn', demo)}</td></tr>
    </tbody></table></details>
    <div class="row"><button class="btn primary" data-act="plan-confirm">${L('Plan bestätigen', 'Confirm plan')}</button>
      ${p.confirmed ? `<button class="btn secondary" data-act="goto" data-step="5">${L('Weiter: Recherche →', 'Next: Research →')}</button>` : ''}</div>`}
  </section>
`;
}

// Fixed one-click example: checks the claim "nobody has patented cold plasma
// for floor cleaning" against a prepared real patent (always the same result).
function kaltplasmaExample() {
  return `<section class="card sep">
    <header><h3>${L('Beispiel: Ist die Idee „Kaltplasma zur Bodenreinigung“ neu?', 'Example: is the idea “cold plasma for floor cleaning” new?')}</h3></header>
    <p class="small muted">${L('Zeigt in einer Minute, wie das System eine Behauptung „Das gibt es noch nicht“ mit einem echten Patent prüft.', 'Shows in one minute how the system checks a claim like “this doesn’t exist yet” against a real patent.')}</p>
    <button class="btn secondary" data-act="example-kaltplasma">${L('Beispiel prüfen', 'Check example')}</button>
  </section>`;
}

// ------------------------------------------------------------ 5 Recherche
const kindTabs = () => [['patent', L('Patente', 'Patents')], ['procurement', L('Ausschreibungen', 'Tenders')], ['research', L('Fachartikel', 'Articles')], ['product', L('Produkte am Markt', 'Products on the market')]];
const statusLabel = st => ({
  running: ['neutral', L('läuft …', 'running …')], succeeded: ['ok', L('erfolgreich', 'succeeded')], empty: ['neutral', L('erfolgreich, 0 Treffer', 'succeeded, 0 hits')],
  partial: ['warn', L('teilweise', 'partial')], failed: ['bad', L('fehlgeschlagen', 'failed')], not_configured: ['warn', L('nicht konfiguriert', 'not configured')],
}[st] || ['neutral', st]);
const stBadge = st => badge(...statusLabel(st));

function patentCard(r) {
  const open = L('Patent öffnen', 'Open patent');
  if (r.curatedId === 'PAT-01') return `
  <div class="pcard"><h4>${L('Welches Problem beschreibt das Patent?', 'Which problem does the patent describe?')}</h4>
    <dl class="kv">
      <dt>${L('Problem', 'Problem')}</dt><dd>${L('Beim Wechsel zwischen verschiedenen Proben und Prüfarten müssen Prüfaufnahmen umgebaut werden – das kostet Zeit (sinngemäß aus Abschnitt [0003]).', 'Switching between different specimens and test types means rebuilding test fixtures, which takes time (paraphrased from section [0003]).')}</dd>
      <dt>${L('Lösung im Patent', 'Solution in the patent')}</dt><dd>${esc(tr(r.solution))}</dd>
      <dt>${L('Quelle', 'Source')}</dt><dd>${ext(r.url, open)}</dd>
      <dt>${L('Veröffentlicht', 'Published')}</dt><dd>${fmtDate(r.date)}</dd>
      <dt>${L('Was das bedeutet', 'What this means')}</dt><dd>${L('Die Grundidee „modulare Prüfaufnahme“ ist schon bekannt. Ob heute jemand dafür zahlt und ob das Patent noch gilt, ist offen.', 'The basic idea of a “modular test fixture” is already known. Whether anyone pays for it today, and whether the patent is still in force, is open.')}</dd>
    </dl></div>`;
  if (r.curatedId === 'PAT-02') return `
  <div class="pcard"><h4>${L('Ergebnis: Die Idee ist bereits beschrieben.', 'Result: the idea has already been described.')}</h4>
    <p>${L('Das Patent DE102011010355A1 beschreibt ein Bodenreinigungsgerät mit eingebautem Plasma-Applikator (Ansprüche 1 und 2).', 'Patent DE102011010355A1 describes a floor cleaning device with a built-in plasma applicator (claims 1 and 2).')} ${ext(r.url, open)}</p>
    <table class="tbl dims">
      <tr><td>${L('Idee neu?', 'Is the idea new?')}</td><td>${badge('bad', L('Nein – bereits beschrieben', 'No – already described'))}</td></tr>
      <tr><td>${L('Gibt es einen Markt?', 'Is there a market?')}</td><td>${badge('warn', L('offen', 'open'))}</td></tr>
      <tr><td>${L('Haben Kunden das Problem heute?', 'Do customers have the problem today?')}</td><td>${badge('warn', L('offen', 'open'))}</td></tr>
      <tr><td>${L('Gilt das Patent noch?', 'Is the patent still in force?')}</td><td>${badge('warn', L('nicht geprüft', 'not checked'))}</td></tr>
    </table>
    <div class="callout info small"><b>${L('Bezug zu Ergo-Tec:', 'Link to Ergo-Tec:')}</b> ${L('Nächste Frage wäre, ob Hersteller von Reinigungsgeräten Aufwand mit wechselnden Aufsätzen haben. Dafür braucht es modulare Mechanik und saubere Montage – das entspricht', 'The next question would be whether makers of cleaning devices struggle with changing attachments. That needs modular mechanics and clean assembly, which matches')}
      <button class="link" data-act="goto-cap" data-id="CAP-01">CAP-01</button> ${L('und', 'and')} <button class="link" data-act="goto-cap" data-id="CAP-03">CAP-03</button> ${L('im Beispielprofil. Plasma selbst muss Ergo-Tec dafür nicht können.', 'in the sample profile. Ergo-Tec would not need plasma expertise for this.')}</div></div>`;
  if (r.mode === 'live' && r.provider === 'epo') return `
  <div class="pcard"><h4>${esc(r.identifier)} ${prov.live('epo', r.retrieved_at)}</h4>
    <dl class="kv"><dt>${L('Titel', 'Title')}</dt><dd>${esc(r.title)}</dd><dt>Abstract</dt><dd>${r.abstract ? `${esc(r.abstract)} <span class="small muted">(${L('nur Kurzfassung', 'abstract only')})</span>` : L('nicht geliefert', 'not provided')}</dd>
    <dt>${L('Rechtsstand', 'Legal status')}</dt><dd>${L('unbekannt – nicht geprüft', 'unknown – not checked')}</dd></dl></div>`;
  return '';
}

function s5() {
  const s = store.getState();
  const ui = store.getUi();
  const run = store.currentRun();
  const p = s.plan;
  const st = runtime.status;
  const canLive = p?.confirmed && st?.ok;
  const tabs = kindTabs();
  const results = run ? run.results.filter(r => r.kind === ui.tab && (!ui.filter || `${r.title} ${r.identifier}`.toLowerCase().includes(ui.filter.toLowerCase()))) : [];
  const counts = Object.fromEntries(tabs.map(([k]) => [k, run ? run.results.filter(r => r.kind === k).length : 0]));
  const groups = R.dedupeByFamily(results);
  const research = run ? run.results.filter(r => r.kind === 'research') : [];
  const years = R.signalsByYear(research);
  const hyps = s.hypotheses;
  return `
  <div class="page-head"><div><h2>5 · ${L('Recherche', 'Research')}</h2><p class="lead">${L('Sucht Patente, Ausschreibungen, Fachartikel und Produkte zur gewählten Idee.', 'Searches patents, tenders, articles and products for the chosen idea.')}</p></div></div>
  <section class="card">
    <header><h3>Start</h3>${p?.confirmed ? badge('ok', `Plan v${p.version}`) : badge('warn', L('Plan nicht bestätigt', 'Plan not confirmed'))}</header>
    ${st?.static ? `<div class="callout info">${L('In dieser Online-Version durchsucht die Recherche vorbereitete, echte Quellen (Kennzeichnung „Vorbereitet“).', 'In this online version, the research searches prepared real sources (labelled “Prepared”).')}</div>` : !st?.ok ? `<div class="callout bad">${esc(tr(st?.error) || L('Status unbekannt', 'Status unknown'))}</div>` : ''}
    ${st?.ok && st.providers.epo.status !== 'ready' ? `<div class="callout info">${L('Ausschreibungen und Fachartikel werden live gesucht, Patente in vorbereiteten Quellen.', 'Tenders and articles are searched live, patents in prepared sources.')}</div>` : ''}
    <div class="row">
      ${st?.static ? `<button class="btn primary" data-act="run-offline" ${p?.confirmed ? '' : 'disabled'}>${L('Recherche starten', 'Start research')}</button>` : `
      <button class="btn primary" data-act="run-live" ${canLive ? '' : 'disabled'}>${L('Recherche starten (live)', 'Start research (live)')}</button>
      <button class="btn secondary" data-act="run-offline" ${p?.confirmed ? '' : 'disabled'}>${L('Vorbereitete Recherche (offline)', 'Prepared research (offline)')}</button>`}
      ${!p?.confirmed ? `<span class="small muted">${L('Zuerst in Schritt 4 den Plan bestätigen.', 'Confirm the plan in step 4 first.')}</span>` : ''}
    </div>
  </section>
  ${s.runs.length ? `
  <section class="card">
    <header><h3>${L('Suchläufe', 'Search runs')}</h3><select class="inp narrow" data-act="run-select">${s.runs.map(r => `<option value="${esc(r.id)}" ${run?.id === r.id ? 'selected' : ''}>${esc(r.id)} · ${esc(tr(r.label))} · ${fmtTime(r.startedAt)}</option>`).join('')}</select></header>
    <details><summary class="small">${L('Details zu diesem Suchlauf', 'Details of this search run')} (${run.mode === 'live' ? 'live' : L('vorbereitete Quellen', 'prepared sources')})</summary>
    <table class="tbl"><thead><tr><th>${L('Quelle', 'Source')}</th><th>${L('Suchbegriffe', 'Search terms')}</th><th>Status</th><th>${L('Treffer', 'Hits')}</th><th>${L('Zeit', 'Time')}</th><th>${L('Dauer', 'Duration')}</th></tr></thead><tbody>
      ${run.queries.map(q => `<tr><td>${esc(provName(q.provider))}</td><td><code>${esc(q.query)}</code></td><td>${stBadge(q.status)}${q.error ? `<div class="small bad">${esc(tr(q.error))}</div>` : ''}${q.note ? `<div class="small muted">${esc(tr(q.note))}</div>` : ''}</td>
        <td>${q.status === 'running' ? '…' : `${q.count} / ${q.total ?? '?'}`}</td><td class="small">${fmtTime(q.fetchedAt)}</td><td class="small">${q.durationMs != null ? `${q.durationMs} ms` : '–'}</td></tr>`).join('')}
    </tbody></table></details>
    ${run.status === 'partial' || run.status === 'failed' ? `<div class="callout warn small">${L('Eine Quelle hat nicht geantwortet. Es werden keine Ersatzergebnisse erfunden.', 'A source did not respond. No substitute results are invented.')}</div>` : ''}
  </section>
  <section class="card">
    <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${l} <span class="cnt">${counts[k]}</span></button>`).join('')}
      <input class="inp narrow" data-form="filter" placeholder="Filter …" value="${esc(ui.filter)}"></div>
    ${groups.length ? groups.map(g => {
      const r = g[0];
      return `<article class="res">
        <header><div>${provFor(r)} <code>${esc(r.identifier)}</code> <strong>${esc(tr(r.title))}</strong></div>
          <div class="small muted">${r.date ? fmtDate(r.date) : L('Datum unbekannt', 'Date unknown')}</div></header>
        <div class="small">${[
          r.notice_type_label && `${L('Typ', 'Type')}: ${esc(r.notice_type_label)}${String(r.notice_type || '').startsWith('can') ? ` ${L('(bereits vergeben – kein offener Auftrag)', '(already awarded – not an open contract)')}` : ''}`,
          r.buyer_country && `${L('Land', 'Country')}: ${esc(r.buyer_country)}`, r.doc_type && `${L('Art', 'Kind')}: ${esc(r.doc_type)}`, r.container && esc(r.container),
          r.applicants?.length && `${L('Anmelder', 'Applicants')}: ${esc(r.applicants.join(', '))}`,
          r.mode !== 'live' && r.summary && esc(tr(r.summary)),
        ].filter(Boolean).join(' · ')}</div>
        ${g.length > 1 ? `<div class="small muted">+${g.length - 1} ${L('weitere Meldung(en) zum selben Vorgang (zählt einmal)', 'more notice(s) for the same procedure (counted once)')}: ${g.slice(1).map(x => esc(x.identifier)).join(', ')}</div>` : ''}
        ${patentCard(r)}
        <div class="row">${ext(r.url)}
          <select class="inp narrow" data-act="link-src" data-sid="${esc(r.id)}"><option value="">${L('Einer Idee zuordnen …', 'Link to an idea …')}</option>${hyps.map(h => `<option value="${esc(h.id)}">${esc(h.id)} ${esc(tr(h.title).slice(0, 40))}${h.source_ids.includes(r.id) ? ' ✓' : ''}</option>`).join('')}</select></div>
      </article>`;
    }).join('') : `<p class="empty">${run.status === 'running' ? L('Abfrage läuft …', 'Query running …') : L('Keine Treffer in dieser Kategorie.', 'No hits in this category.')}</p>`}
  </section>
  ${years.length ? `<section class="card">
    <header><h3>${L('Fachartikel nach Erscheinungsjahr', 'Articles by publication year')}</h3></header>
    <div class="bars">${years.map(y => `<div class="bar"><span style="height:${Math.round(100 * y.n / Math.max(...years.map(v => v.n)))}%"></span><small>${y.year}</small><b>${y.n}</b></div>`).join('')}</div>
      <p class="small muted">${L(`Nur die ${research.length} geladenen Treffer – zeigt keinen Markttrend.`, `Only the ${research.length} loaded hits – this is not a market trend.`)}</p>
  </section>` : ''}` : ''}
  ${kaltplasmaExample()}
  <section class="card"><details><summary><b>${L('Quelle von Hand ergänzen', 'Add a source by hand')}</b></summary>
    <div class="form-grid4"><label class="lbl">URL (https)<input class="inp" id="ms-url"></label><label class="lbl">${L('Titel', 'Title')}<input class="inp" id="ms-title"></label>
      <label class="lbl">${L('Art', 'Kind')}<select class="inp" id="ms-kind"><option value="product">${L('Produkt/Gegenbeleg', 'Product/counterevidence')}</option><option value="buyer">${L('Käufersignal', 'Buyer signal')}</option><option value="research">${L('Forschung', 'Research')}</option></select></label>
      <label class="lbl">${L('Notiz', 'Note')}<input class="inp" id="ms-note"></label></div>
    <button class="btn sm secondary" data-act="manual-src">${L('Hinzufügen', 'Add')}</button>
    ${s.manualSources.length ? `<ul class="mini">${s.manualSources.map(m => `<li><code>${esc(m.id)}</code> ${esc(m.title)} · ${ext(m.url)} · ${esc(m.note)}</li>`).join('')}</ul>` : ''}
  </details></section>`;
}

// ------------------------------------------------------------ 6 Chancen
export const dimLabels = () => ({
  kompetenz: L('Kann Ergo-Tec das?', 'Can Ergo-Tec do it?'), bedarf: L('Braucht das jemand?', 'Does anyone need it?'),
  differenzierung: L('Gibt es das schon?', 'Does it already exist?'), ressourcen: L('Budget und Zeit', 'Budget and time'), ip: L('Patente / Recht', 'Patents / legal'),
});

function dimTable(a) {
  return `<table class="tbl dims">${Object.entries(dimLabels()).map(([k, l]) => `<tr><td>${l}</td><td>${badge(a.dims[k].tone, tr(a.dims[k].status))}</td><td class="small">${esc(tr(a.dims[k].note || ''))}</td></tr>`).join('')}</table>
  <div class="small ${a.priorityAllowed ? '' : 'bad'}">${a.priorityAllowed ? L('<b>Kann priorisiert werden</b> – Bedarf trotzdem beim Käufer bestätigen.', '<b>Can be prioritised</b> – still confirm demand with the buyer.') : `<b>${L('Noch nicht priorisierbar:', 'Cannot be prioritised yet:')}</b> ${esc(a.blockers.map(tr).join('; '))}.`}</div>`;
}

function hypCard(h) {
  const a = store.assess(h);
  const s = store.getState();
  const tone = { novelty_rejected: 'bad', deferred: 'warn', rejected: 'bad', hypothesis: 'neutral', unreviewed: 'neutral' }[h.status];
  const srcs = h.source_ids.map(id => ({ id, r: store.resolveSource(id) }));
  const editable = h.id !== 'H-01';
  return `
  <article class="hyp ${h.status}" id="hyp-${esc(h.id)}">
    <header><div><code>${esc(h.id)}</code>${h.parent_id ? ` <span class="small muted">← ${esc(h.parent_id)}</span>` : ''} <strong>${esc(tr(h.title))}</strong></div>
      <div>${badge(tone, tr(R.HYP_STATUS[h.status] || h.status))} ${h.user ? prov.man() : ''}</div></header>
    ${h.reason ? `<div class="callout ${h.status === 'hypothesis' ? 'info' : 'warn'} small"><b>${L('Begründung:', 'Reason:')}</b> ${esc(tr(h.reason))}${h.synthetic_basis ? ` ${L('(fiktiver Test)', '(fictional test)')}` : ''}</div>` : ''}
    <div class="grid2 tight">
      <div>
        ${editable ? `
        <label class="lbl">${L('Wer würde kaufen?', 'Who would buy?')}<input class="inp" id="h-buyer-${esc(h.id)}" value="${esc(tr(h.buyer))}"></label>
        <label class="lbl">${L('Was genau verkaufen wir?', 'What exactly do we sell?')}<input class="inp" id="h-deliv-${esc(h.id)}" value="${esc(tr(h.deliverable))}"></label>
        <label class="lbl">${L('Was nutzt der Käufer heute?', 'What does the buyer use today?')}<input class="inp" id="h-alt-${esc(h.id)}" value="${esc(tr(h.alternative))}"></label>
        <label class="lbl">${L('Offene Fragen', 'Open questions')}<textarea class="inp" rows="3" id="h-q-${esc(h.id)}">${esc(h.questions.map(tr).join('\n'))}</textarea></label>
        <button class="btn sm secondary" data-act="hyp-save" data-id="${esc(h.id)}">${L('Speichern', 'Save')}</button>`
        : `<p>${L('Erste, breite Idee. Prüfen, ob es so etwas schon gibt.', 'First, broad idea. Check whether something like it already exists.')}</p>
           ${h.status === 'unreviewed' ? `<button class="btn sm primary" data-act="h01-review">${L('Gegen Patente und Produkte prüfen', 'Check against patents and products')}</button>
             ${store.foundInRuns('PAT-01') && store.foundInRuns('ALT-01') ? '' : `<div class="small muted">${L('Zuerst in Schritt 5 die Recherche starten.', 'Start the research in step 5 first.')}</div>`}` : ''}`}
        <h4>${L('Fähigkeiten', 'Capabilities')}</h4><div>${h.capability_ids.map(id => {
          const c = s.capabilities.find(x => x.id === id);
          return `<button class="link chip ${R.isActiveCapability(c) ? 'ok' : 'gap'}" data-act="goto-cap" data-id="${esc(id)}">${esc(id)}${R.isActiveCapability(c) ? '' : ` ${L('(offen)', '(open)')}`}</button>`;
        }).join(' ')}</div>
        <h4>${L('Quellen', 'Sources')}</h4>
        <ul class="mini">${srcs.map(({ id, r }) => `<li><code>${esc(id)}</code> ${r ? `${provFor(r)} ${esc(tr(r.title))} · ${ext(r.url)}` : `<span class="muted">${L('nicht aufgelöst', 'not resolved')}</span>`}</li>`).join('') || `<li class="muted">${L('keine', 'none')}</li>`}</ul>
      </div>
      <div><h4>${L('Stand der Prüfung', 'Review status')}</h4>${dimTable(a)}</div>
    </div>
    ${h.history.length ? `<details><summary class="small">${L('Verlauf', 'History')} (${h.history.length})</summary><ol class="hist">${h.history.map(v => `<li><b>v${v.version}</b> ${esc(tr(R.HYP_STATUS[v.status] || v.status))} – ${L('ersetzt', 'replaced')} ${fmtTime(v.replacedAt)}: ${esc(tr(v.reason))}</li>`).join('')}</ol></details>` : ''}
  </article>`;
}

function s6() {
  const s = store.getState();
  const m = s.matching;
  const loaded = ['IDEE-02', 'IDEE-03'].every(id => s.documents.some(d => d.id === id));
  const res = m.loaded ? store.matchingResult() : null;
  const cap5 = s.capabilities.find(c => c.id === 'CAP-05');
  const req = store.getSources().seed.synthetic_matching_case;
  const P = L('S.', 'p.');
  return `
  <div class="page-head"><div><h2>6 · ${L('Chancen', 'Opportunities')}</h2><p class="lead">${L('Aus Recherche und Fähigkeiten werden Geschäftsideen – mit Gegenargumenten und offenen Fragen. Vorläufig, keine Investitionsentscheidung.', 'Research and capabilities become business ideas, with counterarguments and open questions. Preliminary, not an investment decision.')}</p></div></div>
  ${s.hypotheses.map(hypCard).join('')}
  <section class="card"><details><summary><b>${L('Eigene Idee ergänzen', 'Add your own idea')}</b></summary>
    <div class="form-grid"><label class="lbl">${L('Titel', 'Title')}<input class="inp" id="nh-title"></label><label class="lbl">${L('Zielkäufer', 'Target buyer')}<input class="inp" id="nh-buyer"></label></div>
    <div class="form-grid"><label class="lbl">${L('Lieferumfang', 'Scope of supply')}<input class="inp" id="nh-deliv"></label><label class="lbl">${L('Was nutzt der Käufer heute?', 'What does the buyer use today?')}<input class="inp" id="nh-alt"></label></div>
    <div class="radios">${store.activeCaps().map(c => `<label><input type="checkbox" class="nh-cap" value="${esc(c.id)}"> ${esc(c.id)}</label>`).join('')}</div>
    <button class="btn sm secondary" data-act="hyp-add">${L('Anlegen', 'Create')}</button>
  </details></section>
  <section class="card syncase">
    <header><h3>${L('Rechenbeispiel: Reicht das Können für eine konkrete Anfrage?', 'Worked example: is the skill enough for a specific request?')}</h3>${prov.syn()}</header>
    ${!m.loaded ? `<p>${L('Ein fiktiver Kunde fragt eine Aufnahme für 50 kg mit 0,1 mm Genauigkeit an. Nachgewiesen sind bisher 25 kg mit 0,5 mm.', 'A fictional customer asks for a fixture for 50 kg with 0.1 mm accuracy. So far, 25 kg with 0.5 mm is proven.')}</p>
      <button class="btn secondary" data-act="matching-load">${L('Beispiel laden', 'Load example')}</button>` : `
    ${!loaded || !cap5 ? `<div class="callout warn">${L('Dokumente oder CAP-05 fehlen.', 'Documents or CAP-05 missing.')}</div>` : ''}
    <table class="tbl"><thead><tr><th></th><th>${L('Nachgewiesen', 'Proven')}</th><th>${L('Angefragt', 'Requested')}</th></tr></thead><tbody>
      <tr><td>${L('Last', 'Load')}</td><td>${esc(cap5?.parameters?.reference_load_kg ?? '?')} kg <button class="link" data-act="open-doc" data-doc="IDEE-02" data-page="1">${P}1</button></td><td>${req.required_load_kg} kg <button class="link" data-act="open-doc" data-doc="IDEE-03" data-page="1">${P}1</button></td></tr>
      <tr><td>${L('Positionierabweichung', 'Positioning error')}</td><td>${esc(num(cap5?.parameters?.reference_position_error_mm ?? '?'))} mm</td><td>max. ${num(req.max_position_error_mm)} mm</td></tr>
      <tr><td>${L('Bedingungen', 'Conditions')}</td><td>${esc(tr(cap5?.parameters?.conditions || '?'))}</td><td>${L('statisch; Zeichnung/Messbedingungen ausstehend', 'static; drawing/measuring conditions pending')}</td></tr>
      <tr><td>${L('Metallbearbeitung', 'Metalworking')}</td><td colspan="2">${L('Externer Partner (CAP-06)', 'External partner (CAP-06)')} – ${m.partnerConfirmed ? L('im Test als bestätigt markiert', 'marked as confirmed in the test') : L('Zusage für neue Aufträge liegt nicht vor', 'no commitment for new orders')}</td></tr>
      <tr><td>${L('Kapazität / Budget', 'Capacity / budget')}</td><td colspan="2">${L('offen (unbekannt)', 'open (unknown)')}</td></tr>
    </tbody></table>
    <div class="verdict ${res.transfer}"><b>${esc(tr(res.label))}</b><div class="small">${esc(tr(res.note))}</div></div>
    <label class="switch"><input type="checkbox" data-act="matching-alt" ${m.alternativeCovers ? 'checked' : ''}> ${L('Was wäre, wenn ein fertiges Produkt die Anfrage schon erfüllt?', 'What if a finished product already meets the request?')}</label>
    <p class="small muted">${L('Dann wird H-02 zurückgestellt. Der vorherige Stand bleibt im Verlauf.', 'Then H-02 is deferred. The previous state stays in the history.')}</p>`}
  </section>`;
}

// ------------------------------------------------------------ 7 / 8
export function missingData() {
  const s = store.getState();
  const out = [];
  if (!s.project.confirmed) out.push(L('Projektumfang nicht bestätigt', 'Project scope not confirmed'));
  if (s.project.pilot_budget_eur == null || s.project.pilot_budget_eur === '') out.push(L('Pilotbudget unbekannt', 'Pilot budget unknown'));
  out.push(L('Freie Kapazität (Stunden) unbekannt', 'Free capacity (hours) unknown'));
  if (s.answers['Q-01'] === 'Ungeklärt') out.push(L('Q-01 Antriebsentwicklung vs. Integration ungeklärt', 'Q-01 drive development vs. integration unclear'));
  if (s.answers['Q-01'] === 'Eigenentwicklung') out.push(L('Q-01 Kundenaussage Eigenentwicklung – Nachweis ausstehend', 'Q-01 customer says in-house development – evidence pending'));
  if (s.answers['Q-02'] === 'Ungeklärt') out.push(L('Q-02 bestehende Prüfaufnahmen/Kundengruppen ungeklärt', 'Q-02 existing test fixtures/customer groups unclear'));
  const q3 = s.answers['Q-03'];
  ['load_kg', 'position_error_mm', 'quantity', 'free_hours'].forEach(k => { if (q3[k] == null || q3[k] === '') out.push(`Q-03 ${k} ${L('offen', 'open')}`); });
  s.capabilities.filter(c => c.confirmation === 'proposed' || c.confirmation === 'open').forEach(c => out.push(`${c.id} ${tr(R.CONFIRMATION[c.confirmation])}`));
  if (!s.runs.some(r => r.mode === 'live' && r.queries.some(q => q.provider === 'epo' && q.status === 'succeeded'))) out.push(L('Keine erfolgreiche Live-Patentsuche', 'No successful live patent search'));
  out.push(L('Rechtsstand / FTO aller Patente nicht geprüft', 'Legal status / FTO of all patents not checked'));
  out.push(L('Kein aktuelles authentisches Käufer-/Beschaffungssignal bestätigt', 'No recent authentic buyer/procurement signal confirmed'));
  return out;
}

function s7() {
  const s = store.getState();
  return `
  <div class="page-head"><div><h2>7 · Review <span class="pv">${PREVIEW()}</span></h2><p class="lead">${L('Zusammenschau zur internen Durchsicht. Keine Scores, keine Freigabe.', 'Overview for internal review. No scores, no approval.')}</p></div></div>
  <div class="grid2">
    <section class="card"><header><h3>${L('Profil', 'Profile')} v${s.profile.version}</h3>${prov.syn()}</header>
      <ul class="mini">${s.capabilities.map(c => `<li><code>${esc(c.id)}</code> ${esc(tr(c.title))} – ${esc(tr(R.ORIGIN[c.origin]))}, ${esc(tr(R.CONFIRMATION[c.confirmation]))}</li>`).join('') || `<li class="muted">${L('leer', 'empty')}</li>`}</ul></section>
    <section class="card"><header><h3>${L('Fehlende Daten / offene Punkte', 'Missing data / open points')}</h3></header><ul class="mini bad">${missingData().map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
  </div>
  <section class="card"><header><h3>${L('Recherchelauf-Übersicht', 'Research run overview')}</h3></header>
    <table class="tbl"><thead><tr><th>${L('Lauf', 'Run')}</th><th>${L('Modus', 'Mode')}</th><th>${L('Profil/Plan', 'Profile/plan')}</th><th>${L('Anbieter-Status', 'Provider status')}</th><th>${L('Treffer', 'Hits')}</th></tr></thead><tbody>
    ${s.runs.map(r => `<tr><td>${esc(r.id)}${r.separate ? ` ${L('(separat)', '(separate)')}` : ''}</td><td>${r.mode === 'live' ? 'LIVE' : L('vorbereitet/offline', 'prepared/offline')}</td><td>v${r.profileVersion} / ${r.planVersion ? 'v' + r.planVersion : '–'}</td><td>${r.queries.map(q => `${esc(provName(q.provider))}: ${stBadge(q.status)}`).join(' ')}</td><td>${r.results.length}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">${L('keine', 'none')}</td></tr>`}
    </tbody></table></section>
  <section class="card"><header><h3>${L('Hypothesen', 'Hypotheses')}</h3></header>
    <ul class="mini">${s.hypotheses.map(h => `<li><code>${esc(h.id)}</code> v${h.version} ${esc(tr(h.title))} – <b>${esc(tr(R.HYP_STATUS[h.status] || h.status))}</b>${h.reason ? `: ${esc(tr(h.reason))}` : ''}</li>`).join('')}</ul>
    <p class="small muted">${L('Eine spätere Bewertungsmatrix (Vorschau) würde nur aus belegten Werten rechnen; unbekannt ≠ 0. Hier bewusst nicht berechnet.', 'A later scoring matrix (preview) would only use evidenced values; unknown ≠ 0. Deliberately not calculated here.')}</p></section>
  <div class="row end"><button class="btn primary" data-act="goto" data-step="8">${L('Weiter: Übergabe →', 'Next: Handover →')}</button></div>`;
}

function s8() {
  return `
  <div class="page-head"><div><h2>8 · ${L('Übergabe', 'Handover')} <span class="pv">${PREVIEW()}</span></h2><p class="lead">${L('Recherche-Zusammenfassung zum Weitergeben. Es wird nichts versendet.', 'Research summary to pass on. Nothing is sent.')}</p></div></div>
  <section class="card">
    <div class="banner big">${L('Vorläufige Hypothese – keine Investitionsentscheidung', 'Preliminary hypothesis – not an investment decision')}</div>
    <p>${L('Der Bericht enthält Profil- und Laufversionen, Originalquellen mit Links und Abrufmodus (live / vorbereitet / manuell), offene Punkte, zurückgestellte Alternativen und den Hinweis auf synthetische Betriebsdaten.', 'The report contains profile and run versions, original sources with links and retrieval mode (live / prepared / manual), open points, deferred alternatives and the note on synthetic company data.')}</p>
    <div class="row"><button class="btn primary" data-act="export-view">${store.getUi().showReport ? L('Bericht ausblenden', 'Hide report') : L('Bericht anzeigen', 'Show report')}</button>
      ${runtime.status?.static ? '' : `<button class="btn secondary" data-act="export-html">${L('HTML-Bericht herunterladen', 'Download HTML report')}</button><button class="btn ghost" data-act="export-json">${L('JSON exportieren', 'Export JSON')}</button>`}</div>
    ${runtime.status?.static ? `<p class="small muted">${L('Downloads (HTML/JSON) sind in der lokalen Installation verfügbar.', 'Downloads (HTML/JSON) are available in the local installation.')}</p>` : ''}
  </section>
  ${store.getUi().showReport ? `<section class="card"><iframe id="report-frame" title="${L('Recherche-Zusammenfassung', 'Research summary')}" class="report-frame" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe></section>` : ''}`;
}

export function auditDrawer() { return ''; }
