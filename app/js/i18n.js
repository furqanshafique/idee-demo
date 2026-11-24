// DE | EN switch for the interface (German is the default and the demo language).
// Works on the rendered DOM: exact interface strings and a few patterns are swapped
// after each render. Never touched: document quotes, the PDF text layer, form values,
// source titles/abstracts and the exported report – they stay in their original wording.
const KEY = 'devoreo.idee.lang';

let lang = 'de';
try { if (localStorage.getItem(KEY) === 'en') lang = 'en'; } catch { /* storage blocked */ }

export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'de';
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
}

// Exact interface strings (whole, trimmed text node or attribute).
const EXACT = {
  'Demo · Beispieldaten sind erfunden – keine echten Ergo-Tec-Daten': 'Demo · Sample data is invented – no real Ergo-Tec data',
  'Projekt': 'Project', 'Profilstand': 'Profile version', 'Patente': 'Patents', 'Ausschreibungen': 'Tenders', 'Fachartikel': 'Research articles',
  'vorbereitet': 'prepared', 'nicht konfiguriert': 'not configured', 'Server fehlt': 'no server',
  'Alle Demo-Daten löschen?': 'Delete all demo data?', 'Ja, zurücksetzen': 'Yes, reset', 'Abbrechen': 'Cancel', 'Demo zurücksetzen': 'Reset demo',
  'Demo auf Ausgangszustand zurückgesetzt.': 'Demo reset to its starting state.',
  'Fortschritt': 'Progress', 'Vorschau': 'Preview',
  'Auftrag': 'Brief', 'Unternehmensprofil': 'Company profile', 'Anwendungsfelder': 'Application fields', 'Rechercheplan': 'Research plan',
  'Recherche': 'Research', 'Chancen': 'Opportunities', 'Review': 'Review', 'Übergabe': 'Handover',
  'erledigt': 'done', 'offen': 'open', 'in Arbeit': 'in progress', 'Schließen': 'Close', 'Datenquellen': 'Data sources', 'Quelldokument': 'Source document',
  // provenance badges
  'Fiktiv': 'Fictional', 'Vorbereitet': 'Prepared', 'Live': 'Live', 'Manuell': 'Manual', 'Kundenaussage': 'Customer statement', 'Website': 'Website',
  'Erfundene Beispieldaten – keine Aussage über Ergo-Tec': 'Invented sample data – says nothing about Ergo-Tec',
  'Echte API-Antworten dieses Laufs': 'Real API responses from this run', 'Echte API-Antwort dieses Laufs': 'Real API response from this run',
  'Teil dieses Laufs kam aus vorbereiteten Quellen, nicht live': 'Part of this run came from prepared sources, not live',
  'Echte öffentliche Quelle, vorab herausgesucht – nicht live abgerufen': 'Real public source, selected in advance – not fetched live',
  'Angabe von der Firmenwebsite, vorab geprüft': 'Taken from the company website, checked in advance',
  // step 1
  '„Welche weiteren Leistungen können wir mit unseren vorhandenen Kompetenzen anbieten?“': '“Which further services can we offer with our existing capabilities?”',
  'Umfang noch nicht bestätigt': 'Scope not confirmed yet', 'Suchauftrag': 'Search brief', 'Ziel': 'Goal', 'Region': 'Region',
  'Pilotbudget (EUR, leer = unbekannt)': 'Pilot budget (EUR, empty = unknown)', 'Bestehende Märkte (eine pro Zeile)': 'Existing markets (one per line)',
  'Ausschlüsse': 'Exclusions', 'unbekannt': 'unknown', 'z. B. keine Medizinprodukte-Zulassung als Hersteller': 'e.g. no medical device approval as manufacturer',
  'Budget, Personal und freie Kapazität bleiben offen, bis Ergo-Tec sie nennt.': 'Budget, staff and free capacity stay open until Ergo-Tec states them.',
  'Umfang bestätigen und Projekt anlegen': 'Confirm scope and create project', 'Umfang bearbeiten': 'Edit scope',
  'Öffentliche Unternehmensinformation': 'Public company information', 'Echte Angaben von der Ergo-Tec-Website.': 'Real information from the Ergo-Tec website.',
  'Original öffnen ↗': 'Open original ↗',
  'Ergo-Tec baut bereits Prüfvorrichtungen. Prüftechnik ist also kein neuer Markt – offen ist, welche Anwendungen neu wären.': 'Ergo-Tec already builds test fixtures. Test technology is not a new market – the open question is which applications would be new.',
  'Projekt angelegt. Weiter mit dem Unternehmensprofil.': 'Project created. Continue with the company profile.',
  // step 2
  'Was das Team im Beispielauftrag UL-01 nachweislich gemacht hat – jeweils mit Textstelle.': 'What the team demonstrably did in sample job UL-01 – each with a quoted passage.',
  'Dokumente': 'Documents', 'Musterdokument übernehmen': 'Import sample document', 'Erneut importieren': 'Import again',
  'Eigene PDF hochladen': 'Upload your own PDF', 'Nur fiktive/Demo-Unterlagen. Verarbeitung lokal im Browser.': 'Fictional/demo files only. Processed locally in the browser.',
  'Datei wählen': 'Choose file', 'Noch kein Dokument importiert. Das Profil ist leer und unbestätigt.': 'No document imported yet. The profile is empty and unconfirmed.',
  'Fähigkeiten': 'Capabilities', 'Je Karte: Bestätigen, Korrigieren oder Offenlassen': 'Per card: confirm, correct or leave open',
  'Keine Vorschläge. Musterdokument übernehmen oder Fähigkeit manuell mit Belegstelle anlegen.': 'No suggestions. Import the sample document or add a capability by hand with its source passage.',
  'Nicht belegt': 'Not evidenced', 'Rückfragen an Ergo-Tec': 'Questions for Ergo-Tec',
  'Entwickelt Ihr Team Antriebe selbst oder integriert es zugekaufte Komponenten?': 'Does your team develop drives itself or integrate purchased components?',
  'Eigenentwicklung': 'In-house development', 'Integration zugekaufter Komponenten': 'Integration of purchased components', 'Ungeklärt': 'Unclear',
  'Welche Prüfaufnahmen und Kundengruppen bedienen Sie bereits?': 'Which test fixtures and customer groups do you already serve?',
  'Bereits erschlossen': 'Already served', 'Nicht erschlossen laut Kundenaussage': 'Not served, according to customer',
  'Welche Lasten, Genauigkeiten, Stückzahlen und freien Stunden sind belegt?': 'Which loads, accuracies, quantities and free hours are evidenced?',
  'Last (kg)': 'Load (kg)', 'Pos.-Abw. (mm)': 'Pos. error (mm)', 'Stück/Jahr': 'Units/year', 'freie Std.': 'free hrs',
  'Beleg (Dokument + Seite) – ohne Beleg kein Wert': 'Evidence (document + page) – no evidence, no value', 'Q-03 übernehmen': 'Apply Q-03',
  'Fähigkeit von Hand ergänzen': 'Add capability by hand', 'Zuerst ein Dokument importieren.': 'Import a document first.',
  'Änderungsverlauf': 'Change history', 'Noch keine Änderungen.': 'No changes yet.', 'z. B. IDEE-02 S. 1': 'e.g. IDEE-02 p. 1',
  'Datei': 'File', 'Seiten': 'Pages', 'Seite öffnen': 'Open page', 'vorgeschlagen': 'suggested', 'bestätigt': 'confirmed', 'korrigiert': 'corrected',
  'Textstelle geprüft': 'Quote verified', 'Textstelle nicht gefunden': 'Quote not found', 'Quelle': 'Source', 'dokumentiert': 'documented',
  'Wer macht es': 'Who does it', 'Eigenleistung (laut Akte)': 'In-house (according to file)', 'Übertragbar': 'Transferable',
  'Bestätigen': 'Confirm', 'Korrigieren': 'Correct', 'Offenlassen': 'Leave open', 'Voraussetzung/Grenze:': 'Condition/limit:',
  'Dokument': 'Document', 'Seite': 'Page', 'Titel': 'Title', 'Textstelle (wörtlich aus dem Dokument)': 'Quote (verbatim from the document)',
  'Anlegen': 'Create', 'Originaldokument · fiktiv': 'Original document · fictional', 'Originaldokument': 'Original document',
  'In neuem Tab öffnen': 'Open in new tab', 'z. B. Baugruppenzeichnung erstellen': 'e.g. create assembly drawing', 'Prüfliste': 'Review list',
  // step 3
  'Vom Beispielauftrag zur Frage: Wem könnte Ergo-Tec dieses Können noch verkaufen?': 'From the sample job to the question: who else could Ergo-Tec sell this skill to?',
  'Vom Auftrag zur Idee': 'From job to idea', 'Beispielauftrag': 'Sample job', 'Was gemacht wurde': 'What was done', 'Was das Team kann': 'What the team can do',
  'Wem man es verkaufen könnte': 'Who it could be sold to', 'Ideen für neue Märkte': 'Ideas for new markets', 'Fähigkeiten:': 'Capabilities:', 'Suchbegriffe:': 'Search terms:',
  'nicht': 'not', 'Bau einer kompletten Universalprüfmaschine.': 'building a complete universal testing machine.', 'Auswählen': 'Select', '✓ Ausgewählt': '✓ Selected',
  'Ausdrücklich unvalidierte Richtung.': 'Explicitly unvalidated direction.', 'Eigene Idee ergänzen': 'Add your own idea',
  'Fähigkeiten (bestätigt)': 'Capabilities (confirmed)', 'Suchbegriffe DE': 'Search terms DE', 'Suchbegriffe EN': 'Search terms EN',
  // step 4
  'Nur allgemeine Fachbegriffe gehen nach außen – keine Namen, Produkte oder Dokumente.': 'Only general technical terms leave the app – no names, products or documents.',
  'Plan nicht bestätigt': 'Plan not confirmed', 'Suchfeld': 'Search field', 'Suchfeld wählen, um den Plan zu erzeugen.': 'Choose a search field to create the plan.',
  'Quelltyp': 'Source type', 'Suchbegriffe (Komma trennt)': 'Search terms (comma separated)', 'Prüfung': 'Novelty check', 'aktiv': 'active',
  'Beschaffung': 'Procurement', 'Forschungssignale': 'Research signals', 'Quellen und Grenzen': 'Sources and limits', 'Zielgebiet': 'Target region',
  'Max. Treffer je Anbieter (20–50)': 'Max. hits per provider (20–50)', 'Timeout (s)': 'Timeout (s)', 'Budget': 'Budget', 'Anbieter': 'Provider',
  'Erwartete Quelle': 'Expected source', 'Abdeckung / Grenzen': 'Coverage / limits', 'Status': 'Status', 'bereit': 'ready',
  'Veröffentlichte Patentanmeldungen (Titel/Abstract-Suche)': 'Published patent applications (title/abstract search)',
  'DOCDB weltweit; kein Rechtsstand, keine FTO; max. 25 je Abfrage; Fair-Use-Kontingent': 'DOCDB worldwide; no legal status, no FTO; max. 25 per query; fair-use quota',
  'EU-Bekanntmachungen (Volltext)': 'EU notices (full text)', 'Nur öffentliche EU-Vergaben oberhalb der Schwellenwerte; Zuschläge ≠ neue Leads': 'Only public EU tenders above the thresholds; awards ≠ new leads',
  'Publikations-Metadaten': 'Publication metadata', 'Nur Metadaten; Stichprobe ≠ Markttrend': 'Metadata only; sample ≠ market trend',
  'Plan bestätigen': 'Confirm plan', 'Plan bearbeiten': 'Edit plan', 'Plan bestätigt. Externe Abfragen sind jetzt freigegeben.': 'Plan confirmed. External queries are now allowed.',
  // step 5
  'Sucht Patente, Ausschreibungen, Fachartikel und Produkte zur gewählten Idee.': 'Searches patents, tenders, research articles and products for the chosen idea.',
  'Start': 'Start', 'Recherche starten (live)': 'Start research (live)', 'Recherche starten': 'Start research', 'Vorbereitete Recherche (offline)': 'Prepared research (offline)',
  'Beispiel: Ist die Idee „Kaltplasma zur Bodenreinigung“ neu?': 'Example: is the idea “cold plasma for floor cleaning” new?',
  'Zeigt in einer Minute, wie das System eine Behauptung „Das gibt es noch nicht“ mit einem echten Patent prüft.': 'Shows in one minute how the system checks a “this does not exist yet” claim against a real patent.',
  'Beispiel prüfen': 'Check example', 'Quelle von Hand ergänzen': 'Add source by hand', 'URL (https)': 'URL (https)', 'Art': 'Type',
  'Produkt/Gegenbeleg': 'Product/counter-evidence', 'Käufersignal': 'Buyer signal', 'Forschung': 'Research', 'Notiz': 'Note', 'Hinzufügen': 'Add',
  'Suchläufe': 'Search runs', 'Dieser Lauf:': 'This run:', 'Suchbegriffe': 'Search terms', 'Zeit': 'Time', 'Dauer': 'Duration',
  'Produkte am Markt': 'Products on the market', 'Abstract': 'Abstract', '(nur Kurzfassung)': '(abstract only)', 'Rechtsstand': 'Legal status',
  'unbekannt – nicht geprüft': 'unknown – not checked', 'Einer Idee zuordnen …': 'Assign to an idea …', 'Filter …': 'Filter …',
  'Welches Problem beschreibt das Patent?': 'Which problem does the patent describe?', 'Problem': 'Problem', 'Lösung im Patent': 'Solution in the patent',
  'Patent öffnen ↗': 'Open patent ↗', 'Veröffentlicht': 'Published', 'Was das bedeutet': 'What this means',
  'Beim Wechsel zwischen verschiedenen Proben und Prüfarten müssen Prüfaufnahmen umgebaut werden – das kostet Zeit (sinngemäß aus Abschnitt [0003]).': 'Switching between different samples and test types means rebuilding test fixtures – that takes time (paraphrased from section [0003]).',
  'Modulare, umkonfigurierbare Prüfaufnahme (beschriebene Lösung)': 'Modular, reconfigurable test fixture (described solution)',
  'Die Grundidee „modulare Prüfaufnahme“ ist schon bekannt. Ob heute jemand dafür zahlt und ob das Patent noch gilt, ist offen.': 'The basic idea “modular test fixture” is already known. Whether anyone pays for it today and whether the patent is still in force is open.',
  'Ergebnis: Die Idee ist bereits beschrieben.': 'Result: the idea has already been described.',
  'Idee neu?': 'Idea new?', 'Gibt es einen Markt?': 'Is there a market?', 'Haben Kunden das Problem heute?': 'Do customers have the problem today?', 'Gilt das Patent noch?': 'Is the patent still in force?',
  'Nein – bereits beschrieben': 'No – already described', 'nicht geliefert': 'not supplied', 'Datum unbekannt': 'Date unknown',
  'Fachartikel nach Erscheinungsjahr': 'Research articles by year', 'Nur die 25 geladenen Treffer – zeigt keinen Markttrend.': 'Only the 25 loaded hits – shows no market trend.',
  'erfolgreich': 'succeeded', 'erfolgreich, 0 Treffer': 'succeeded, 0 hits', 'teilweise': 'partial', 'fehlgeschlagen': 'failed', 'läuft …': 'running …',
  'Zuerst in Schritt 5 die Recherche starten.': 'Start the research in step 5 first.',
  // step 6
  'Aus Recherche und Fähigkeiten werden Geschäftsideen – mit Gegenargumenten und offenen Fragen. Vorläufig, keine Investitionsentscheidung.': 'Research and capabilities become business ideas – with counter-arguments and open questions. Preliminary, not an investment decision.',
  'Erste, breite Idee. Prüfen, ob es so etwas schon gibt.': 'First, broad idea. Check whether something like this already exists.',
  'Gegen Patente und Produkte prüfen': 'Check against patents and products', 'Quellen': 'Sources', 'Stand der Prüfung': 'Review status',
  'Kann Ergo-Tec das?': 'Can Ergo-Tec do it?', 'Fähigkeiten bestätigt, Übertragung ungeprüft': 'Capabilities confirmed, transfer unchecked',
  'Im Beispielprofil bestätigt, nicht bei Ergo-Tec.': 'Confirmed in the sample profile, not at Ergo-Tec.', 'Braucht das jemand?': 'Does anyone need it?',
  'nicht belegt': 'not evidenced', 'Noch kein echter Käufer und keine offene Ausschreibung.': 'No real buyer and no open tender yet.',
  'Gibt es das schon?': 'Does it exist already?', 'Gegenbeleg vorhanden': 'Counter-evidence found', 'Budget und Zeit': 'Budget and time',
  'Budget und freie Kapazität sind noch unbekannt.': 'Budget and free capacity are still unknown.', 'Patente / Recht': 'Patents / legal', 'nicht geprüft': 'not checked',
  'Ob Patente einen Verkauf verhindern, ist nicht geprüft.': 'Whether patents block a sale has not been checked.', 'Noch nicht priorisierbar:': 'Not ready to prioritise:',
  'kein aktueller Käufer- oder Ausschreibungsbeleg; Budget unbekannt.': 'no current buyer or tender evidence; budget unknown.',
  'Wer würde kaufen?': 'Who would buy?', 'Was genau verkaufen wir?': 'What exactly do we sell?', 'Was nutzt der Käufer heute?': 'What does the buyer use today?',
  'Offene Fragen': 'Open questions', 'Speichern': 'Save', 'nur historisches Signal': 'historical signal only',
  'Nur ein alter Kauf – zeigt keinen heutigen Bedarf.': 'Only an old purchase – shows no current demand.', 'Zielkäufer': 'Target buyer', 'Lieferumfang': 'Scope of supply',
  'Rechenbeispiel: Reicht das Können für eine konkrete Anfrage?': 'Worked example: is the skill enough for a concrete request?',
  'Ein fiktiver Kunde fragt eine Aufnahme für 50 kg mit 0,1 mm Genauigkeit an. Nachgewiesen sind bisher 25 kg mit 0,5 mm.': 'A fictional customer asks for a fixture for 50 kg with 0.1 mm accuracy. So far 25 kg with 0.5 mm is evidenced.',
  'Beispiel laden': 'Load example', 'Noch nicht nachgewiesen – Versuch nötig': 'Not evidenced yet – trial needed', 'Nachgewiesen': 'Evidenced', 'Angefragt': 'Requested',
  'Last': 'Load', 'Positionierabweichung': 'Positioning error', 'Bedingungen': 'Conditions', 'Metallbearbeitung': 'Metal machining',
  'Kapazität / Budget': 'Capacity / budget', 'offen (unbekannt)': 'open (unknown)',
  'Was wäre, wenn ein fertiges Produkt die Anfrage schon erfüllt?': 'What if a finished product already meets the request?',
  'Dann wird H-02 zurückgestellt. Der vorherige Stand bleibt im Verlauf.': 'Then H-02 is put on hold. The previous state stays in the history.',
  'ungeprüft': 'unreviewed', 'Idee in Prüfung': 'Idea under review', 'zurückgestellt': 'on hold', 'zurückgestellt – gibt es schon': 'on hold – already exists', 'verworfen': 'rejected',
  // step 7
  'Zusammenschau zur internen Durchsicht. Keine Scores, keine Freigabe.': 'Overview for internal review. No scores, no approval.',
  'Fehlende Daten / offene Punkte': 'Missing data / open points', 'Pilotbudget unbekannt': 'Pilot budget unknown', 'Freie Kapazität (Stunden) unbekannt': 'Free capacity (hours) unknown',
  'Rechtsstand / FTO aller Patente nicht geprüft': 'Legal status / FTO of all patents not checked',
  'Kein aktuelles authentisches Käufer-/Beschaffungssignal bestätigt': 'No current authentic buyer/procurement signal confirmed',
  'Recherchelauf-Übersicht': 'Research run overview', 'Lauf': 'Run', 'Modus': 'Mode', 'Profil/Plan': 'Profile/plan', 'Anbieter-Status': 'Provider status', 'Treffer': 'Hits',
  'Hypothesen': 'Hypotheses',
  'Eine spätere Bewertungsmatrix (Vorschau) würde nur aus belegten Werten rechnen; unbekannt ≠ 0. Hier bewusst nicht berechnet.': 'A later scoring matrix (preview) would only use evidenced values; unknown ≠ 0. Deliberately not calculated here.',
  // step 8
  'Recherche-Zusammenfassung zum Weitergeben. Es wird nichts versendet.': 'Research summary to pass on. Nothing is sent.',
  'Vorläufige Hypothese – keine Investitionsentscheidung': 'Preliminary hypothesis – not an investment decision',
  'Der Bericht enthält Profil- und Laufversionen, Originalquellen mit Links und Herkunft (Live / Vorbereitet / Manuell), offene Punkte, zurückgestellte Alternativen und den Hinweis auf fiktive Betriebsdaten.': 'The report contains profile and run versions, original sources with links and provenance (Live / Prepared / Manual), open points, alternatives on hold and the note on fictional company data.',
  'Bericht anzeigen': 'Show report', 'Bericht ausblenden': 'Hide report', 'HTML-Bericht herunterladen': 'Download HTML report', 'JSON exportieren': 'Export JSON',
  'Der Bericht bleibt auf Deutsch (Kundensprache).': 'The report stays in German (customer language).',
};

