// Pure business rules (no DOM, no storage). Unit-tested in tests/rules.test.js.
// Everything shown as a status in the UI is derived from these functions.

export const ORIGIN = {
  documented: 'dokumentiert', customer_claim: 'Kundenaussage', indication: 'Indiz',
  hypothesis: 'Hypothese', open: 'offen',
};
export const CONTROL = {
  internal_claimed: 'Eigenleistung (laut Akte)', partner_unconfirmed: 'Partner (unbestätigt)', unknown: 'unbekannt',
};
export const TRANSFER = { open: 'offen', plausible: 'plausibel', proven: 'belegt', gap: 'Lücke' };
export const CONFIRMATION = {
  proposed: 'vorgeschlagen', confirmed: 'bestätigt', corrected: 'korrigiert', open: 'offen gelassen',
};

// Identifiers that must never reach an external service (IDEE-01, p. 3).
export const FORBIDDEN_TERMS = [
  'ul-01', 'beispielmed', 'ergo-tec', 'ergotec', 'ergo tec', 'musterhub', 'mh-a',
  'ctrl-01', 'frame-01', 'top-01', 'idee-0', 'pb-17', 'pb-18', 'sn-demo', 'r1/a',
  'musterteam', 'musterbetrieb',
];
export const MAX_QUERY_LEN = 200;

// ------------------------------------------------------------ text / quotes
export function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/­/g, '')
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐-—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// Quote must occur on the given page (whitespace-normalized, case-sensitive).
export function verifyQuote(pageTexts, page, quote) {
  const q = normalizeText(quote);
  if (q.length < 8) return { ok: false, reason: 'Zitat zu kurz' };
  const text = normalizeText(pageTexts?.[page - 1]);
  if (text.includes(q)) return { ok: true, page };
  const other = (pageTexts || []).findIndex(t => normalizeText(t).includes(q));
  if (other >= 0) return { ok: false, reason: `Zitat steht auf Seite ${other + 1}, nicht auf Seite ${page}`, foundOn: other + 1 };
  return { ok: false, reason: 'Zitat im extrahierten Text nicht gefunden' };
}

// Schema check for optional LLM extraction output.
export function validateExtraction(data, pageCount) {
  const errors = [];
  if (!data || !Array.isArray(data.capabilities)) return { ok: false, errors: ['capabilities fehlt'], items: [] };
  const items = [];
  data.capabilities.forEach((c, i) => {
    const okShape = c && typeof c.title === 'string' && c.title.trim() && Number.isInteger(c.page)
      && typeof c.quote === 'string' && ['documented', 'indication', 'open'].includes(c.origin);
    if (!okShape) { errors.push(`Eintrag ${i + 1}: Schema verletzt`); return; }
    if (c.page < 1 || c.page > pageCount) { errors.push(`Eintrag ${i + 1}: Seite ${c.page} existiert nicht`); return; }
    items.push({ title: c.title.trim().slice(0, 120), page: c.page, quote: c.quote.slice(0, 400), origin: c.origin });
  });
  return { ok: errors.length === 0, errors, items };
}

