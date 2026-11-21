# DEVOREO / IDEE – Innovation Discovery Engine (functional prototype)

> **▶ Demo zum Durchklicken:** https://claude.ai/artifact/9HNXQMZyyqLtQXvS1yCYyB
> (Online-Version ohne Server; Recherche läuft auf vorbereiteten echten Quellen.)
> **Testanleitung:** [TEST_GUIDE.md](TEST_GUIDE.md)

German-language interactive prototype for the Ergo-Tec client demo (27 Nov 2026). Internal prototype; all company data is **synthetic**. The original kit notes are in `KIT_NOTES.md`; the build brief is `CLAUDE_BUILD_PROMPT.md`.

## Start

Requirements: Python 3.9+ (standard library only), a current browser. No Node, no build step, no `pip install`.

```bash
python3 server/server.py
```

Open http://127.0.0.1:8770/app/ (`IDEE_PORT=9000 python3 server/server.py` for another port). Opening `index.html` via `file://` does not work: the app needs the server for data files and the research proxy.

### Hosted click-through copy (no server)

Click-through link (claude.ai artifact, owner must share it): https://claude.ai/artifact/9HNXQMZyyqLtQXvS1yCYyB

`tools/build_hosted.sh <output-dir>` builds a flat copy (page, `js/`, `vendor/`, `data/`, `documents/`) that sets `<meta name="devoreo-base" content=".">`. Without the server, the app switches to hosted mode: „Recherche starten (Demo-Bestand)“ searches only the prepared sources in `public_sources.json` (labelled „Vorbereiteter Referenztreffer“), the report is shown in the page instead of downloaded, and AI extraction is unavailable. Everything else (PDF import and viewer, quote verification, profile, fields, plan, hypotheses, matching case) works the same. The hosted copy is a snapshot: rebuild and republish after code changes. The artifact sandbox blocks external API calls and downloads, which is why live search only runs in the local installation.

### Environment (optional, server-side only)

```bash
cp .env.example .env    # then fill in values; .env is git-ignored and never sent to the browser
```

| Variable | Effect |
|---|---|
| `EPO_CONSUMER_KEY`, `EPO_CONSUMER_SECRET` | Enables live patent search (EPO OPS 3.2, OAuth client credentials). Without them, the patent query of every run searches the prepared patent set (`public_sources.json`, kind `patent`) instead: shown as provider „Patente (Demo-Bestand)“, results labelled „Vorbereiteter Referenztreffer“, never „LIVE“. TED and Crossref stay live. |
| `RESEARCH_CONTACT_EMAIL` | Sent as `mailto` to Crossref (polite pool). |
| `ANTHROPIC_API_KEY` | Enables the optional AI extraction button (synthetic documents only, explicit opt-in). A Claude Code subscription is not a runtime API key. |

Restart the server after editing `.env`.

## Tests

```bash
./tests/run_tests.sh        # 23 rule unit tests (JavaScriptCore) + 12 server tests (offline)
python3 tests/live_smoke.py # real calls to TED, Crossref, EPO (network; EPO = BLOCKED without keys)
```

The rule tests also run in the browser: http://127.0.0.1:8770/app/tests.html (tab title turns `PASS`/`FAIL`). Server tests use real TED/Crossref responses captured on 20 Nov 2026 (`tests/fixtures/*_live_capture.json`) and one **hand-written** OPS shape sample (`ops_shape_sample.json`, parser test only – not a real result).

## Architecture