// Patterns for strings with numbers, dates or IDs. The data part ($1 …) is kept as is.
const PATTERNS = [
  [/^Schritt (\d+)$/, 'Step $1'],
  [/^Weiter: (.+) →$/, (m, x) => `Next: ${EXACT[x] || x} →`],
  [/^Profilstand v(\d+)$/, 'Profile version $1'], [/^Profil v(\d+)$/, 'Profile v$1'],
  [/^Plan v(\d+) bestätigt (.+)$/, 'Plan v$1 confirmed $2'], [/^Umfang bestätigt (.+)$/, 'Scope confirmed $1'],
  [/^(\d+) von max\. 2 ausgewählt$/, '$1 of max. 2 selected'],
  [/^Seite (\d+)( \/ \d+)?$/, 'Page $1$2'], [/^(.+) · Seite (\d+)$/, '$1 · page $2'],
  [/^(\S+) (bestätigt|vorgeschlagen|korrigiert)$/, (m, id, st) => `${id} ${EXACT[st]}`],
  [/^(.+) – dokumentiert, (bestätigt|vorgeschlagen|korrigiert)$/, (m, t, st) => `${t} – documented, ${EXACT[st]}`],
  [/^(\S+) gelesen \((\d+) Seiten?\)\. (\d+) Fähigkeiten gefunden, Textstellen geprüft\.$/, '$1 read ($2 pages). $3 capabilities found, quotes verified.'],
  [/^(\S+) importiert \((\d+) Vorschläge?\)$/, '$1 imported ($2 suggestions)'],
  [/^(\S+) ist bereits importiert – nichts doppelt angelegt\.$/, '$1 is already imported – nothing created twice.'],
  [/^(Q-\d+) (.+) ungeklärt$/, '$1 $2 unclear'],
  [/^(\S+) (.+) offen$/, (m, id, f) => /^Q-\d+$/.test(id) ? `${id} ${f} open` : m],
  [/^\(geprüfte Fassung (\S+), gleiche Patentfamilie wie der Live-Treffer (\S+)\)$/, '(verified version $1, same patent family as the live hit $2)'],
  [/^Details zu diesem Suchlauf \((.+)\)$/, (m, x) => `Details of this search run (${mixLabel(x)})`],
];