// ------------------------------------------------------------ outgoing queries
export function checkQuery(q) {
  const cleaned = String(q ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return { ok: false, cleaned, error: 'Suchbegriff fehlt.' };
  if (cleaned.length > MAX_QUERY_LEN) return { ok: false, cleaned, error: `Suchbegriff zu lang (max. ${MAX_QUERY_LEN} Zeichen).` };
  const low = cleaned.toLowerCase();
  const hits = FORBIDDEN_TERMS.filter(t => low.includes(t));
  if (hits.length) return { ok: false, cleaned, error: `Interne Kennungen nicht erlaubt: ${hits.join(', ')}`, hits };
  return { ok: true, cleaned };
}

// ------------------------------------------------------------ capabilities
export function isActiveCapability(c) {
  return !!c && ['confirmed', 'corrected'].includes(c.confirmation) && c.origin === 'documented' && c.verified === true;
}

// Fields are suggested only when every linked capability is confirmed AND selected.
export function fieldEligibility(field, caps, selectedIds) {
  const missing = [];
  for (const id of field.capability_ids || []) {
    const c = caps.find(x => x.id === id);
    if (!c) missing.push({ id, reason: 'nicht im Profil' });
    else if (!isActiveCapability(c)) missing.push({ id, reason: c.origin !== 'documented' ? ORIGIN[c.origin] : CONFIRMATION[c.confirmation] || 'nicht bestätigt' });
    else if (!selectedIds.includes(id)) missing.push({ id, reason: 'abgewählt' });
  }
  return { eligible: missing.length === 0 && (field.capability_ids || []).length > 0, missing };
}

// Q-01: interview answer about drive development.
export function applyQ01(caps, answer, at) {
  const rest = caps.filter(c => c.id !== 'CAP-Q01');
  if (answer === 'Eigenentwicklung') {
    return [...rest, {
      id: 'CAP-Q01', title: 'Eigene Antriebsentwicklung (laut Kundenaussage)',
      source: { document_id: null, page: null, quote: null, interview: 'Q-01' },
      origin: 'customer_claim', control: 'unknown', transfer: 'open', confirmation: 'open',
      verified: false, evidence: 'pending', method: 'Interviewantwort Q-01', parameters: {}, requires: ['Nachweis ausstehend'],
      createdAt: at, history: [],
    }];
  }
  return rest;
}

// ------------------------------------------------------------ curated references
// Only sources whose keyword appears in the query are returned; no fallbacks.
export function matchCurated(sources, query) {
  const q = normalizeText(query).toLowerCase();
  if (!q) return [];
  return sources.filter(s => ['patent', 'procurement', 'product'].includes(s.kind)
    && (s.keywords || []).some(k => q.includes(k.toLowerCase())));
}

// ------------------------------------------------------------ evidence assessment
export function monthsBetween(isoDate, now) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

// A procurement record counts as a "recent authentic demand signal" only if it is
// live/curated real data (never synthetic), an open call (not an award), and < 24 months old.
export function isRecentDemandSignal(src, now) {
  if (!src || src.synthetic) return false;
  if (src.kind !== 'procurement') return false;
  if (!src.date) return false;
  const m = monthsBetween(src.date, now);
  if (m === null || m > 24) return false;
  return !String(src.notice_type || '').startsWith('can');
}

export function independentOrigins(sources) {
  return new Set(sources.filter(s => !s.synthetic).map(s => s.family || s.origin || s.id)).size;
}

export function assessHypothesis(h, ctx) {
  const { caps = [], sources = [], project = {}, matching = null, now = new Date(), minOrigins = 2 } = ctx;
  const linkedCaps = (h.capability_ids || []).map(id => caps.find(c => c.id === id));
  const capsOk = linkedCaps.length > 0 && linkedCaps.every(isActiveCapability);
  const demand = sources.filter(s => !s.synthetic && (s.kind === 'procurement' || s.kind === 'buyer'));
  const recent = demand.filter(s => isRecentDemandSignal(s, now));
  const counter = sources.filter(s => ['patent', 'product'].includes(s.kind));
  const origins = independentOrigins(demand.concat(counter));

  const dims = {};
  dims.kompetenz = !capsOk
    ? { status: 'offen', tone: 'warn', note: 'Nicht alle Fähigkeiten sind bestätigt.' }
    : matching?.transfer === 'open'
      ? { status: 'Noch nicht nachgewiesen – Versuch nötig', tone: 'warn', note: matching.note }
      : { status: 'Fähigkeiten bestätigt, Übertragung ungeprüft', tone: 'neutral', note: 'Im Beispielprofil bestätigt, nicht bei Ergo-Tec.' };
  dims.bedarf = demand.length === 0
    ? { status: 'nicht belegt', tone: 'bad', note: 'Noch kein echter Käufer und keine offene Ausschreibung.' }
    : recent.length === 0
      ? { status: 'nur historisches Signal', tone: 'warn', note: 'Nur ein alter Kauf – zeigt keinen heutigen Bedarf.' }
      : { status: 'Signal vorhanden – beim Käufer bestätigen', tone: 'neutral', note: `${recent.length} aktuelle(s) Signal(e), ${origins} unabhängige Herkunft(en).` };
  dims.differenzierung = counter.length
    ? { status: 'Gegenbeleg vorhanden', tone: 'bad', note: `Ähnliches gibt es schon: ${counter.map(s => s.id).join(', ')}` }
    : { status: 'ungeprüft', tone: 'warn', note: 'Noch nicht geprüft.' };
  const budgetKnown = project.pilot_budget_eur != null && project.pilot_budget_eur !== '';
  dims.ressourcen = budgetKnown && project.free_capacity_hours != null
    ? { status: 'Angaben vorhanden', tone: 'neutral', note: 'Nur Kundenangaben, nicht geprüft.' }
    : { status: 'offen', tone: 'warn', note: 'Budget und freie Kapazität sind noch unbekannt.' };
  dims.ip = { status: 'nicht geprüft', tone: 'warn', note: 'Ob Patente einen Verkauf verhindern, ist nicht geprüft.' };

  const blockers = [];
  if (origins < minOrigins) blockers.push(`weniger als ${minOrigins} unabhängige Quellen`);
  if (recent.length === 0) blockers.push('kein aktueller Käufer- oder Ausschreibungsbeleg');
  if (!capsOk) blockers.push('Fähigkeiten nicht bestätigt');
  if (!budgetKnown) blockers.push('Budget unbekannt');
  return { dims, priorityAllowed: blockers.length === 0, blockers };
}

// ------------------------------------------------------------ synthetic matching case
export function matchCase(ref, req, { partnerConfirmed = false, alternativeCovers = false } = {}) {
  const issues = [];
  if (ref.reference_load_kg == null || req.required_load_kg > ref.reference_load_kg)
    issues.push(`Last ${req.required_load_kg} kg > Referenz ${ref.reference_load_kg ?? '?'} kg`);
  if (ref.reference_position_error_mm == null || req.max_position_error_mm < ref.reference_position_error_mm)
    issues.push(`Genauigkeit ${String(req.max_position_error_mm).replace('.', ',')} mm strenger als Referenz ${String(ref.reference_position_error_mm).replace('.', ',')} mm`);
  if (!partnerConfirmed) issues.push('Metallbearbeitung durch Partner unbestätigt');
  const transfer = issues.length ? 'open' : 'plausible';
  return {
    transfer,
    label: transfer === 'open' ? 'Noch nicht nachgewiesen – Versuch nötig' : 'Wahrscheinlich machbar – Nachweis trotzdem nötig',
    issues,
    note: issues.join('; '),
    hypothesisStatus: alternativeCovers ? 'deferred' : 'hypothesis',
    reason: alternativeCovers ? 'Test: Ein fertiges Produkt erfüllt die Anfrage schon zu einem akzeptablen Preis.' : null,
  };
}

// ------------------------------------------------------------ research signals
// Year histogram over distinct families (duplicates/translations counted once).
export function signalsByYear(results) {
  const seen = new Set();
  const counts = {};
  for (const r of results) {
    if (!r.year || seen.has(r.family || r.identifier)) continue;
    seen.add(r.family || r.identifier);
    counts[r.year] = (counts[r.year] || 0) + 1;
  }
  return Object.entries(counts).map(([y, n]) => ({ year: Number(y), n })).sort((a, b) => a.year - b.year);
}

export function dedupeByFamily(results) {
  const groups = new Map();
  for (const r of results) {
    const k = r.family || r.identifier;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return [...groups.values()];
}

export const HYP_STATUS = {
  unreviewed: 'ungeprüft', hypothesis: 'Idee in Prüfung', deferred: 'zurückgestellt',
  rejected: 'verworfen', novelty_rejected: 'zurückgestellt – gibt es schon',
};
