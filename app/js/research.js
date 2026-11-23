// Research runs. Live mode calls the local server proxy (/api/search) only;
// offline mode matches curated public references. A live run without EPO keys
// takes its patents from the prepared set; those results stay "curated" and the
// run is shown as "Live + Vorbereitet" (see runMode in views.js).
import * as store from './store.js';
import { matchCurated, checkQuery } from './rules.js';

const PROVIDER_KIND = { epo: 'patent', ted: 'procurement', crossref: 'research' };
const TERM_KEY = { epo: 'patent', ted: 'procurement', crossref: 'research' };

export async function fetchStatus() {
  try {
    const r = await fetch('/api/status', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { ok: true, ...(await r.json()) };
  } catch (e) {
    // No proxy (static hosting): research runs against the prepared data set only.
    return { ok: false, static: true, error: 'Gehostete Demo ohne Recherche-Server: Suche im vorbereiteten Datenbestand.' };
  }
}

function overall(queries) {
  const st = queries.map(q => q.status);
  if (st.some(s => s === 'running')) return 'running';
  if (st.every(s => s === 'succeeded' || s === 'empty')) return 'succeeded';
  if (st.some(s => s === 'succeeded' || s === 'empty' || s === 'partial')) return 'partial';
  return 'failed';
}

async function callProvider(provider, query, limit, timeout) {
  const t0 = performance.now();
  try {
    const r = await fetch('/api/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, query, limit, timeout }),
      signal: AbortSignal.timeout((timeout + 5) * 1000),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { provider, query, status: 'failed', error: body.error || `HTTP ${r.status}`, results: [], count: 0, fetched_at: new Date().toISOString() };
    return body;
  } catch (e) {
    return { provider, query, status: 'failed', error: e.name === 'TimeoutError' ? 'Zeitüberschreitung' : `Netzwerkfehler: ${e.message}`, results: [], count: 0, fetched_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - t0) };
  }
}

// specs: [{provider, query}]
export async function startLive({ specs, limit, timeout, label, separate = false }) {
  const s = store.getState();
  const run = {
    id: store.actions.nextRunId(), mode: 'live', label, separate, startedAt: new Date().toISOString(),
    profileVersion: s.profile.version, planVersion: s.plan?.version ?? null, fieldId: separate ? null : s.plan?.fieldId,
    queries: specs.map(sp => ({ ...sp, status: 'running', count: 0, total: null })), results: [], status: 'running',
  };
  store.actions.addRun(run);
  await Promise.all(specs.map(async (sp, i) => {
    const res = await callProvider(sp.provider, sp.query, limit, timeout);
    // Without EPO credentials the patent query runs against the prepared patent
    // set instead. Results keep mode 'curated' and are never labelled live.
    if (sp.provider === 'epo' && res.status === 'not_configured') {
      const hits = searchPreparedPatents(sp.query);
      const q = { provider: 'epo-demo', query: sp.query, status: hits.length ? 'succeeded' : 'empty', count: hits.length, total: hits.length,
        fetchedAt: new Date().toISOString(), durationMs: 0, error: null, note: 'EPO nicht konfiguriert – Suche im vorbereiteten Patentbestand' };
      const cur = store.getState().runs.find(r => r.id === run.id);
      const queries = cur.queries.map((qq, k) => (k === i ? q : qq));
      store.actions.updateRun(run.id, { queries, results: cur.results.concat(hits), status: overall(queries), demoPatents: true });
      return;
    }
    const q = { provider: sp.provider, query: sp.query, status: res.status, count: res.count || 0, total: res.total ?? null,
      fetchedAt: res.fetched_at, durationMs: res.duration_ms ?? null, error: res.error || null, request: res.request || null };
    const results = (res.results || []).map((x, j) => ({ ...x, id: `${run.id}-${sp.provider}-${j + 1}`, runId: run.id, kind: x.kind || PROVIDER_KIND[sp.provider] }));
    const cur = store.getState().runs.find(r => r.id === run.id);
    const queries = cur.queries.map((qq, k) => (k === i ? q : qq));
    store.actions.updateRun(run.id, { queries, results: cur.results.concat(results), status: overall(queries) });
  }));
  // There is no live source for competitor products: add the prepared product
  // references that match the same terms (labelled as prepared).
  const src = store.getSources().publicSources;
  const seen = new Set();
  const products = specs.flatMap(sp => matchCurated(src.sources, sp.query).filter(h => h.kind === 'product')
    .filter(h => !seen.has(h.id) && seen.add(h.id)).map(h => curatedResult(h, sp.query, src.verified_on)));
  const cur = store.getState().runs.find(r => r.id === run.id);
  store.actions.updateRun(run.id, { finishedAt: new Date().toISOString(), results: cur.results.concat(products) });
}

export function planSpecs(plan) {
  return Object.entries(plan.providers).filter(([, on]) => on)
    .map(([p]) => ({ provider: p, query: p === 'crossref' ? plan.terms[TERM_KEY[p]].replace(/[;,]/g, ' ') : plan.terms[TERM_KEY[p]] }));
}

function curatedResult(h, query, verifiedOn) {
  return {
    id: h.id, curatedId: h.id, provider: 'curated', kind: h.kind, mode: 'curated', identifier: h.publication || h.id,
    title: h.title, url: h.url, date: h.published || null, year: h.published ? Number(h.published.slice(0, 4)) : null,
    summary: h.summary, evidence: h.evidence, anchor: h.anchor, problem: h.problem, solution: h.solution,
    family: h.origin || h.id, legal_status: null, query, retrieved_at: verifiedOn,
  };
}

// Patent search over the prepared (curated, real) publications only.
export function searchPreparedPatents(query) {
  const src = store.getSources().publicSources;
  return matchCurated(src.sources, query).filter(h => h.kind === 'patent').map(h => curatedResult(h, query, src.verified_on));
}

// Offline: curated references only, filtered by the same terms. Zero matches stay zero.
export function startOffline({ queries, label, separate = false }) {
  const s = store.getState();
  const src = store.getSources().publicSources;
  const seen = new Set();
  const qrows = [];
  const results = [];
  for (const q of queries) {
    const hits = matchCurated(src.sources, q.query);
    qrows.push({ provider: 'curated', query: q.query, status: hits.length ? 'succeeded' : 'empty', count: hits.length, total: hits.length, fetchedAt: new Date().toISOString(), durationMs: 0, error: null });
    for (const h of hits) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      results.push(curatedResult(h, q.query, src.verified_on));
    }
  }
  store.actions.addRun({
    id: store.actions.nextRunId(), mode: 'offline', label, separate, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
    profileVersion: s.profile.version, planVersion: s.plan?.version ?? null, fieldId: separate ? null : s.plan?.fieldId,
    queries: qrows, results, status: 'succeeded',
  });
}

export { checkQuery };