// Phrase fragments inside composite lines (result meta lines, run lines).
const FRAGMENTS = [
  ['Live + Vorbereitet (Patente)', 'Live + Prepared (patents)'], ['Live + Vorbereitet', 'Live + Prepared'],
  ['Anmelder: ', 'Applicant: '], ['Patentfamilie ', 'Patent family '], ['(eine Veröffentlichung je Familie)', '(one publication per family)'],
  ['Typ: ', 'Type: '], ['Land: ', 'Country: '], ['Art: ', 'Type: '],
  ['Vergabebekanntmachung (Zuschlag)', 'Contract award notice'], ['Auftragsbekanntmachung', 'Contract notice'], ['Vorinformation', 'Prior information notice'],
  ['(bereits vergeben – kein offener Auftrag)', '(already awarded – not an open tender)'],
  [' weitere Meldung(en) zum selben Vorgang (zählt einmal): ', ' more notice(s) for the same procedure (counts once): '],
  ['Patente (vorbereitet)', 'Patents (prepared)'],
  ['Ähnliches gibt es schon: ', 'Similar things already exist: '], ['Käuferrolle (Annahme): ', 'Buyer role (assumption): '],
  ['Möglicher Lieferumfang: ', 'Possible scope of supply: '],
  ['Ob das für Ergo-Tec wirklich neu ist, klärt Rückfrage Q-02 (aktuell:', 'Whether this is really new for Ergo-Tec is settled by question Q-02 (currently:'],
];
const mixLabel = x => FRAGMENTS.reduce((s, [de, en]) => s.split(de).join(en), EXACT[x] || x);

