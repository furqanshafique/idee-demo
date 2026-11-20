// Research summary export (HTML + JSON). Built from state only.
import * as store from './store.js';
import * as R from './rules.js';
import { esc, missingData } from './views.js';

const DISCLAIMER = 'Vorläufige Hypothese – keine Investitionsentscheidung. Betriebsdaten sind synthetisch (Demo); Bestätigungen gelten nur für das Demo-Profil, nicht für Ergo-Tec.';
const MODE = { live: 'LIVE-API', curated: 'Vorbereiteter Referenztreffer (kuratiert, nicht abgerufen)', manual: 'Manuell erfasst' };

export function buildJson() {
  const s = store.getState();
  return {
    disclaimer: DISCLAIMER, exported_at: new Date().toISOString(), schema: s.schema,
    project: s.project, profile_version: s.profile.version, profile_history: s.profile.history.map(({ snapshot, ...h }) => h),
    documents: s.documents.map(({ pageTexts, ...d }) => d),
    capabilities: s.capabilities, review_queue: s.reviewQueue, answers: s.answers,
    selected_fields: s.selectedFieldIds, plan: s.plan,
    runs: s.runs.map(r => ({ ...r, results: r.results.map(x => ({ ...x, retrieval_mode: MODE[x.mode] })) })),
    manual_sources: s.manualSources,
    hypotheses: s.hypotheses.map(h => ({ ...h, assessment: store.assess(h) })),
    missing_data: missingData(),
  };
}

export function buildHtml() {
  const s = store.getState();
  const a = h => store.assess(h);
  const link = u => (/^https:\/\//.test(u || '') ? `<a href="${esc(u)}">${esc(u)}</a>` : '–');
  const deferred = s.hypotheses.filter(h => ['deferred', 'novelty_rejected', 'rejected'].includes(h.status));
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>IDEE Recherche-Zusammenfassung ${esc(s.project.id)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:960px;margin:24px auto;padding:0 16px;color:#18222d}h1{font-size:22px}h2{font-size:17px;margin-top:28px;border-bottom:1px solid #ddd}
.disc{background:#7c2d12;color:#fff;padding:10px 14px;border-radius:6px;font-weight:600}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}code{background:#eef;padding:0 3px}
.live{color:#0f766e;font-weight:600}.cur{color:#92400e;font-weight:600}</style></head><body>
<div class="disc">${esc(DISCLAIMER)}</div>
<h1>DEVOREO / IDEE – Recherche-Zusammenfassung</h1>
<p>Projekt <b>${esc(s.project.id)}</b> · ${esc(s.project.case)} · Profilversion <b>v${s.profile.version}</b> · Plan ${s.plan ? 'v' + s.plan.version : '–'} · exportiert ${new Date().toLocaleString('de-DE')}</p>
<h2>Auftrag</h2><p>${esc(s.project.goal)} · Region: ${esc(s.project.region)} · Budget: ${s.project.pilot_budget_eur ?? 'unbekannt'}</p>
<h2>Fähigkeiten (Demo-Profil, synthetisch)</h2><table><tr><th>ID</th><th>Titel</th><th>Herkunft</th><th>Status</th><th>Beleg</th></tr>
${s.capabilities.map(c => `<tr><td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${esc(R.ORIGIN[c.origin])}</td><td>${esc(R.CONFIRMATION[c.confirmation])}</td><td>${c.source?.quote ? `${esc(c.source.document_id)} S.${c.source.page}: „${esc(c.source.quote)}“ (${c.verified ? 'verifiziert' : 'nicht verifiziert'}; ${esc(c.method)})` : 'Interview, Nachweis ausstehend'}</td></tr>`).join('')}</table>
<h2>Recherchelauf-Versionen</h2><table><tr><th>Lauf</th><th>Modus</th><th>Profil/Plan</th><th>Abfragen</th></tr>
${s.runs.map(r => `<tr><td>${esc(r.id)}${r.separate ? ' (separater Test)' : ''}</td><td>${r.mode === 'live' ? '<span class="live">LIVE</span>' : '<span class="cur">vorbereitet/offline</span>'}</td><td>v${r.profileVersion} / ${r.planVersion ? 'v' + r.planVersion : '–'}</td><td>${r.queries.map(q => `${esc(q.provider)} „${esc(q.query)}“: ${esc(q.status)} (${q.count}/${q.total ?? '?'})${q.error ? ' – ' + esc(q.error) : ''}`).join('<br>')}</td></tr>`).join('')}</table>
<h2>Originalquellen</h2><table><tr><th>ID</th><th>Titel</th><th>Abrufmodus</th><th>Datum</th><th>Link</th></tr>
${s.runs.flatMap(r => r.results.map(x => [r, x])).map(([r, x]) => `<tr><td>${esc(x.identifier)}</td><td>${esc(x.title)}</td><td>${esc(MODE[x.mode])}${x.mode === 'live' ? ' · ' + esc(x.provider) + ' · ' + esc(x.retrieved_at) : ''} (${esc(r.id)})</td><td>${esc(x.date || '–')}</td><td>${link(x.url)}</td></tr>`).join('')}
${s.manualSources.map(m => `<tr><td>${esc(m.id)}</td><td>${esc(m.title)}</td><td>Manuell</td><td>–</td><td>${link(m.url)}</td></tr>`).join('')}</table>
<h2>Hypothesen</h2>${s.hypotheses.map(h => `<h3>${esc(h.id)} v${h.version}: ${esc(h.title)} – ${esc(R.HYP_STATUS[h.status] || h.status)}</h3>
<p>${h.reason ? esc(h.reason) : ''}${h.synthetic_basis ? ' (synthetischer Test – keine reale Evidenz)' : ''}</p>
<table>${Object.entries(a(h).dims).map(([k, d]) => `<tr><td>${esc(k)}</td><td>${esc(d.status)}</td><td>${esc(d.note || '')}</td></tr>`).join('')}</table>
<p>Quellen: ${h.source_ids.map(esc).join(', ') || '–'} · Priorisierung: ${a(h).priorityAllowed ? 'formal zulässig' : 'nicht zulässig (' + esc(a(h).blockers.join('; ')) + ')'}</p>`).join('')}
<h2>Zurückgestellte / verworfene Alternativen</h2><ul>${deferred.map(h => `<li>${esc(h.id)}: ${esc(h.title)} – ${esc(h.reason || '')}</li>`).join('') || '<li>keine</li>'}</ul>
<h2>Fehlende Daten</h2><ul>${missingData().map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p><i>Patent-Rechtsstand und Handlungsfreiheit (FTO) wurden nicht geprüft. Kuratierte Referenzen wurden am ${esc(store.getSources().publicSources.verified_on)} geprüft und nicht von der App abgerufen.</i></p>
</body></html>`;
}

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
