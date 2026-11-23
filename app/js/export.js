// Research summary export (HTML + JSON). Built from state only, in the current UI language.
import * as store from './store.js';
import * as R from './rules.js';
import { esc, missingData, dimLabels } from './views.js';
import { L, tr, getLang, locale } from './i18n.js';

const disclaimer = () => L(
  'Vorläufige Hypothese – keine Investitionsentscheidung. Betriebsdaten sind synthetisch (Demo); Bestätigungen gelten nur für das Demo-Profil, nicht für Ergo-Tec.',
  'Preliminary hypothesis – not an investment decision. Company data is synthetic (demo); confirmations apply only to the demo profile, not to Ergo-Tec.');
const mode = m => ({
  live: 'LIVE-API',
  curated: L('Vorbereiteter Referenztreffer (kuratiert, nicht abgerufen)', 'Prepared reference hit (curated, not fetched)'),
  manual: L('Manuell erfasst', 'Entered manually'),
}[m]);

export function buildJson() {
  const s = store.getState();
  return {
    disclaimer: disclaimer(), language: getLang(), exported_at: new Date().toISOString(), schema: s.schema,
    project: s.project, profile_version: s.profile.version, profile_history: s.profile.history.map(({ snapshot, ...h }) => h),
    documents: s.documents.map(({ pageTexts, ...d }) => d),
    capabilities: s.capabilities, review_queue: s.reviewQueue, answers: s.answers,
    selected_fields: s.selectedFieldIds, plan: s.plan,
    runs: s.runs.map(r => ({ ...r, results: r.results.map(x => ({ ...x, retrieval_mode: mode(x.mode) })) })),
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
  const dims = dimLabels();
  const P = L('S.', 'p.');
  return `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><title>IDEE ${L('Recherche-Zusammenfassung', 'Research summary')} ${esc(s.project.id)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:960px;margin:24px auto;padding:0 16px;color:#18222d}h1{font-size:22px}h2{font-size:17px;margin-top:28px;border-bottom:1px solid #ddd}
.disc{background:#7c2d12;color:#fff;padding:10px 14px;border-radius:6px;font-weight:600}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}code{background:#eef;padding:0 3px}
.live{color:#0f766e;font-weight:600}.cur{color:#92400e;font-weight:600}</style></head><body>
<div class="disc">${esc(disclaimer())}</div>
<h1>DEVOREO / IDEE – ${L('Recherche-Zusammenfassung', 'Research summary')}</h1>
<p>${L('Projekt', 'Project')} <b>${esc(s.project.id)}</b> · ${esc(tr(s.project.case))} · ${L('Profilversion', 'Profile version')} <b>v${s.profile.version}</b> · Plan ${s.plan ? 'v' + s.plan.version : '–'} · ${L('exportiert', 'exported')} ${new Date().toLocaleString(locale())}</p>
<h2>${L('Auftrag', 'Brief')}</h2><p>${esc(tr(s.project.goal))} · Region: ${esc(tr(s.project.region))} · Budget: ${s.project.pilot_budget_eur ?? L('unbekannt', 'unknown')}</p>
<h2>${L('Fähigkeiten (Demo-Profil, synthetisch)', 'Capabilities (demo profile, synthetic)')}</h2><table><tr><th>ID</th><th>${L('Titel', 'Title')}</th><th>${L('Herkunft', 'Origin')}</th><th>Status</th><th>${L('Beleg', 'Evidence')}</th></tr>
${s.capabilities.map(c => `<tr><td>${esc(c.id)}</td><td>${esc(tr(c.title))}</td><td>${esc(tr(R.ORIGIN[c.origin]))}</td><td>${esc(tr(R.CONFIRMATION[c.confirmation]))}</td><td>${c.source?.quote ? `${esc(c.source.document_id)} ${P}${c.source.page}: „${esc(c.source.quote)}“ (${c.verified ? L('verifiziert', 'verified') : L('nicht verifiziert', 'not verified')}; ${esc(tr(c.method))})` : L('Interview, Nachweis ausstehend', 'Interview, evidence pending')}</td></tr>`).join('')}</table>
<h2>${L('Recherchelauf-Versionen', 'Research run versions')}</h2><table><tr><th>${L('Lauf', 'Run')}</th><th>${L('Modus', 'Mode')}</th><th>${L('Profil/Plan', 'Profile/plan')}</th><th>${L('Abfragen', 'Queries')}</th></tr>
${s.runs.map(r => `<tr><td>${esc(r.id)}${r.separate ? ` ${L('(separater Test)', '(separate test)')}` : ''}</td><td>${r.mode === 'live' ? '<span class="live">LIVE</span>' : `<span class="cur">${L('vorbereitet/offline', 'prepared/offline')}</span>`}</td><td>v${r.profileVersion} / ${r.planVersion ? 'v' + r.planVersion : '–'}</td><td>${r.queries.map(q => `${esc(q.provider)} „${esc(q.query)}“: ${esc(q.status)} (${q.count}/${q.total ?? '?'})${q.error ? ' – ' + esc(tr(q.error)) : ''}`).join('<br>')}</td></tr>`).join('')}</table>
<h2>${L('Originalquellen', 'Original sources')}</h2><table><tr><th>ID</th><th>${L('Titel', 'Title')}</th><th>${L('Abrufmodus', 'Retrieval mode')}</th><th>${L('Datum', 'Date')}</th><th>Link</th></tr>
${s.runs.flatMap(r => r.results.map(x => [r, x])).map(([r, x]) => `<tr><td>${esc(x.identifier)}</td><td>${esc(tr(x.title))}</td><td>${esc(mode(x.mode))}${x.mode === 'live' ? ' · ' + esc(x.provider) + ' · ' + esc(x.retrieved_at) : ''} (${esc(r.id)})</td><td>${esc(x.date || '–')}</td><td>${link(x.url)}</td></tr>`).join('')}
${s.manualSources.map(m => `<tr><td>${esc(m.id)}</td><td>${esc(m.title)}</td><td>${L('Manuell', 'Manual')}</td><td>–</td><td>${link(m.url)}</td></tr>`).join('')}</table>
<h2>${L('Hypothesen', 'Hypotheses')}</h2>${s.hypotheses.map(h => `<h3>${esc(h.id)} v${h.version}: ${esc(tr(h.title))} – ${esc(tr(R.HYP_STATUS[h.status] || h.status))}</h3>
<p>${h.reason ? esc(tr(h.reason)) : ''}${h.synthetic_basis ? ` ${L('(synthetischer Test – keine reale Evidenz)', '(synthetic test – no real evidence)')}` : ''}</p>
<table>${Object.entries(a(h).dims).map(([k, d]) => `<tr><td>${esc(dims[k] || k)}</td><td>${esc(tr(d.status))}</td><td>${esc(tr(d.note || ''))}</td></tr>`).join('')}</table>
<p>${L('Quellen', 'Sources')}: ${h.source_ids.map(esc).join(', ') || '–'} · ${L('Priorisierung', 'Prioritisation')}: ${a(h).priorityAllowed ? L('formal zulässig', 'formally allowed') : `${L('nicht zulässig', 'not allowed')} (${esc(a(h).blockers.map(tr).join('; '))})`}</p>`).join('')}
<h2>${L('Zurückgestellte / verworfene Alternativen', 'Deferred / rejected alternatives')}</h2><ul>${deferred.map(h => `<li>${esc(h.id)}: ${esc(tr(h.title))} – ${esc(tr(h.reason || ''))}</li>`).join('') || `<li>${L('keine', 'none')}</li>`}</ul>
<h2>${L('Fehlende Daten', 'Missing data')}</h2><ul>${missingData().map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p><i>${L(`Patent-Rechtsstand und Handlungsfreiheit (FTO) wurden nicht geprüft. Kuratierte Referenzen wurden am ${esc(store.getSources().publicSources.verified_on)} geprüft und nicht von der App abgerufen.`, `Patent legal status and freedom to operate (FTO) were not checked. Curated references were checked on ${esc(store.getSources().publicSources.verified_on)} and not fetched by the app.`)}</i></p>
</body></html>`;
}

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