| Path | Purpose |
|---|---|
| `server/server.py` | Static files (only `app/`, `data/`, `documents/`, `tests/`) + `/api/status`, `/api/search`, `/api/extract`. Rate limit 40 external calls/min, body cap, no generic URL fetch. |
| `server/providers.py` | Allowlisted providers: Crossref, TED v3, EPO OPS 3.2, Anthropic (optional). Query guard (≤200 chars, blocks internal identifiers such as UL-01, BeispielMed, MH-A, PB-17 …), text sanitizing, normalized results. |
| `app/js/rules.js` | Pure business rules: quote verification, field eligibility, Q-01 handling, curated matching, demand-signal and hypothesis assessment, matching case. |
| `app/js/store.js` | State, versioning (profile, plan, runs, hypotheses), actions; `localStorage` key `devoreo.idee.demo.v1`. |
| `app/js/research.js` | Live runs via the proxy; offline runs over `data/public_sources.json`. Never mixed, no fallback. |
| `app/js/pdftext.js` | pdf.js text extraction per page + SHA-256. |
| `app/js/views.js`, `main.js`, `export.js`, `viewer.js` | Screens, events, HTML/JSON report, PDF side panel. `viewer.js` and the base styles are reused from the Zulassungsakte prototype. |
| `app/vendor/` | pdf.js 3.11.174 (vendored, no CDN). |

`window.__idee` exposes store/actions for debugging.

**Data provenance badges.** Every record carries one: *Synthetisch* (fictional company data), *Vorbereiteter Referenztreffer* / *Öffentliche Quelle (kuratiert)* (from `public_sources.json`, verified for the kit, not fetched by the app), *LIVE · provider · time* (a real API response in this run), *Manuell* (analyst-entered URL, not fetched), *Kundenaussage* (interview answer, evidence pending).

## Acceptance tests – results (run 20 Nov 2026 in the browser pane + scripts)

| # | Result | Notes |
|---|---|---|
| 1 | **Passed** | Fresh project: profile v0, no capabilities. IDEE-01 parsed with pdf.js (3 pages), hash matched, CAP-01…04 quotes verified on the real page text (method „Musterextraktion / regelbasiert“). Page 1/2 links render the actual PDF. No motor-design or capacity claim. Confirm/correct works, survives refresh. Re-import of identical bytes: no duplicates. |
| 2 | **Passed** | Q-01 = Eigenentwicklung → separate CAP-Q01 „Kundenaussage, Nachweis ausstehend“, cannot be confirmed, not used for fields. Deselecting CAP-03 deactivates SF-01 and SF-02 with reason; reselecting restores them. Q-03 values without evidence are rejected; missing values stay open. |
| 3 | **Partially passed** | Plan editable and confirmed; internal IDs in terms block confirmation. Live run: **TED** 25/61 notices and **Crossref** 25 results, original links open (TED notice verified in browser). **EPO: BLOCKED – no credentials**; for the introduction demo the patent query searches the prepared patent set instead (labelled, not live). The live patent part of this test is **not passed**. Offline mode is separately labeled and usable. |
| 4 | **Passed (offline)** | WO2021055483A1 problem card separates problem (paraphrase of Background [0003]), solution, section, date, unknown legal status; no FTO/demand claim. Unrelated query → 0 results. „Kaltplasma, Bodenreinigung“ offline → only PAT-02, novelty claim corrected. Live patent retrieval of WO2021055483A1 is untested (needs EPO keys; `live_smoke.py` checks it). |
| 5 | **Passed** | H-01 → „Neuheit verworfen / zurückgestellt“ only after PAT-01 and ALT-01 were found in a run. H-02 stays a research hypothesis; priority blocked (no recent authentic demand signal, budget unknown). Matching case: 50 kg / 0,1 mm vs. 25 kg / 0,5 mm + unconfirmed partner → „Transfer offen – Versuch/Nachweis nötig“. Toggle alternative → H-02 v2 deferred, back → v3; history kept. |
| 6 | **Passed** | HTML/JSON export contains disclaimer, profile/plan/run versions, original links with retrieval mode, missing data, deferred alternatives. Reset (with in-page confirmation) returns to baseline. Unit tests: 23 + 12 green. |

Also checked: unknown PDF upload (text extracted, no seed metadata, manual capability with verified passage; wrong passage goes to the review list), `.txt` and fake PDF rejected, static allowlist (`.env`, `references/`, `server/` return 404).

## Implemented / simulated / blocked

