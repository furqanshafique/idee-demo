# IDEE demo – bug log

Branch `idee-updates`, tested 23–24 Nov 2026.

**How tested:** TEST_GUIDE.md Tests 1–11, automated in headless Chrome.
- First run, before fixes – local server (`http://127.0.0.1:8770/app/`, EPO keys not yet set): 78 / 86 passed.
- First run, before fixes – GitHub Pages copy (`https://ksteri.github.io/idee-demo/app/`): 77 / 86 passed.
- After fixes B1–B10 (local): **91 / 91 passed**, no console errors.

Of the failed checks, 4 were mistakes in the test script (for example, CSS capitals turning "Kundenaussage" into "KUNDENAUSSAGE"). The rest are listed below.

Unit tests: 25 rule + 14 server, all green (2 + 2 new for B8).

Severity: **Critical** = can break the demo · **High** = breaks a CLAUDE.md rule · **Medium** = visible to the client · **Low** = polish.

| # | Severity | Where | Expected | Actual | Status |
|---|---|---|---|---|---|
| B1 | Critical | Server, page load | The app starts on every load | About 1 in 8 fresh loads hung on „Daten werden geladen …“. Chrome opens 6 parallel connections for the JS modules, the server's listen backlog is 5, and macOS reset the extra one (`ERR_CONNECTION_RESET` on `rules.js` / `export.js` / `base.js`). | **Fixed:** `server/server.py` backlog set to 64. 0 / 20 failures after the fix. |
| B2 | High | Step 5 run details, step 7 run table, HTML report | A run whose patents come from the prepared set is not called „Live“ | The whole run is marked `mode: 'live'`, so the UI shows „Details zu diesem Suchlauf (live)“ and the step 7 table and report show **LIVE**, while the patent query was `epo-demo` (prepared). The step 5 nav dot also turns green on this basis. Individual results are labelled correctly. The comment in `research.js` says „Never mixes the two“, but it does. | **Fixed:** `runMode()` in `views.js`. Such a run now shows „Live + Vorbereitet (Patente)“ in the step 5 run line, run selector and details, the step 7 table and the report. |
| B3 | Medium | HTML / JSON report | Same provenance badges as the app: Fiktiv, Vorbereitet, Live, Manuell, Kundenaussage | The report uses „LIVE-API“, „Vorbereiteter Referenztreffer (kuratiert, nicht abgerufen)“, „vorbereitet/offline“ and „synthetisch“, and shows the raw provider code `epo-demo`. The README uses yet another term, „Synthetisch“. | **Fixed:** the report and JSON use Live / Vorbereitet / Manuell / fiktiv with a short note, and readable source names instead of `epo-demo`. The viewer and upload texts say „fiktiv“ too. |
| B4 | Medium | PDF side panel | The panel belongs to the document steps | When a PDF is opened in step 2, the panel stays open in steps 3–8 and takes about a third of the width on the research and opportunity screens. | **Fixed:** changing step closes the panel (`main.js`). The panel opens as an overlay below 1100 px. |
| B5 | Low | Step 6, H-02 „Speichern“ | A new version only when something changed | Every click on „Speichern“ adds a version, even with no change (Verlauf 3 → 4). This fills the history with empty entries. | **Fixed** in `main.js` (no `store.js` change): saving without a change creates no version and says so. |
| B6 | Low | Flash message | A message relates to the screen it was raised on | The message „Plan bestätigt …“ is still shown at the top of step 5. | **Fixed:** changing step clears the message (`main.js`). |
| B7 | Low | Patent links (prepared) | CLAUDE.md: link to Espacenet | Prepared PAT-01 and PAT-02 link to Google Patents. The live EPO path already links to Espacenet. | **Fixed:** `public_sources.json` links to Espacenet (same format as the live path). Espacenet shows a short Cloudflare check to automated browsers, so this was checked by hand. |
| B8 | High | Step 4 identifier guard | „No internal IDs“ | UL-01, BeispielMed, MH-A, PB-17 and IDEE-01 are blocked. The app's own IDs (CAP-01, SF-01, H-01, RUN-001) are **not** blocked. | **Fixed:** `APP_ID_RE` in `rules.js` and `providers.py`, first proven by a failing test. New tests check that ordinary terms like „ISO 10993-1“ and „Q-Switch“ still pass. |
| B9 | Low | Browser console | No errors | `favicon.ico` returns 404 on every load. The hosted copy also logs a 404 for `/api/status` (the expected check for a server, but it shows in the console). | **Fixed:** favicon added. The hosted `/api/status` probe remains by design. |
| B10 | Medium | Styling | Devoreo theme active, font self-hosted | `app/theme.css` is not linked from `app/index.html`, so none of the theme applies. „Inter“ is named but no font files are shipped, so each browser falls back to its own font. | **Fixed:** new complete design system in `theme.css`, Inter 4.1 self-hosted in `app/fonts/` (SIL OFL). |
| B12 | High | Live EPO patent search (found once keys were set, 24 Nov) | Live search finds WO2021055483A1 and Test 7 shows its problem card | OPS lists **one publication per patent family**. For „universal modular test fixture“ it returns CA3149717A1, which belongs to the same family as WO2021055483A1 (EPO family 72659981, 34 publications). The app matched prepared patents only by exact number, so with live EPO the problem card, „Patent öffnen“ link and H-01 check disappeared (7 checks failed). `live_smoke.py` also only accepted the exact WO number. | **Fixed:** `public_sources.json` stores the EPO family for PAT-01/PAT-02. A live hit from that family stays „Live“ and gets the checked analysis card. The card links to the checked WO document and says it is from the same family as the live hit. Patent cards show „Patentfamilie …“. `live_smoke.py` looks up WO2021055483A1 by number (`pn=`), checks its Espacenet link, and checks the topic search hits its family. |
| B11 | Low | Dev setup on this Mac | `python3 server/server.py` works | `python3` points to an Intel-only build („bad CPU type“). This is a machine issue, not a repo issue. Workaround: `/usr/bin/python3`. | Workaround |

## Checked and working
- Test 1: the full story from steps 1–8, including quote verification, the problem card for WO2021055483A1, H-01 rejection and H-02's five dimensions.
- Test 2: opens the viewer on the right page, ‹ › paging stops at the last page, × closes it.
- Tests 3–11 work as the guide describes. This includes:
  - the CAP-Q01 customer statement, which cannot be confirmed
  - the plan guard blocking UL-01
  - the Kaltplasma example labelled „Vorbereitet“
  - the matching case: 25 kg / 0,5 mm against 50 kg / 0,1 mm, with history after toggling
  - reload and re-import without duplicates
  - own-PDF upload: a verified quote is accepted, an invented one goes to the Prüfliste, `.txt` and fake PDFs are rejected
- The research plan generated from SF-01 contains no internal IDs.
- No live label appears on prepared patents while EPO is not configured.
- **Live EPO (24 Nov 2026, real keys):** `tests/live_smoke.py` 5/5 PASS – TED, Crossref, EPO topic search (13 hits), WO2021055483A1 by number with Espacenet link, and the family check. All 91 guide checks pass with live EPO; a full run is labelled „Live + Vorbereitet“ because market products have no live source.

## Not yet tested
- Firefox, Safari and Edge
- Narrow screens: checked by screenshot at 1024 / 768 / 390 px in Chrome only