function tr(s) {
  const t = s.trim();
  if (!t) return s;
  let out = EXACT[t];
  if (out == null) {
    for (const [re, rep] of PATTERNS) {
      if (re.test(t)) { out = t.replace(re, rep); break; }
    }
  }
  if (out == null) {
    out = t;
    for (const [de, en] of FRAGMENTS) if (out.includes(de)) out = out.split(de).join(en);
    if (out === t) return s;
  }
  return s.replace(t, out);
}

// Containers whose text is source material and must keep its exact wording.
const SKIP = '.textLayer, .viewer-canvas, .vquotes, .quote, blockquote, textarea, script, style, code';

export function translate(root) {
  if (lang !== 'en' || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) nodes.push(n);
  for (const n of nodes) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  root.querySelectorAll('[placeholder], [title], [aria-label]').forEach(el => {
    if (el.closest(SKIP)) return;
    for (const a of ['placeholder', 'title', 'aria-label']) {
      const v = el.getAttribute(a);
      if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); }
    }
  });
}

export function langSwitch() {
  const b = (l, label) => `<button class="${lang === l ? 'on' : ''}" data-act="lang" data-lang="${l}" aria-pressed="${lang === l}" lang="${l}">${label}</button>`;
  return `<div class="langsw" role="group" aria-label="Sprache / Language">${b('de', 'DE')}${b('en', 'EN')}</div>`;
}
