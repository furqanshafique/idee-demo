# IDEE demo – test guide

Click-by-click. Button names are written exactly as they appear on screen. Each test says what you should see.

**Where:** open **https://ksteri.github.io/idee-demo/** – no installation needed.
(Or locally: `python3 server/server.py`, then `http://127.0.0.1:8770/app/`.)
**Before each test:** top right **„Demo zurücksetzen“** → **„Ja, zurücksetzen“**. Your clicks are saved only in your own browser.

The left menu has 8 steps. The dot next to each step turns green when it is done.

---

## Test 1 – The whole story (about 5 minutes)

This is the walkthrough for the client call.

| # | Where | Click | You should see |
|---|---|---|---|
| 1 | 1 · Auftrag | **„Umfang bestätigen und Projekt anlegen“** | Green note, button „Weiter: Unternehmensprofil →“ |
| 2 | 2 · Unternehmensprofil | **„Musterdokument übernehmen“** next to IDEE-01 | The PDF opens on the right. 4 cards appear: CAP-01 to CAP-04, each with a quote and „Textstelle geprüft“ |
| 3 | same | On each of the 4 cards: **„Bestätigen“** | Card border turns green, status „bestätigt“ |
| 4 | 3 · Anwendungsfelder | Next to SF-01 „Variantenwechsel bei mechanischen Prüfaufnahmen“: **„Auswählen“** | Button changes to „✓ Ausgewählt“ |
| 5 | 4 · Rechercheplan | **„SF-01 …“** (top), then **„Plan bestätigen“** | Search terms table, then „Plan bestätigt“ |
| 6 | 5 · Recherche | **„Recherche starten“** | Tabs fill: Patente, Ausschreibungen, Produkte am Markt (locally also Fachartikel) |
| 7 | same, tab **Patente** | read the grey box under WO2021055483A1 | „Welches Problem beschreibt das Patent?“ – problem, solution, link „Patent öffnen“ |
| 8 | 6 · Chancen, card H-01 | **„Gegen Patente und Produkte prüfen“** | H-01 turns „zurückgestellt – gibt es schon“, with the reason |
| 9 | same, card H-02 | read „Stand der Prüfung“ | 5 questions with status; „Noch nicht priorisierbar: …“ |
| 10 | 8 · Übergabe | **„Bericht anzeigen“** | Summary report appears on the page |

---

## Test 2 – Open the original PDF page

1. Step 2, on card CAP-02 click the blue link **„IDEE-01_Projektakte_UL-01.pdf · Seite 2“**.
2. **See:** the PDF opens on the right at page 2. Above the page, the quotes from that page are listed.
3. Use **‹ ›** to change pages, **×** to close.

## Test 3 – Correct a capability

1. Step 2, card CAP-02: **„Korrigieren“**.
2. Change „Übertragbar“ to „plausibel“, type a reason, **„Korrektur speichern …“**.
3. **See:** status „korrigiert“, your reason under the card, „Profilstand“ in the header goes up by one.

## Test 4 – Customer says something without proof (Q-01)

1. Step 2, box „Rückfragen an Ergo-Tec“, Q-01: choose **„Eigenentwicklung“**.
2. **See:** a new card CAP-Q01 „Eigene Antriebsentwicklung (laut Kundenaussage)“, orange „Kundenaussage“, no confirm button. It does not count as a proven capability.
3. Switch Q-01 to **„Integration zugekaufter Komponenten“**.
4. **See:** CAP-Q01 disappears.

## Test 5 – Fewer capabilities, fewer ideas

(Needs Test 1 steps 1–3 done.)

1. Step 3, middle column „Was das Team kann“: untick **CAP-03**.
2. **See:** both ideas SF-01 and SF-02 turn grey with „Inaktiv – fehlt: CAP-03 (abgewählt)“.
3. Tick CAP-03 again. **See:** both ideas are active again.

## Test 6 – No internal names go outside

(Needs Test 1 up to step 5, plan not yet confirmed.)

1. Step 4, in the „Ausschreibungen“ row add `, UL-01` to the search terms.
2. **See:** red badge „Interne Kennungen nicht erlaubt: ul-01“.
3. **„Plan bestätigen“** → red message, plan is not confirmed.
4. Remove `, UL-01` again and confirm.

## Test 7 – Example: Is „Kaltplasma zur Bodenreinigung“ new?

1. Step 5, card „Beispiel: Ist die Idee … neu?“: **„Beispiel prüfen“**.
2. **See:** tab Patente shows DE102011010355A1 with „Ergebnis: Die Idee ist bereits beschrieben.“, a table (new? no · market? open · customer problem? open · patent valid? not checked) and „Bezug zu Ergo-Tec“ with links to CAP-01 and CAP-03.
3. **„Patent öffnen“** opens the real patent page.
4. To go back to the Ergo-Tec results: dropdown „Suchläufe“ → pick the first run.

## Test 8 – „What if a finished product already exists?“

(Needs Test 1 done.)

1. Step 6, card „Rechenbeispiel: Reicht das Können …“: **„Beispiel laden“**.
2. **See:** table 25 kg / 0,5 mm (proven) vs. 50 kg / 0,1 mm (requested), result „Noch nicht nachgewiesen – Versuch nötig“.
3. Tick **„Was wäre, wenn ein fertiges Produkt die Anfrage schon erfüllt?“**
4. **See:** H-02 turns „zurückgestellt“; under H-02 „Verlauf (1)“ keeps the previous state.
5. Untick → H-02 is back to „Idee in Prüfung“, „Verlauf (2)“.

## Test 9 – Edit an idea

1. Step 6, H-02: change „Wer würde kaufen?“ → **„Speichern“**.
2. **See:** „Verlauf“ count goes up by one.

## Test 10 – Data stays, no duplicates

1. After any test, reload the page (Cmd+R). **See:** everything is still there.
2. Step 2, **„Erneut importieren“** next to IDEE-01. **See:** „IDEE-01 ist bereits importiert – nichts doppelt angelegt.“ and still 4 cards.

## Test 11 – Your own PDF (optional)

1. Step 2, **„Datei wählen“**, pick any PDF (no confidential documents).
2. **See:** it appears in the document table as „unbekannt“. No cards are created automatically.
3. Box „Fähigkeit von Hand ergänzen“: choose the document, page, a title, and paste a sentence copied exactly from the PDF → **„Anlegen“**. **See:** new card with „Textstelle geprüft“.
4. Type a sentence that is not in the PDF → **See:** „Textstelle nicht gefunden“, it goes to the „Prüfliste“, not into the profile.
5. A non-PDF file (e.g. .txt) → red message „nur PDF“.

---

## Online demo vs. local installation

| | Online (ksteri.github.io/idee-demo) | Local (`python3 server/server.py`) |
|---|---|---|
| Ausschreibungen (TED), Fachartikel (Crossref) | prepared sources | searched live |
| Patente | prepared sources | prepared sources (live only with EPO access) |
| Report | „Bericht anzeigen“ | also download as HTML / JSON |

Results from prepared sources are marked **„Vorbereitet“**, live results **„Live“**, invented company data **„Fiktiv“**.