- **Implemented:** real PDF parsing and quote verification; capability confirmation with profile versions; Q-01–Q-03; capability-driven field derivation (max. 2 fields); editable research plan with identifier guard; live TED and Crossref search; family grouping (contract + award notice of one procedure count once); research signals by year as sample counts; offline curated mode; manual sources; hypothesis versioning, per-dimension status, counterevidence flow; synthetic matching case; export; reset.
- **Implemented but untested live:** EPO OPS connector (OAuth, CQL `ta=` search, biblio parsing, Espacenet link) – parser tested only against a hand-written shape sample; optional Claude extraction (`/api/extract`, schema + quote verification client-side).
- **Simulated / fixture-based:** seed capability candidates for known documents (applied only after hash match and on-page quote verification); illustrative SF-01/SF-02 mapping; H-01/H-02 starting texts; synthetic matching case.
- **Not built (out of scope this week):** 628-field catalog UI, multi-country agent engine, patent full-text/claims analysis, legal status, scoring/investment recommendation, multi-user, authentication, server-side persistence (state lives in each browser's localStorage).

## Known limitations

- Uploaded (unknown) PDFs keep text and hash after refresh, but the file itself is only held for the session; re-upload to view it.
- TED free-text OR search is broad (e.g. „Bodenreinigung“ returns cleaning-service tenders). Results are real but must be judged by the analyst; refine terms in the plan.
- Crossref relevance ranking includes old literature; the year chart is a sample of loaded hits, not a trend.
- `public_sources.json` references were verified by the kit author on 20 Nov 2026; the app does not re-check them.

## Demo walkthrough (6–8 min)

Step-by-step click instructions for testing: see `TEST_GUIDE.md`.


1. **Auftrag (1 min).** Show the question, empty budget = „unbekannt“, public Ergo-Tec sources (curated) and the note that test fixtures are already in the portfolio. Confirm scope.
2. **Unternehmensprofil (2 min).** „Musterdokument übernehmen“ IDEE-01 → 4 cards with verified quotes; click „IDEE-01 · Seite 2“ to show the original page. Confirm CAP-01/03/04, correct CAP-02. Q-01: choose „Eigenentwicklung“ → separate *Kundenaussage*, then switch to „Integration“ → claim disappears. Point to „Was die Akte nicht belegt“.
3. **Anwendungsfelder (1 min).** Abstraction chain; untick CAP-03 → both fields go inactive with reason; tick again. Select SF-01 (component, not a full test machine).
4. **Rechercheplan (1 min).** Edit terms; add „UL-01“ to show the identifier guard; remove; confirm plan.
5. **Recherche (2 min).** „Recherche starten“ → patents, tenders, articles and products; open the patent problem card for WO2021055483A1. Optional 1-minute example: „Beispiel prüfen“ (Kaltplasma) shows how a „this is new“ claim is checked against a real patent and links back to Ergo-Tec's mechanics (CAP-01, CAP-03).
6. **Chancen (1 min).** „Gegenbelege prüfen“ on H-01 → novelty rejected. H-02: dimensions, priority blocked. Load matching case → „Transfer offen“; toggle alternative → deferred, history kept.
7. **Übergabe.** Open the report in a new tab. Close with: full opportunity validation requires a confirmed company profile and independent current demand evidence.

Reset: header button „Demo zurücksetzen“ → „Ja, zurücksetzen“ (clears only `devoreo.idee.*` keys).

## Next development work

1. Obtain EPO OPS credentials, run `tests/live_smoke.py`, verify WO2021055483A1 is found by query, then re-test acceptance 3/4 live.
2. Description retrieval (`published-data/publication/.../description`) to extract problem paragraphs from full text where available.
3. Server-side persistence (SQLite) with per-run storage and audit, instead of localStorage.
4. TED: CPV-based queries and buyer/notice detail parsing; distinguish active deadlines.
5. Catalog-driven intake (628 fields) and scoring model as a separate, labeled module.
