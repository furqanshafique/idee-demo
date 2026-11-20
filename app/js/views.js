// Screens as pure render functions of store state. All external/untrusted
// text goes through esc(); links are only rendered for https URLs.
import * as store from './store.js';
import * as R from './rules.js';

export const runtime = { status: null, blobs: {}, busy: null };

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https:\/\//i.test(u || '') ? u : null);
const ext = (u, label) => (safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label || 'Original öffnen')} ↗</a>` : '<span class="muted">kein Link</span>');
const badge = (tone, t) => `<span class="badge ${tone}">${esc(t)}</span>`;
const fmtTime = iso => (iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const fmtDate = iso => (iso ? new Date(iso).toLocaleDateString('de-DE') : 'unbekannt');
const PROV_NAME = { epo: 'EPO OPS', 'epo-demo': 'Patente (Demo-Bestand)', ted: 'TED', crossref: 'Crossref', curated: 'Kuratiert' };

export const prov = {
  syn: () => '<span class="prov syn" title="Synthetische Demo-Betriebsdaten – keine Aussage über Ergo-Tec">Synthetisch</span>',
  cur: () => '<span class="prov cur" title="Geprüfter öffentlicher Datensatz, vorab kuratiert – NICHT von der App abgerufen">Vorbereiteter Referenztreffer</span>',
  pub: () => '<span class="prov cur" title="Öffentliche Selbstauskunft, vorab kuratiert">Öffentliche Quelle (kuratiert)</span>',
  live: (p, t) => `<span class="prov live" title="Echte API-Antwort dieses Laufs">LIVE · ${esc(PROV_NAME[p] || p)} · ${esc(fmtTime(t))}</span>`,
  man: () => '<span class="prov man" title="Manuell erfasste Analystenquelle – nicht abgerufen">Manuell</span>',
  claim: () => '<span class="prov claim">Kundenaussage</span>',
};
function provFor(r) {
  if (r.mode === 'live') return prov.live(r.provider, r.retrieved_at);
  if (r.mode === 'curated') return prov.cur();
  return prov.man();
}

const STEPS = [
  [1, 'Auftrag'], [2, 'Unternehmensprofil'], [3, 'Anwendungsfelder'], [4, 'Rechercheplan'],
  [5, 'Recherche'], [6, 'Chancen'], [7, 'Review', true], [8, 'Übergabe', true],
];

// ------------------------------------------------------------ chrome
export function header() {
  const s = store.getState();
  const st = runtime.status;
  const chip = (k, label) => {
    const v = st?.ok ? st.providers[k]?.status : st?.static ? 'demo' : 'offline';
    const tone = v === 'ready' ? 'ok' : v === 'not_configured' || v === 'demo' ? 'warn' : 'bad';
    const text = v === 'ready' ? 'bereit' : v === 'demo' ? 'Demo-Bestand' : v === 'not_configured' ? (k === 'epo' ? 'Demo-Bestand' : 'nicht konfiguriert') : 'Server fehlt';
    return `<span class="pchip ${tone}" title="${esc(st?.ok ? st.providers[k]?.label : st?.error || '')}">${esc(label)}: ${text}</span>`;
  };
  const confirming = store.getUi().confirmReset;
  return `
  <div class="demo-strip">DEMOMODUS – synthetische Betriebsdaten · Bestätigungen gelten nur für das Demo-Profil, nicht für Ergo-Tec</div>
  <div class="topbar">
    <div class="brand"><div class="logo">D</div><div><strong>DEVOREO / IDEE</strong><small>Innovation Discovery Engine</small></div></div>
    <div class="ctx">
      <div class="ctx-item"><small>Projekt</small><strong title="${esc(s.project.case)}">${esc(s.project.id)} · ${esc(s.project.company)} (Demo)</strong></div>
      <div class="ctx-item"><small>Profilversion</small><strong>v${s.profile.version}</strong></div>
      <div class="ctx-item"><small>Läufe</small><strong>${s.runs.length}</strong></div>
    </div>
    <div class="pchips">${chip('ted', 'TED')}${chip('crossref', 'Crossref')}${chip('epo', 'EPO-Patente')}</div>
    <div class="tools">
      ${confirming
        ? `<span class="confirm-reset">Alle Demo-Daten löschen? <button class="btn sm danger" data-act="reset-yes">Ja, zurücksetzen</button><button class="btn sm ghost" data-act="reset-no">Abbrechen</button></span>`
        : '<button class="btn ghost sm" data-act="reset-ask">Demo zurücksetzen</button>'}
    </div>
  </div>`;
}

export function nav() {
  const cur = store.getUi().step;
  return STEPS.map(([n, label, preview]) => `
    <button class="nav-item ${n === cur ? 'active' : ''}" data-act="goto" data-step="${n}">
      <span class="num">${n}</span><span>${label}${preview ? ' <em class="pv">Vorschau</em>' : ''}</span><i class="dot ${store.stepStatus(n)}"></i>
    </button>`).join('') + `
    <div class="nav-legend">
      <div><b>Herkunft der Daten</b></div>
      <div>${prov.syn()}</div><div>${prov.cur()}</div><div>${prov.live('ted', null).replace(' · –', '')}</div><div>${prov.man()}</div>
    </div>`;
}

export function flash() {
  const f = store.getUi().flash;
  return f ? `<div class="flash ${f.type}">${esc(f.text)}<button class="x" data-act="flash-x" aria-label="Schließen">×</button></div>` : '';
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
  <div class="page-head"><div><h2>1 · Auftrag</h2><p class="lead">„Welche weiteren Leistungen können wir mit unseren vorhandenen Kompetenzen anbieten?“</p></div>
    ${p.confirmed ? badge('ok', `Umfang bestätigt ${fmtTime(p.confirmedAt)}`) : badge('warn', 'Umfang noch nicht bestätigt')}</div>
  <div class="grid2">
    <section class="card">
      <header><h3>Suchauftrag</h3>${prov.syn()}</header>
      <label class="lbl">Ziel<textarea class="inp" rows="2" data-form="goal" ${ro}>${esc(p.goal)}</textarea></label>
      <div class="form-grid">
        <label class="lbl">Region<input class="inp" data-form="region" value="${esc(p.region)}" ${ro}></label>
        <label class="lbl">Pilotbudget (EUR, leer = unbekannt)<input class="inp" type="number" min="0" data-form="pilot_budget_eur" value="${esc(p.pilot_budget_eur ?? '')}" placeholder="unbekannt" ${ro}></label>
      </div>
      <label class="lbl">Bestehende Märkte (eine pro Zeile)<textarea class="inp" rows="3" data-form="existing_markets" ${ro}>${esc(p.existing_markets.join('\n'))}</textarea></label>
      <label class="lbl">Ausschlüsse<input class="inp" data-form="exclusions" value="${esc(p.exclusions)}" placeholder="z. B. keine Medizinprodukte-Zulassung als Hersteller" ${ro}></label>
      <p class="note">Finanzdaten, Maschinenpark und Personal werden <b>nicht</b> abgeleitet. Freie Kapazität: <b>${p.free_capacity_hours ?? 'unbekannt'}</b>.</p>
      <div class="row">${p.confirmed
        ? '<button class="btn ghost" data-act="project-reopen">Umfang bearbeiten</button><button class="btn primary" data-act="goto" data-step="2">Weiter: Unternehmensprofil →</button>'
        : '<button class="btn primary" data-act="project-confirm">Umfang bestätigen und Projekt anlegen</button>'}</div>
    </section>
    <section class="card">
      <header><h3>Öffentliche Unternehmensinformation</h3>${prov.pub()}</header>
      <p class="small muted">Getrennt von den synthetischen Betriebsdaten. Kuratiert am ${esc(store.getSources().publicSources.verified_on)}, nicht von der App abgerufen.</p>
      ${pubs.map(x => `<div class="src"><strong>${esc(x.title)}</strong><span>${esc(x.summary)}</span><small>Anker: ${esc(x.anchor)} · ${esc(x.evidence)}</small>${ext(x.url)}</div>`).join('')}
      <div class="callout warn"><b>Hinweis:</b> Prüfvorrichtungen erscheinen bereits im öffentlichen Portfolio (Stator-Prüfvorrichtung). Prüftechnik ist daher <b>kein neuer Markt</b> für den Betrieb; welche konkreten Anwendungen neu wären, ist unbekannt und wird erfragt.</div>
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
  return `
  <article class="cap ${c.confirmation}" id="cap-${esc(c.id)}">
    <header><div><code>${esc(c.id)}</code> <strong>${esc(c.title)}</strong></div>
      <div>${isClaim ? prov.claim() : prov.syn()} ${badge(tone, R.CONFIRMATION[c.confirmation])}</div></header>
    ${c.source?.quote ? `
    <blockquote>„${esc(c.source.quote)}“</blockquote>
    <div class="meta">
      <button class="link" data-act="open-doc" data-doc="${esc(c.source.document_id)}" data-page="${c.source.page}">${esc(doc?.name || c.source.document_id)} · Seite ${c.source.page}</button>
      ${c.verified ? badge('ok', 'Zitat verifiziert') : badge('bad', 'nicht verifiziert')}
      <span class="small muted">Methode: ${esc(c.method)}</span>
    </div>` : `<div class="callout warn small">Quelle: Interviewantwort ${esc(c.source?.interview || '')} · <b>Nachweis ausstehend</b>. Keine dokumentierte Fähigkeit.</div>`}
    <dl class="kv3">
      <div><dt>Herkunft</dt><dd>${esc(R.ORIGIN[c.origin])}</dd></div>
      <div><dt>Kontrolle</dt><dd>${esc(R.CONTROL[c.control] || c.control)}</dd></div>
      <div><dt>Transfer</dt><dd>${esc(R.TRANSFER[c.transfer])}</dd></div>
    </dl>
    ${params.length ? `<div class="small"><b>Nur für diesen Referenzaufbau:</b> ${params.map(([k, v]) => `${esc(k)} = ${esc(v)}`).join(' · ')}</div>` : ''}
    ${(c.requires || []).length ? `<div class="small muted">Voraussetzung/Grenze: ${c.requires.map(r => (r === 'PB-17' ? '<button class="link" data-act="open-doc" data-doc="PB-17" data-page="2">PB-17 S. 2 (nur Halteversuch R1/A, keine Grenzwerte)</button>' : esc(r))).join(', ')}</div>` : ''}
    ${c.q01Note ? `<div class="small note">${esc(c.q01Note)}</div>` : ''}
    ${c.note ? `<div class="small note">Korrektur: ${esc(c.note)}</div>` : ''}
    ${editing ? `
    <div class="edit">
      <label class="lbl">Titel<input class="inp" id="ed-title" value="${esc(c.title)}"></label>
      <div class="form-grid">
        <label class="lbl">Kontrolle<select class="inp" id="ed-control">${Object.entries(R.CONTROL).map(([k, v]) => `<option value="${k}" ${k === c.control ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="lbl">Transfer<select class="inp" id="ed-transfer">${Object.entries(R.TRANSFER).map(([k, v]) => `<option value="${k}" ${k === c.transfer ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <label class="lbl">Begründung der Korrektur<input class="inp" id="ed-note" value="${esc(c.note || '')}"></label>
      <div class="row"><button class="btn primary sm" data-act="cap-save" data-id="${esc(c.id)}">Korrektur speichern (neue Profilversion)</button><button class="btn ghost sm" data-act="cap-cancel">Abbrechen</button></div>
    </div>` : `
    <div class="row">
      ${isClaim ? '<span class="small muted">Kundenaussage bleibt offen, bis ein Nachweis vorliegt.</span>' : `
      <button class="btn sm ${c.confirmation === 'confirmed' ? 'primary' : 'secondary'}" data-act="cap-decide" data-id="${esc(c.id)}" data-d="confirmed">Bestätigen</button>
      <button class="btn sm ${c.confirmation === 'corrected' ? 'primary' : 'secondary'}" data-act="cap-edit" data-id="${esc(c.id)}">Korrigieren</button>
      <button class="btn sm ${c.confirmation === 'open' ? 'primary' : 'ghost'}" data-act="cap-decide" data-id="${esc(c.id)}" data-d="open">Offenlassen</button>`}
    </div>`}
  </article>`;
}

function s2() {
  const s = store.getState();
  const seed = store.getSources().seed;
  const samples = [
    ['IDEE-01', 'Projektakte UL-01 (3 S.) – Hauptdokument'],
    ['PB-17', 'Prüfbericht PB-17 R1/A – stützt CAP-04'],
    ['IDEE-02', 'Ergänzender Fähigkeitsnachweis – optional, fügt CAP-05/06 hinzu'],
  ];
  const unknown = s.documents.filter(d => !d.known);
  const a = s.answers;
  const q3 = a['Q-03'];
  const anth = runtime.status?.providers?.anthropic?.status;
  return `
  <div class="page-head"><div><h2>2 · Unternehmensprofil</h2><p class="lead">Belegbasierte Fähigkeiten aus Referenzprojekten. Jede Karte zeigt die Originalstelle.</p></div>
    ${badge('neutral', `Profilversion v${s.profile.version}`)}</div>
  <section class="card">
    <header><h3>Dokumente</h3>${prov.syn()}</header>
    <div class="docpick">
      ${samples.map(([id, label]) => {
        const done = s.documents.find(d => d.id === id);
        return `<div class="docopt ${done ? 'done' : ''}"><div><code>${id}</code> ${esc(label)}</div>
          <button class="btn sm ${done ? 'ghost' : 'secondary'}" data-act="import-sample" data-id="${id}">${done ? 'Erneut importieren' : 'Musterdokument übernehmen'}</button></div>`;
      }).join('')}
      <div class="docopt upload"><div><b>Eigene PDF hochladen</b><br><span class="small muted">Nur synthetische/Demo-Unterlagen. Verarbeitung lokal im Browser.</span></div>
        <label class="btn sm secondary filebtn">Datei wählen<input type="file" accept="application/pdf,.pdf" data-act="upload" hidden></label></div>
    </div>
    ${runtime.busy ? `<p class="callout info">${esc(runtime.busy)}</p>` : ''}
    ${s.documents.length ? `
    <table class="tbl"><thead><tr><th>ID</th><th>Datei</th><th>Seiten</th><th>SHA-256</th><th>Methode</th><th>Seiten öffnen</th></tr></thead><tbody>
      ${s.documents.map(d => `<tr><td><code>${esc(d.id)}</code></td><td>${esc(d.name)}${d.known ? '' : ' ' + badge('warn', 'unbekannt')}</td><td>${d.pages}</td>
        <td><code title="${esc(d.sha256)}">${esc(d.sha256.slice(0, 12))}…</code></td><td class="small">${esc(d.method)}</td>
        <td>${Array.from({ length: Math.min(d.pages, 6) }, (_, i) => `<button class="link" data-act="open-doc" data-doc="${esc(d.id)}" data-page="${i + 1}">S.${i + 1}</button>`).join(' ')}</td></tr>`).join('')}
    </tbody></table>` : '<p class="empty">Noch kein Dokument importiert. Das Profil ist leer und unbestätigt.</p>'}
  </section>

  <section class="card">
    <header><h3>Fähigkeitsvorschläge</h3><span class="small muted">Bestätigung bestätigt das <b>Demo-Profil</b>, nicht die tatsächliche Fähigkeit von Ergo-Tec.</span></header>
    ${s.capabilities.length ? `<div class="caps">${s.capabilities.map(capCard).join('')}</div>` : '<p class="empty">Keine Vorschläge. Musterdokument übernehmen oder Fähigkeit manuell mit Belegstelle anlegen.</p>'}
    <div class="callout info small"><b>Was die Akte nicht belegt</b> (IDEE-01, S. 3): keine numerischen Grenzen (Last, Genauigkeit, Wechselzeit), keine eigene CNC-Bearbeitung, <b>keine eigene Motorenentwicklung</b>, keine freie Kapazität. Diese Punkte bleiben offen.</div>
  </section>

  ${s.reviewQueue.length ? `<section class="card"><header><h3>Prüfliste (nicht im Profil)</h3>${badge('warn', `${s.reviewQueue.length} Einträge`)}</header>
    <table class="tbl"><thead><tr><th>Vorschlag</th><th>Stelle</th><th>Zitat</th><th>Status</th></tr></thead><tbody>
    ${s.reviewQueue.map(r => `<tr><td>${esc(r.title)}<div class="small muted">${esc(r.method)}</div></td><td>${esc(r.source.document_id)} S.${esc(r.source.page)}</td><td class="small">„${esc(r.source.quote)}“</td><td>${r.verified ? badge('warn', 'verifiziert, Review') : badge('bad', 'nicht verifiziert')}<div class="small">${esc(r.reviewReason)}</div></td></tr>`).join('')}
    </tbody></table></section>` : ''}

  <div class="grid2">
    <section class="card">
      <header><h3>Gezielte Rückfragen</h3><span class="small muted">3 von 628 Katalogfeldern</span></header>
      ${seed.questions.slice(0, 2).map(q => `
      <div class="question"><b>${q.id}</b> ${esc(q.question)}
        <div class="radios">${q.options.map(o => `<label><input type="radio" name="${q.id}" data-act="answer" data-q="${q.id}" value="${esc(o)}" ${a[q.id] === o ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>
        <div class="small muted">${esc(q.effect)}</div></div>`).join('')}
      <div class="question"><b>Q-03</b> ${esc(seed.questions[2].question)}
        <div class="form-grid4">
          ${[['load_kg', 'Last (kg)'], ['position_error_mm', 'Pos.-Abw. (mm)'], ['quantity', 'Stück/Jahr'], ['free_hours', 'freie Std.']].map(([k, l]) => `<label class="lbl">${l}<input class="inp" type="number" step="any" data-form="q3:${k}" value="${esc(q3[k] ?? '')}" placeholder="offen"></label>`).join('')}
        </div>
        <label class="lbl">Nachweis (Dokument + Seite) – Pflicht für jeden Wert<input class="inp" data-form="q3:evidence" value="${esc(q3.evidence)}" placeholder="z. B. IDEE-02 S. 1"></label>
        <button class="btn sm secondary" data-act="q3-commit">Q-03 übernehmen</button>
        <div class="small muted">Nur belegte Werte werden bewertet; fehlende Daten bleiben offen.</div>
      </div>
    </section>
    <section class="card">
      <header><h3>Fähigkeit manuell anlegen</h3></header>
      ${s.documents.length ? `
      <div class="form-grid"><label class="lbl">Dokument<select class="inp" id="mc-doc">${s.documents.map(d => `<option value="${esc(d.id)}">${esc(d.id)} – ${esc(d.name)}</option>`).join('')}</select></label>
      <label class="lbl">Seite<input class="inp" id="mc-page" type="number" min="1" value="1"></label></div>
      <label class="lbl">Titel<input class="inp" id="mc-title" placeholder="z. B. Baugruppenzeichnung erstellen"></label>
      <label class="lbl">Belegstelle (wörtlich aus dem Dokument)<textarea class="inp" id="mc-quote" rows="2"></textarea></label>
      <button class="btn sm secondary" data-act="manual-cap">Mit Belegprüfung anlegen</button>` : '<p class="empty">Zuerst ein Dokument importieren.</p>'}
      ${unknown.map(d => `<details class="txt"><summary>Extrahierter Text ${esc(d.name)} (${d.textChars} Zeichen)</summary>${d.pageTexts.map((t, i) => `<h4>Seite ${i + 1}</h4><pre>${esc(t.slice(0, 2500)) || '<i>kein Text</i>'}</pre>`).join('')}</details>`).join('')}
      <hr>
      <h4>Optionale KI-Extraktion</h4>
      ${anth === 'ready' ? `
        <label class="switch"><input type="checkbox" id="llm-ok"> Ich gebe frei, dass der <b>Text eines synthetischen Musterdokuments</b> an die Claude API gesendet wird.</label>
        <div class="row">${s.documents.filter(d => d.known).map(d => `<button class="btn sm ghost" data-act="llm-extract" data-doc="${esc(d.id)}">${esc(d.id)} extrahieren</button>`).join('') || '<span class="small muted">Kein synthetisches Dokument importiert.</span>'}</div>
        <p class="small muted">Antwort wird gegen ein Schema geprüft, jedes Zitat gegen den Seitentext verifiziert. Ergebnisse landen immer in der Prüfliste.</p>`
        : '<p class="small muted">Nicht konfiguriert (kein <code>ANTHROPIC_API_KEY</code> in der Server-.env). Ein Claude-Code-Abo ist kein Laufzeit-API-Key. Regelbasierte Musterextraktion bleibt verfügbar.</p>'}
    </section>
  </div>
  <section class="card"><header><h3>Profilversionen</h3></header>
    ${s.profile.history.length ? `<ol class="hist">${s.profile.history.slice(0, 12).map(h => `<li><b>v${h.version}</b> <span class="muted">${fmtTime(h.at)}</span> ${esc(h.reason)}</li>`).join('')}</ol>` : '<p class="empty">Noch keine Version – Profil leer.</p>'}
  </section>
  ${store.activeCaps().length ? '<div class="row end"><button class="btn primary" data-act="goto" data-step="3">Weiter: Anwendungsfelder →</button></div>' : ''}`;
}

// ------------------------------------------------------------ 3 Anwendungsfelder
function s3() {
  const s = store.getState();
  const active = store.activeCaps();
  const sel = store.selectedCapIds();
  const fields = s.fields.map(f => ({ f, e: store.eligibility(f) }));
  const steps = s.capabilities.filter(c => c.verified && c.source?.quote);
  return `
  <div class="page-head"><div><h2>3 · Anwendungsfelder</h2><p class="lead">Vom Referenzprojekt über produktunabhängige Funktionen zur möglichen verkaufbaren Aufgabe.</p></div></div>
  <section class="card">
    <header><h3>Abstraktionskette</h3>${prov.syn()}</header>
    <div class="chain4">
      <div class="lvl"><small>1 Referenzprojekt</small><b>UL-01 / Standard / R1</b><span>Fiktive Untersuchungsliege für BeispielMed (Demo)</span></div>
      <div class="lvl"><small>2 Tatsächliche Arbeitsschritte</small>${steps.length ? steps.map(c => `<button class="link chip" data-act="open-doc" data-doc="${esc(c.source.document_id)}" data-page="${c.source.page}" title="${esc(c.source.quote)}">${esc(c.source.document_id)} S.${c.source.page}: „${esc(c.source.quote.slice(0, 48))}…“</button>`).join('') : '<span class="muted">Keine verifizierten Belegstellen</span>'}</div>
      <div class="lvl"><small>3 Produktunabhängige Funktionen</small>
        ${active.length ? active.map(c => `<label class="capsel ${sel.includes(c.id) ? 'on' : ''}"><input type="checkbox" data-act="cap-select" data-id="${esc(c.id)}" ${sel.includes(c.id) ? 'checked' : ''}> <button class="link" data-act="goto-cap" data-id="${esc(c.id)}">${esc(c.id)}</button> ${esc(c.title)}</label>`).join('') : '<span class="muted">Keine bestätigten Fähigkeiten – zuerst in Schritt 2 bestätigen.</span>'}
      </div>
      <div class="lvl"><small>4 Mögliche verkaufbare Aufgabe</small>
        ${fields.filter(x => x.e.eligible).map(({ f }) => `<span class="chip ok">${esc(f.id)} ${esc(f.title)}</span>`).join('') || '<span class="muted">Mit dieser Auswahl kein Feld ableitbar.</span>'}</div>
    </div>
  </section>
  <section class="card">
    <header><h3>Suchfelder</h3><span class="small muted">${s.selectedFieldIds.length}/2 für diesen Demo-Sprint ausgewählt</span></header>
    <div class="fields">${fields.map(({ f, e }) => {
      const on = s.selectedFieldIds.includes(f.id);
      return `<article class="field ${e.eligible ? '' : 'inactive'} ${on ? 'on' : ''}">
        <header><div><code>${esc(f.id)}</code> <strong>${esc(f.title)}</strong></div>${f.manual ? prov.man() : badge('neutral', 'Illustrative Seed-Zuordnung')}</header>
        <div class="small">Fähigkeiten: ${f.capability_ids.map(id => `<button class="link" data-act="goto-cap" data-id="${esc(id)}">${esc(id)}</button>`).join(', ')}</div>
        <div class="small">Suchbegriffe: <i>${esc(f.query_de)}</i> / <i>${esc(f.query_en)}</i></div>
        ${f.buyer_role ? `<div class="small">Käuferrolle (Annahme): ${esc(f.buyer_role)}</div>` : ''}
        ${f.id === 'SF-01' ? '<div class="small note">Möglicher Lieferumfang: Komponente / Wechselaufnahme – <b>nicht</b> Bau einer kompletten Universalprüfmaschine.</div>' : ''}
        ${f.id === 'SF-02' ? '<div class="small note warn">Ausdrücklich unvalidierte Richtung.</div>' : ''}
        ${e.eligible ? `<button class="btn sm ${on ? 'primary' : 'secondary'}" data-act="field-toggle" data-id="${esc(f.id)}">${on ? '✓ Für Recherche ausgewählt' : 'Für Recherche auswählen'}</button>`
          : `<div class="small bad">Inaktiv – fehlt: ${e.missing.map(m => `${esc(m.id)} (${esc(m.reason)})`).join(', ')}</div>`}
      </article>`;
    }).join('')}</div>
    <div class="callout warn small">Keine Diversifikationsaussage, solange die bestehende Marktpräsenz (Q-02) nicht geklärt ist. Antwort Q-02: <b>${esc(s.answers['Q-02'])}</b>.</div>
  </section>
  <section class="card">
    <header><h3>Feld manuell anlegen</h3></header>
    <div class="form-grid"><label class="lbl">Titel<input class="inp" id="nf-title"></label><label class="lbl">Fähigkeiten (bestätigt)<div class="radios">${active.map(c => `<label><input type="checkbox" class="nf-cap" value="${esc(c.id)}"> ${esc(c.id)}</label>`).join('') || '<span class="muted">keine</span>'}</div></label></div>
    <div class="form-grid"><label class="lbl">Suchbegriffe DE<input class="inp" id="nf-de"></label><label class="lbl">Suchbegriffe EN<input class="inp" id="nf-en"></label></div>
    <button class="btn sm secondary" data-act="field-add">Feld anlegen</button>
  </section>
  ${s.selectedFieldIds.length ? '<div class="row end"><button class="btn primary" data-act="goto" data-step="4">Weiter: Rechercheplan →</button></div>' : ''}`;
}

// ------------------------------------------------------------ 4 Rechercheplan
function s4() {
  const s = store.getState();
  const sel = s.selectedFieldIds.map(id => s.fields.find(f => f.id === id));
  const p = s.plan;
  const st = runtime.status;
  if (!sel.length) return `<div class="page-head"><h2>4 · Rechercheplan</h2></div><p class="empty">Zuerst in Schritt 3 ein Suchfeld auswählen.</p>${separateTest()}`;
  const epoReady = st?.ok && st.providers.epo.status === 'ready';
  const termRow = (key, label, provider) => {
    const chk = R.checkQuery(p.terms[key]);
    return `<tr><td><b>${label}</b><div class="small muted">${PROV_NAME[provider]}</div></td>
      <td><input class="inp" data-form="term:${key}" value="${esc(p.terms[key])}"></td>
      <td>${chk.ok ? badge('ok', 'generisch') : badge('bad', chk.error)}</td>
      <td><label class="switch"><input type="checkbox" data-act="plan-provider" data-p="${provider}" ${p.providers[provider] ? 'checked' : ''}> aktiv</label></td></tr>`;
  };
  return `
  <div class="page-head"><div><h2>4 · Rechercheplan</h2><p class="lead">Generische Funktionsbegriffe – keine Firmen-, Kunden-, Produkt- oder Seriennummern, keine Originalpassagen.</p></div>
    ${p?.confirmed ? badge('ok', `Plan v${p.version} bestätigt ${fmtTime(p.confirmedAt)}`) : badge('warn', 'Plan nicht bestätigt')}</div>
  <section class="card">
    <header><h3>Suchfeld</h3></header>
    <div class="row">${sel.map(f => `<button class="btn sm ${p?.fieldId === f.id ? 'primary' : 'secondary'}" data-act="plan-init" data-id="${esc(f.id)}">${esc(f.id)} ${esc(f.title)}</button>`).join('')}</div>
    ${!p ? '<p class="empty">Suchfeld wählen, um den Plan zu erzeugen.</p>' : `
    <table class="tbl plan"><thead><tr><th>Quelltyp</th><th>Begriffe (Komma = ODER)</th><th>Prüfung</th><th></th></tr></thead><tbody>
      ${termRow('patent', 'Patente', 'epo')}${termRow('procurement', 'Beschaffung', 'ted')}${termRow('research', 'Forschungssignale', 'crossref')}
    </tbody></table>
    <div class="form-grid4">
      <label class="lbl">Zielgebiet<input class="inp" data-form="plan:geography" value="${esc(p.geography)}"></label>
      <label class="lbl">Max. Treffer je Anbieter (20–50)<input class="inp" type="number" min="20" max="50" data-form="plan:cap" value="${esc(p.cap)}"></label>
      <label class="lbl">Timeout (s)<input class="inp" type="number" min="5" max="30" data-form="plan:timeout" value="${esc(p.timeout)}"></label>
      <label class="lbl">Budget<input class="inp" value="0 EUR – nur frei zugängliche APIs" disabled></label>
    </div>
    <table class="tbl small"><thead><tr><th>Anbieter</th><th>Erwartete Quelle</th><th>Abdeckung / Grenzen</th><th>Status</th></tr></thead><tbody>
      <tr><td>EPO OPS</td><td>Veröffentlichte Patentanmeldungen (Titel/Abstract-Suche)</td><td>DOCDB weltweit; kein Rechtsstand, keine FTO; max. 25 je Abfrage; Fair-Use-Kontingent</td><td>${epoReady ? badge('ok', 'bereit') : badge('warn', 'Demo-Bestand (EPO nicht konfiguriert)')}</td></tr>
      <tr><td>TED</td><td>EU-Bekanntmachungen (Volltext)</td><td>Nur öffentliche EU-Vergaben oberhalb der Schwellenwerte; Zuschläge ≠ neue Leads</td><td>${st?.ok ? badge('ok', 'bereit') : badge('warn', 'Demo-Bestand')}</td></tr>
      <tr><td>Crossref</td><td>Publikations-Metadaten</td><td>Nur Metadaten; Stichprobe ≠ Markttrend</td><td>${st?.ok ? badge('ok', 'bereit') : badge('warn', 'Demo-Bestand')}</td></tr>
    </tbody></table>
    <div class="row"><button class="btn primary" data-act="plan-confirm">Plan bestätigen – externe Abfragen freigeben</button>
      ${p.confirmed ? '<button class="btn secondary" data-act="goto" data-step="5">Weiter: Recherche →</button>' : ''}</div>`}
  </section>
  ${separateTest()}`;
}

function separateTest() {
  const ui = store.getUi();
  return `<section class="card sep">
    <header><h3>Separater Testlauf (manueller Begriff)</h3>${badge('neutral', 'nicht Teil der Kundenhypothese')}</header>
    <p class="small muted">Für Gegenbeleg-Tests wie Michaels „Kaltplasma / Bodenreinigung“. Läuft getrennt vom Ergo-Tec-Suchfeld.</p>
    <div class="row"><input class="inp" id="sep-q" value="${esc(ui.sepQuery ?? 'Kaltplasma, Bodenreinigung')}">
      <button class="btn sm secondary" data-act="sep-live">Suchen (Patente + TED)</button>
      <button class="btn sm ghost" data-act="sep-offline">Vorbereitete Referenzen (offline)</button></div>
  </section>`;
}

// ------------------------------------------------------------ 5 Recherche
const KIND_TABS = [['patent', 'Patente'], ['procurement', 'Beschaffung'], ['research', 'Forschungssignale'], ['product', 'Produkte & Gegenbelege']];
const STATUS_LABEL = { running: ['neutral', 'läuft …'], succeeded: ['ok', 'erfolgreich'], empty: ['neutral', 'erfolgreich, 0 Treffer'], partial: ['warn', 'teilweise'], failed: ['bad', 'fehlgeschlagen'], not_configured: ['warn', 'nicht konfiguriert'] };
const stBadge = st => badge(...(STATUS_LABEL[st] || ['neutral', st]));

function patentCard(r) {
  if (r.curatedId === 'PAT-01') return `
  <div class="pcard"><h4>Patent-Problemkarte · WO2021055483A1 ${prov.cur()}</h4>
    <dl class="kv">
      <dt>Problem (Anmeldersicht)</dt><dd>Beim Wechsel zwischen unterschiedlichen Proben und Prüfarten müssen Prüfaufnahmen umgebaut oder getauscht werden; das kostet Zeit (sinngemäß, Beschreibung, Hintergrund [0003]).</dd>
      <dt>Beschriebene Lösung</dt><dd>${esc(r.solution)}</dd>
      <dt>Quelle / Abschnitt</dt><dd>${esc(r.anchor)} · ${ext(r.url, 'Originalveröffentlichung')}</dd>
      <dt>Veröffentlicht</dt><dd>${fmtDate(r.date)}</dd>
      <dt>Rechtsstand</dt><dd>unbekannt – nicht geprüft</dd>
      <dt>Einordnung</dt><dd>${esc(r.evidence)} Kein Nachfragebeleg, keine FTO-Aussage, kein Verkaufsverbot ableitbar.</dd>
    </dl></div>`;
  if (r.curatedId === 'PAT-02') return `
  <div class="pcard"><h4>Gegenbeleg · DE102011010355A1 ${prov.cur()}</h4>
    <p>${esc(r.summary)}</p><p class="small"><b>Korrektur:</b> Die Behauptung „Kaltplasma zur Bodenreinigung ist eine unbekannte Grundidee“ ist widerlegt. <b>Nicht</b> widerlegt bzw. offen: Rechtsstand, Handlungsfreiheit, Marktlücke.</p>
    <p class="small">${esc(r.anchor)} · ${ext(r.url)}</p></div>`;
  if (r.mode === 'live' && r.provider === 'epo') return `
  <div class="pcard"><h4>${esc(r.identifier)} ${prov.live('epo', r.retrieved_at)}</h4>
    <dl class="kv"><dt>Titel</dt><dd>${esc(r.title)}</dd><dt>Abstract</dt><dd>${r.abstract ? `${esc(r.abstract)} <span class="small muted">(nur Abstract – schwacher Hinweis; Problem/Lösung nicht aus Volltext belegt)</span>` : 'nicht geliefert'}</dd>
    <dt>Rechtsstand</dt><dd>unbekannt – nicht geprüft</dd></dl></div>`;
  return '';
}

function s5() {
  const s = store.getState();
  const ui = store.getUi();
  const run = store.currentRun();
  const p = s.plan;
  const st = runtime.status;
  const canLive = p?.confirmed && st?.ok;
  const results = run ? run.results.filter(r => r.kind === ui.tab && (!ui.filter || `${r.title} ${r.identifier}`.toLowerCase().includes(ui.filter.toLowerCase()))) : [];
  const counts = Object.fromEntries(KIND_TABS.map(([k]) => [k, run ? run.results.filter(r => r.kind === k).length : 0]));
  const groups = R.dedupeByFamily(results);
  const research = run ? run.results.filter(r => r.kind === 'research') : [];
  const years = R.signalsByYear(research);
  const crq = run?.queries.find(q => q.provider === 'crossref');
  const hyps = s.hypotheses;
  return `
  <div class="page-head"><div><h2>5 · Recherche & Trendradar</h2><p class="lead">Live-Abfragen und vorbereitete Referenzen sind getrennte Modi.</p></div></div>
  <section class="card">
    <header><h3>Start</h3>${p?.confirmed ? badge('ok', `Plan v${p.version}`) : badge('warn', 'Plan nicht bestätigt')}</header>
    ${st?.static ? '<div class="callout info"><b>Gehostete Demo.</b> Diese Version läuft ohne Recherche-Server. „Recherche starten“ durchsucht den vorbereiteten Bestand echter, geprüfter Quellen (Patente, Beschaffung, Produkte); alle Treffer sind als „Vorbereiteter Referenztreffer“ gekennzeichnet. Live-Abfragen (TED, Crossref, EPO) laufen in der lokalen Installation.</div>' : !st?.ok ? `<div class="callout bad">${esc(st?.error || 'Status unbekannt')}</div>` : ''}
    ${st?.ok && st.providers.epo.status !== 'ready' ? '<div class="callout info"><b>Patentsuche im Demo-Bestand.</b> Ohne EPO-Zugang durchsucht die Recherche einen vorbereiteten Bestand echter, geprüfter Patentveröffentlichungen. Treffer sind als „Vorbereiteter Referenztreffer“ gekennzeichnet; Markt- und Forschungsquellen laufen live.</div>' : ''}
    <div class="row">
      ${st?.static ? `<button class="btn primary" data-act="run-offline" ${p?.confirmed ? '' : 'disabled'}>Recherche starten (Demo-Bestand)</button>` : `
      <button class="btn primary" data-act="run-live" ${canLive ? '' : 'disabled'}>Recherche starten (live)</button>
      <button class="btn secondary" data-act="run-offline" ${p?.confirmed ? '' : 'disabled'}>Vorbereitete Recherche (offline)</button>`}
      ${!p?.confirmed ? '<span class="small muted">Erst Rechercheplan bestätigen (Schritt 4).</span>' : ''}
    </div>
    ${p?.confirmed ? `<div class="small muted">Gesendet werden ausschließlich: ${R.checkQuery(p.terms.patent).ok ? '' : ''}${Object.entries(p.providers).filter(([, v]) => v).map(([k]) => `<code>${esc(PROV_NAME[k])}: ${esc(p.terms[{ epo: 'patent', ted: 'procurement', crossref: 'research' }[k]])}</code>`).join(' ')}</div>` : ''}
  </section>
  ${s.runs.length ? `
  <section class="card">
    <header><h3>Läufe</h3><select class="inp narrow" data-act="run-select">${s.runs.map(r => `<option value="${esc(r.id)}" ${run?.id === r.id ? 'selected' : ''}>${esc(r.id)} · ${r.mode === 'live' ? 'LIVE' : 'OFFLINE (vorbereitet)'} · ${esc(r.label)} · ${fmtTime(r.startedAt)}</option>`).join('')}</select></header>
    <div class="runhead ${run.mode}">${run.mode === 'live' ? (run.demoPatents ? '<b>Live-Lauf</b> – Markt/Forschung als echte API-Antworten; Patente aus dem vorbereiteten Demo-Bestand (gekennzeichnet).' : '<b>Live-Lauf</b> – nur echte API-Antworten dieses Laufs.') :'<b>Offline-Modus – vorbereitete Referenztreffer.</b> Kuratiert, nicht von der App abgerufen; kein Live-Ergebnis.'}
      ${run.separate ? ' · <b>Separater Testlauf</b> (nicht Teil der Kundenhypothese)' : ''} · Profil v${run.profileVersion}${run.planVersion ? ` · Plan v${run.planVersion}` : ''} · Gesamtstatus ${stBadge(run.status)}</div>
    <table class="tbl"><thead><tr><th>Anbieter</th><th>Abfrage</th><th>Status</th><th>Treffer (geladen / gesamt)</th><th>Abruf</th><th>Dauer</th></tr></thead><tbody>
      ${run.queries.map(q => `<tr><td>${esc(PROV_NAME[q.provider] || q.provider)}</td><td><code>${esc(q.query)}</code></td><td>${stBadge(q.status)}${q.error ? `<div class="small bad">${esc(q.error)}</div>` : ''}${q.note ? `<div class="small muted">${esc(q.note)}</div>` : ''}</td>
        <td>${q.status === 'running' ? '…' : `${q.count} / ${q.total ?? '?'}`}</td><td class="small">${fmtTime(q.fetchedAt)}</td><td class="small">${q.durationMs != null ? `${q.durationMs} ms` : '–'}</td></tr>`).join('')}
    </tbody></table>
    ${run.status === 'partial' || run.status === 'failed' ? `<div class="callout warn small">Unvollständige Abdeckung. Fehlgeschlagene Anbieter liefern keine Ersatzergebnisse. Optional separat: <button class="link" data-act="run-offline">vorbereitete Referenzen anzeigen</button>.</div>` : ''}
  </section>
  <section class="card">
    <div class="tabs">${KIND_TABS.map(([k, l]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${l} <span class="cnt">${counts[k]}</span></button>`).join('')}
      <input class="inp narrow" data-form="filter" placeholder="Filter …" value="${esc(ui.filter)}"></div>
    ${groups.length ? groups.map(g => {
      const r = g[0];
      return `<article class="res">
        <header><div>${provFor(r)} <code>${esc(r.identifier)}</code> <strong>${esc(r.title)}</strong></div>
          <div class="small muted">${r.date ? fmtDate(r.date) : 'Datum unbekannt'}</div></header>
        <div class="small">${[
          r.notice_type_label && `Typ: ${esc(r.notice_type_label)}${String(r.notice_type || '').startsWith('can') ? ' (Zuschlag – historischer Kauf, kein neuer Lead)' : ''}`,
          r.buyer_country && `Land: ${esc(r.buyer_country)}`, r.doc_type && `Art: ${esc(r.doc_type)}`, r.container && esc(r.container),
          r.applicants?.length && `Anmelder: ${esc(r.applicants.join(', '))}`,
          r.mode !== 'live' && r.summary && esc(r.summary), r.evidence && `<i>${esc(r.evidence)}</i>`,
          `Abruf: ${r.mode === 'live' ? 'Live-API ' + esc(PROV_NAME[r.provider]) : 'kuratiert (' + esc(r.retrieved_at) + ')'} · Suche: „${esc(r.query)}“`,
        ].filter(Boolean).join(' · ')}</div>
        ${g.length > 1 ? `<div class="small warn-text">+${g.length - 1} weitere Bekanntmachung(en)/Veröffentlichung(en) derselben Familie – zählt als <b>eine</b> Herkunft: ${g.slice(1).map(x => esc(x.identifier)).join(', ')}</div>` : ''}
        ${patentCard(r)}
        <div class="row">${ext(r.url)}
          <select class="inp narrow" data-act="link-src" data-sid="${esc(r.id)}"><option value="">Mit Hypothese verknüpfen …</option>${hyps.map(h => `<option value="${esc(h.id)}">${esc(h.id)} ${esc(h.title.slice(0, 40))}${h.source_ids.includes(r.id) ? ' ✓' : ''}</option>`).join('')}</select></div>
      </article>`;
    }).join('') : `<p class="empty">${run.status === 'running' ? 'Abfrage läuft …' : 'Keine Treffer in dieser Kategorie für diesen Lauf. (Leer bleibt leer – es werden keine unpassenden Datensätze ergänzt.)'}</p>`}
  </section>
  <section class="card">
    <header><h3>Recherche-Signale nach Jahr</h3>${badge('neutral', 'kein Wachstumstrend')}</header>
    ${years.length ? `<div class="bars">${years.map(y => `<div class="bar"><span style="height:${Math.round(100 * y.n / Math.max(...years.map(v => v.n)))}%"></span><small>${y.year}</small><b>${y.n}</b></div>`).join('')}</div>
      <p class="small muted">Stichprobe: ${research.length} geladene von ${crq?.total ?? '?'} Crossref-Treffern (relevanzsortiert). Keine Prozent- oder Wachstumsaussage ableitbar.</p>`
      : '<p class="empty">Keine datierten Forschungssignale in diesem Lauf.</p>'}
  </section>` : ''}
  <section class="card">
    <header><h3>Manuelle Quelle (Analystennotiz)</h3>${prov.man()}</header>
    <div class="form-grid4"><label class="lbl">URL (https)<input class="inp" id="ms-url"></label><label class="lbl">Titel<input class="inp" id="ms-title"></label>
      <label class="lbl">Art<select class="inp" id="ms-kind"><option value="product">Produkt/Gegenbeleg</option><option value="buyer">Käufersignal</option><option value="research">Forschung</option></select></label>
      <label class="lbl">Notiz<input class="inp" id="ms-note"></label></div>
    <button class="btn sm secondary" data-act="manual-src">Erfassen (wird nicht abgerufen)</button>
    ${s.manualSources.length ? `<ul class="mini">${s.manualSources.map(m => `<li><code>${esc(m.id)}</code> ${esc(m.title)} · ${ext(m.url)} · ${esc(m.note)}</li>`).join('')}</ul>` : ''}
  </section>
  ${separateTest()}
  <p class="small muted">Lizenz/Nutzung: TED-Daten (EU, Wiederverwendung gem. Amtsblatt-Bedingungen), Crossref-Metadaten (offen, Polite-Pool), EPO OPS (Fair-Use, Registrierung). Kein breites Scraping; Speicherung nur lokal im Browser dieser Demo.</p>`;
}

// ------------------------------------------------------------ 6 Chancen
function dimTable(a) {
  const L = { kompetenz: 'Kompetenz-Fit', bedarf: 'Bedarf', differenzierung: 'Differenzierung', ressourcen: 'Ressourcen/Budget', ip: 'IP/Regulatorik' };
  return `<table class="tbl dims">${Object.entries(L).map(([k, l]) => `<tr><td>${l}</td><td>${badge(a.dims[k].tone, a.dims[k].status)}</td><td class="small">${esc(a.dims[k].note || '')}</td></tr>`).join('')}</table>
  <div class="small ${a.priorityAllowed ? '' : 'bad'}"><b>Priorisierung:</b> ${a.priorityAllowed ? 'formal zulässig – Bedarf und Machbarkeit trotzdem beim Käufer bestätigen.' : `nicht zulässig – ${esc(a.blockers.join('; '))}.`}</div>`;
}

function hypCard(h) {
  const a = store.assess(h);
  const s = store.getState();
  const tone = { novelty_rejected: 'bad', deferred: 'warn', rejected: 'bad', hypothesis: 'neutral', unreviewed: 'neutral' }[h.status];
  const srcs = h.source_ids.map(id => ({ id, r: store.resolveSource(id) }));
  const editable = h.id !== 'H-01';
  return `
  <article class="hyp ${h.status}" id="hyp-${esc(h.id)}">
    <header><div><code>${esc(h.id)}</code>${h.parent_id ? ` <span class="small muted">← ${esc(h.parent_id)}</span>` : ''} <strong>${esc(h.title)}</strong></div>
      <div>${badge(tone, R.HYP_STATUS[h.status] || h.status)} ${badge('neutral', `v${h.version}`)} ${h.user ? prov.man() : ''}</div></header>
    <div class="banner">Vorläufige Hypothese – keine Investitionsentscheidung. Kein Score, keine Erfolgswahrscheinlichkeit.</div>
    ${h.reason ? `<div class="callout ${h.status === 'hypothesis' ? 'info' : 'warn'} small"><b>Begründung:</b> ${esc(h.reason)}${h.synthetic_basis ? ' <b>(Basis: synthetischer Test IDEE-03 – keine reale Evidenz)</b>' : ''}</div>` : ''}
    <div class="grid2 tight">
      <div>
        ${editable ? `
        <label class="lbl">Zielkäufer (Rolle)<input class="inp" id="h-buyer-${esc(h.id)}" value="${esc(h.buyer)}"></label>
        <label class="lbl">Möglicher Lieferumfang<input class="inp" id="h-deliv-${esc(h.id)}" value="${esc(h.deliverable)}"></label>
        <label class="lbl">Heutige Alternative<input class="inp" id="h-alt-${esc(h.id)}" value="${esc(h.alternative)}"></label>
        <label class="lbl">Offene Fragen (eine pro Zeile)<textarea class="inp" rows="3" id="h-q-${esc(h.id)}">${esc(h.questions.join('\n'))}</textarea></label>
        <button class="btn sm secondary" data-act="hyp-save" data-id="${esc(h.id)}">Als neue Version speichern</button>`
        : `<dl class="kv"><dt>Lieferumfang</dt><dd>${esc(h.deliverable)}</dd><dt>Erwartung nach Review</dt><dd>${esc(h.expected_after_review || '')}</dd></dl>
           ${h.status === 'unreviewed' ? `<button class="btn sm primary" data-act="h01-review">Gegenbelege prüfen (PAT-01, ALT-01)</button>
             <div class="small muted">Gefunden in Läufen: PAT-01 ${store.foundInRuns('PAT-01') ? '✓' : '–'} · ALT-01 ${store.foundInRuns('ALT-01') ? '✓' : '–'}</div>` : ''}`}
        <h4>Fähigkeiten</h4><div>${h.capability_ids.map(id => {
          const c = s.capabilities.find(x => x.id === id);
          return `<button class="link chip ${R.isActiveCapability(c) ? 'ok' : 'gap'}" data-act="goto-cap" data-id="${esc(id)}">${esc(id)}${R.isActiveCapability(c) ? '' : ' (offen)'}</button>`;
        }).join(' ')}</div>
        <h4>Quellen & Gegenbelege</h4>
        <ul class="mini">${srcs.map(({ id, r }) => `<li><code>${esc(id)}</code> ${r ? `${provFor(r)} ${esc(r.title)} · ${ext(r.url)}` : '<span class="muted">nicht aufgelöst</span>'}</li>`).join('') || '<li class="muted">keine</li>'}</ul>
      </div>
      <div><h4>Status je Dimension</h4>${dimTable(a)}</div>
    </div>
    ${h.history.length ? `<details><summary>Versionen (${h.history.length} frühere)</summary><ol class="hist">${h.history.map(v => `<li><b>v${v.version}</b> ${esc(R.HYP_STATUS[v.status] || v.status)} – ersetzt ${fmtTime(v.replacedAt)}: ${esc(v.reason)}</li>`).join('')}</ol></details>` : ''}
  </article>`;
}

function s6() {
  const s = store.getState();
  const m = s.matching;
  const loaded = ['IDEE-02', 'IDEE-03'].every(id => s.documents.some(d => d.id === id));
  const res = m.loaded ? store.matchingResult() : null;
  const cap5 = s.capabilities.find(c => c.id === 'CAP-05');
  const req = store.getSources().seed.synthetic_matching_case;
  return `
  <div class="page-head"><div><h2>6 · Chancen <span class="pv">vorläufig</span></h2><p class="lead">Entdeckung → Gegenbeleg → verfeinerte Hypothese. Null tragfähige Hypothesen ist ein gültiges Ergebnis.</p></div></div>
  ${s.hypotheses.map(hypCard).join('')}
  <section class="card">
    <header><h3>Eigene Hypothese ergänzen</h3>${prov.man()}</header>
    <div class="form-grid"><label class="lbl">Titel<input class="inp" id="nh-title"></label><label class="lbl">Zielkäufer<input class="inp" id="nh-buyer"></label></div>
    <div class="form-grid"><label class="lbl">Lieferumfang<input class="inp" id="nh-deliv"></label><label class="lbl">Heutige Alternative<input class="inp" id="nh-alt"></label></div>
    <div class="radios">${store.activeCaps().map(c => `<label><input type="checkbox" class="nh-cap" value="${esc(c.id)}"> ${esc(c.id)}</label>`).join('')}</div>
    <button class="btn sm secondary" data-act="hyp-add">Hypothese anlegen</button>
  </section>
  <section class="card syncase">
    <header><h3>Synthetischer Matchingfall (optional)</h3>${prov.syn()} ${badge('bad', 'Nie als reale Chance werten')}</header>
    ${!m.loaded ? `<p>Lädt IDEE-02 (Referenz 25 kg / 0,5 mm) und IDEE-03 (fiktiver Bedarf 50 kg / 0,1 mm) getrennt über die normale Importstrecke.</p>
      <button class="btn secondary" data-act="matching-load">IDEE-02 + IDEE-03 laden</button>` : `
    ${!loaded || !cap5 ? '<div class="callout warn">Dokumente oder CAP-05 fehlen.</div>' : ''}
    <table class="tbl"><thead><tr><th></th><th>Referenz (CAP-05, IDEE-02)</th><th>Fiktive Anforderung (IDEE-03)</th></tr></thead><tbody>
      <tr><td>Last</td><td>${esc(cap5?.parameters?.reference_load_kg ?? '?')} kg <button class="link" data-act="open-doc" data-doc="IDEE-02" data-page="1">S.1</button></td><td>${req.required_load_kg} kg <button class="link" data-act="open-doc" data-doc="IDEE-03" data-page="1">S.1</button></td></tr>
      <tr><td>Positionierabweichung</td><td>${esc(String(cap5?.parameters?.reference_position_error_mm ?? '?').replace('.', ','))} mm</td><td>max. ${String(req.max_position_error_mm).replace('.', ',')} mm</td></tr>
      <tr><td>Bedingungen</td><td>${esc(cap5?.parameters?.conditions || '?')}</td><td>statisch; Zeichnung/Messbedingungen ausstehend</td></tr>
      <tr><td>Metallbearbeitung</td><td colspan="2">Externer Partner (CAP-06) – ${m.partnerConfirmed ? 'im Test als bestätigt markiert' : 'Zusage für neue Aufträge liegt nicht vor'}</td></tr>
      <tr><td>Kapazität / Budget</td><td colspan="2">offen (unbekannt)</td></tr>
    </tbody></table>
    <div class="verdict ${res.transfer}"><b>${esc(res.label)}</b><div class="small">${esc(res.note)}</div></div>
    <label class="switch"><input type="checkbox" data-act="matching-alt" ${m.alternativeCovers ? 'checked' : ''}> Gegenbeleg-Test: synthetische Serienaufnahme erfüllt alle Anforderungen zu akzeptablem Preis</label>
    <p class="small muted">Umschalten erzeugt eine neue Version von H-02 (zurückgestellt bzw. wieder Hypothese); die vorherige Version und Begründung bleiben erhalten.</p>`}
  </section>`;
}

// ------------------------------------------------------------ 7 / 8
export function missingData() {
  const s = store.getState();
  const out = [];
  if (!s.project.confirmed) out.push('Projektumfang nicht bestätigt');
  if (s.project.pilot_budget_eur == null || s.project.pilot_budget_eur === '') out.push('Pilotbudget unbekannt');
  out.push('Freie Kapazität (Stunden) unbekannt');
  if (s.answers['Q-01'] === 'Ungeklärt') out.push('Q-01 Antriebsentwicklung vs. Integration ungeklärt');
  if (s.answers['Q-01'] === 'Eigenentwicklung') out.push('Q-01 Kundenaussage Eigenentwicklung – Nachweis ausstehend');
  if (s.answers['Q-02'] === 'Ungeklärt') out.push('Q-02 bestehende Prüfaufnahmen/Kundengruppen ungeklärt');
  const q3 = s.answers['Q-03'];
  ['load_kg', 'position_error_mm', 'quantity', 'free_hours'].forEach(k => { if (q3[k] == null || q3[k] === '') out.push(`Q-03 ${k} offen`); });
  s.capabilities.filter(c => c.confirmation === 'proposed' || c.confirmation === 'open').forEach(c => out.push(`${c.id} ${R.CONFIRMATION[c.confirmation]}`));
  if (!s.runs.some(r => r.mode === 'live' && r.queries.some(q => q.provider === 'epo' && q.status === 'succeeded'))) out.push('Keine erfolgreiche Live-Patentsuche');
  out.push('Rechtsstand / FTO aller Patente nicht geprüft');
  out.push('Kein aktuelles authentisches Käufer-/Beschaffungssignal bestätigt');
  return out;
}

function s7() {
  const s = store.getState();
  return `
  <div class="page-head"><div><h2>7 · Review <span class="pv">Vorschau</span></h2><p class="lead">Zusammenschau zur internen Durchsicht. Keine Scores, keine Freigabe.</p></div></div>
  <div class="grid2">
    <section class="card"><header><h3>Profil v${s.profile.version}</h3>${prov.syn()}</header>
      <ul class="mini">${s.capabilities.map(c => `<li><code>${esc(c.id)}</code> ${esc(c.title)} – ${esc(R.ORIGIN[c.origin])}, ${esc(R.CONFIRMATION[c.confirmation])}</li>`).join('') || '<li class="muted">leer</li>'}</ul></section>
    <section class="card"><header><h3>Fehlende Daten / offene Punkte</h3></header><ul class="mini bad">${missingData().map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
  </div>
  <section class="card"><header><h3>Recherchelauf-Übersicht</h3></header>
    <table class="tbl"><thead><tr><th>Lauf</th><th>Modus</th><th>Profil/Plan</th><th>Anbieter-Status</th><th>Treffer</th></tr></thead><tbody>
    ${s.runs.map(r => `<tr><td>${esc(r.id)}${r.separate ? ' (separat)' : ''}</td><td>${r.mode === 'live' ? 'LIVE' : 'vorbereitet/offline'}</td><td>v${r.profileVersion} / ${r.planVersion ? 'v' + r.planVersion : '–'}</td><td>${r.queries.map(q => `${esc(PROV_NAME[q.provider])}: ${stBadge(q.status)}`).join(' ')}</td><td>${r.results.length}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">keine</td></tr>'}
    </tbody></table></section>
  <section class="card"><header><h3>Hypothesen</h3></header>
    <ul class="mini">${s.hypotheses.map(h => `<li><code>${esc(h.id)}</code> v${h.version} ${esc(h.title)} – <b>${esc(R.HYP_STATUS[h.status] || h.status)}</b>${h.reason ? `: ${esc(h.reason)}` : ''}</li>`).join('')}</ul>
    <p class="small muted">Eine spätere Bewertungsmatrix (Vorschau) würde nur aus belegten Werten rechnen; unbekannt ≠ 0. Hier bewusst nicht berechnet.</p></section>
  <div class="row end"><button class="btn primary" data-act="goto" data-step="8">Weiter: Übergabe →</button></div>`;
}

function s8() {
  return `
  <div class="page-head"><div><h2>8 · Übergabe <span class="pv">Vorschau</span></h2><p class="lead">Recherche-Zusammenfassung zum Weitergeben. Es wird nichts versendet.</p></div></div>
  <section class="card">
    <div class="banner big">Vorläufige Hypothese – keine Investitionsentscheidung</div>
    <p>Der Bericht enthält Profil- und Laufversionen, Originalquellen mit Links und Abrufmodus (live / vorbereitet / manuell), offene Punkte, zurückgestellte Alternativen und den Hinweis auf synthetische Betriebsdaten.</p>
    <div class="row"><button class="btn primary" data-act="export-view">${store.getUi().showReport ? 'Bericht ausblenden' : 'Bericht anzeigen'}</button>
      ${runtime.status?.static ? '' : '<button class="btn secondary" data-act="export-html">HTML-Bericht herunterladen</button><button class="btn ghost" data-act="export-json">JSON exportieren</button>'}</div>
    ${runtime.status?.static ? '<p class="small muted">Downloads (HTML/JSON) sind in der lokalen Installation verfügbar.</p>' : ''}
  </section>
  ${store.getUi().showReport ? '<section class="card"><iframe id="report-frame" title="Recherche-Zusammenfassung" class="report-frame" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe></section>' : ''}`;
}

export function auditDrawer() { return ''; }
