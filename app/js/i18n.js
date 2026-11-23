// UI language (German default, English optional). The viewer's choice is kept
// in this browser only, under its own localStorage key, so "Demo zurücksetzen"
// (which clears the demo state) does not change it.
//
// Two helpers:
//   L(de, en)  inline text written in the views (both languages side by side)
//   tr(de)     German text that comes from data, rules.js or store.js; looked up
//              in EN / PATTERNS below. Unknown text (user input, external search
//              results, verbatim PDF quotes) is returned unchanged.

export const LANG_KEY = 'devoreo.lang';
export const LANGS = ['de', 'en'];
let lang = 'de';
try { const v = localStorage.getItem(LANG_KEY); if (LANGS.includes(v)) lang = v; } catch { /* storage blocked: stay German */ }

export const getLang = () => lang;
export function setLang(v) {
  if (!LANGS.includes(v)) return;
  lang = v;
  try { localStorage.setItem(LANG_KEY, v); } catch { /* storage blocked: choice lasts for this page only */ }
  applyDocLang();
}
export function applyDocLang() { if (typeof document !== 'undefined') document.documentElement.lang = lang; }
export const L = (de, en) => (lang === 'en' ? en : de);
export const locale = () => (lang === 'en' ? 'en-GB' : 'de-DE');

export function tr(s) {
  if (lang !== 'en' || s == null) return s;
  return toEn(String(s));
}

// Exported for tests; always translates regardless of the current language.
export function toEn(str) {
  if (Object.prototype.hasOwnProperty.call(EN, str)) return EN[str];
  for (const [re, fn] of PATTERNS) {
    const m = str.match(re);
    if (m) return fn(...m.slice(1));
  }
  if (str.includes('; ')) return str.split('; ').map(toEn).join('; ');
  return str;
}

const EN = {
  // ---------------------------------------------------------- rules.js labels
  'dokumentiert': 'documented', 'Kundenaussage': 'Customer statement', 'Indiz': 'indication', 'Hypothese': 'hypothesis', 'offen': 'open',
  'Eigenleistung (laut Akte)': 'In-house (per file)', 'Partner (unbestätigt)': 'Partner (unconfirmed)', 'unbekannt': 'unknown',
  'plausibel': 'plausible', 'belegt': 'proven', 'Lücke': 'gap',
  'vorgeschlagen': 'proposed', 'bestätigt': 'confirmed', 'korrigiert': 'corrected', 'offen gelassen': 'left open',
  'ungeprüft': 'unchecked', 'Idee in Prüfung': 'Idea under review', 'zurückgestellt': 'deferred', 'verworfen': 'rejected',
  'zurückgestellt – gibt es schon': 'deferred – already exists',
  'Zitat zu kurz': 'Quote too short', 'Zitat im extrahierten Text nicht gefunden': 'Quote not found in the extracted text',
  'capabilities fehlt': 'capabilities missing',
  'Suchbegriff fehlt.': 'Search term missing.',
  'nicht im Profil': 'not in profile', 'abgewählt': 'deselected', 'nicht bestätigt': 'not confirmed',
  'Eigene Antriebsentwicklung (laut Kundenaussage)': 'Own drive development (per customer statement)',
  'Interviewantwort Q-01': 'Interview answer Q-01', 'Nachweis ausstehend': 'Evidence pending',
  'Nicht alle Fähigkeiten sind bestätigt.': 'Not all capabilities are confirmed.',
  'Noch nicht nachgewiesen – Versuch nötig': 'Not yet proven – trial needed',
  'Fähigkeiten bestätigt, Übertragung ungeprüft': 'Capabilities confirmed, transfer unchecked',
  'Im Beispielprofil bestätigt, nicht bei Ergo-Tec.': 'Confirmed in the sample profile, not at Ergo-Tec.',
  'nicht belegt': 'not evidenced', 'Noch kein echter Käufer und keine offene Ausschreibung.': 'No real buyer and no open tender yet.',
  'nur historisches Signal': 'historical signal only', 'Nur ein alter Kauf – zeigt keinen heutigen Bedarf.': 'Only an old purchase – shows no current demand.',
  'Signal vorhanden – beim Käufer bestätigen': 'Signal found – confirm with the buyer',
  'Gegenbeleg vorhanden': 'Counterevidence found', 'Noch nicht geprüft.': 'Not checked yet.',
  'Angaben vorhanden': 'Figures provided', 'Nur Kundenangaben, nicht geprüft.': 'Customer figures only, not checked.',
  'Budget und freie Kapazität sind noch unbekannt.': 'Budget and free capacity are still unknown.',
  'nicht geprüft': 'not checked', 'Ob Patente einen Verkauf verhindern, ist nicht geprüft.': 'Whether patents would block a sale has not been checked.',
  'kein aktueller Käufer- oder Ausschreibungsbeleg': 'no recent buyer or tender evidence',
  'Fähigkeiten nicht bestätigt': 'capabilities not confirmed', 'Budget unbekannt': 'budget unknown',
  'Metallbearbeitung durch Partner unbestätigt': 'Metalworking by partner unconfirmed',
  'Wahrscheinlich machbar – Nachweis trotzdem nötig': 'Probably feasible – proof still needed',
  'Test: Ein fertiges Produkt erfüllt die Anfrage schon zu einem akzeptablen Preis.': 'Test: a finished product already meets the request at an acceptable price.',

  // ---------------------------------------------------------- seed.json
  'Fiktiver Referenzauftrag UL-01': 'Fictional reference order UL-01',
  'Neue kaufbare Teilleistungen außerhalb der Patientenlagerung entdecken': 'Discover new sellable partial services outside patient positioning',
  'DE/EU; internationale Signale nur als Kontext': 'DE/EU; international signals as context only',
  'Patientenpositionierung': 'Patient positioning', 'Sondermaschinenbau': 'Special-purpose machinery',
  'Prüfsysteme (öffentlich genannt; genaue Anwendungen offen)': 'Test systems (publicly listed; exact applications open)',
  'Mechanische Konstruktion': 'Mechanical design',
  'Integration zugekaufter Hubantriebe': 'Integration of purchased lifting drives',
  'Mechanische Baugruppen ausrichten und montieren': 'Aligning and assembling mechanical assemblies',
  'Halteverhalten prüfen und dokumentieren': 'Testing and documenting holding behaviour',
  'Mechanische Prüfaufnahme bauen': 'Building a mechanical test fixture',
  'Metallbearbeitung durch Partner': 'Metalworking by a partner',
  'statisch, Raumtemperatur': 'static, room temperature', 'Partnerbearbeitung ungeklärt': 'Partner machining unclear',
  'Entwickelt Ihr Team Antriebe selbst oder integriert es zugekaufte Komponenten?': 'Does your team develop drives itself or integrate purchased components?',
  'Eigenentwicklung': 'In-house development', 'Integration zugekaufter Komponenten': 'Integration of purchased components', 'Ungeklärt': 'Unclear',
  'Welche Prüfaufnahmen und Kundengruppen bedienen Sie bereits?': 'Which test fixtures and customer groups do you already serve?',
  'Bereits erschlossen': 'Already served', 'Nicht erschlossen laut Kundenaussage': 'Not served, per customer statement',
  'Welche Lasten, Genauigkeiten, Stückzahlen und freien Stunden sind belegt?': 'Which loads, accuracies, quantities and free hours are evidenced?',
  'Variantenwechsel bei mechanischen Prüfaufnahmen': 'Variant changeover for mechanical test fixtures',
  'Positionierung in der Laborautomation': 'Positioning in laboratory automation',
  'Prüfmittelverantwortliche / Prüfstellenleitung': 'Test equipment managers / test lab heads',
  'Universelle modulare Prüfaufnahme': 'Universal modular test fixture',
  'Kundenspezifische mechanische Wechselaufnahme für eine belegte Sondergeometrie': 'Custom mechanical changeover fixture for an evidenced special geometry',
  'Welche konkrete Geometrie wird durch vorhandene Lösungen nicht abgedeckt?': 'Which specific geometry is not covered by existing solutions?',

  // ---------------------------------------------------------- public_sources.json
  'Ergo-Tec – Entwicklung & Fertigung': 'Ergo-Tec – Development & manufacturing',
  'Ergo-Tec – Sondermaschinenbau': 'Ergo-Tec – Special-purpose machinery',
  'Das Unternehmen beschreibt Entwicklung und Fertigung elektrisch verstellbarer Patientenpositionierungssysteme.': 'The company describes the development and manufacture of electrically adjustable patient positioning systems.',
  'Ergo-Tec nennt eine Stator-Prüfvorrichtung und bietet u. a. Montage, Verdrahtung und Endprüfung an.': 'Ergo-Tec lists a stator test rig and offers assembly, wiring and final testing, among other things.',
  'Der Anmelder beschreibt den Zeitaufwand beim Wechsel bzw. Umbau von Prüfaufnahmen für unterschiedliche Proben und Testarten.': 'The applicant describes the time spent changing or rebuilding test fixtures for different specimens and test types.',
  'Modulare, umkonfigurierbare Prüfaufnahme (beschriebene Lösung)': 'Modular, reconfigurable test fixture (described solution)',
  'Öffentliche Beschaffung einer mechanischen Prüfanlage einschließlich hydraulischer Spannmittel.': 'Public procurement of a mechanical testing system including hydraulic clamping devices.',
  'Instron bietet modulare Prüfrahmen und Aufnahmen für verschiedene Proben, Lasten und Geometrien an.': 'Instron offers modular test frames and fixtures for various specimens, loads and geometries.',
  'Eine veröffentlichte Anmeldung beschreibt ein Bodenreinigungsgerät mit integriertem Plasmaapplikator.': 'A published application describes a floor cleaning device with an integrated plasma applicator.',
  'Bodenreinigung mit integriertem Plasmaapplikator': 'Floor cleaning with an integrated plasma applicator',

  // ---------------------------------------------------------- store.js
  'Projekt angelegt. Weiter mit dem Unternehmensprofil.': 'Project created. Continue with the company profile.',
  'Kundenaussagen bleiben Kundenaussagen, bis ein Nachweis vorliegt.': 'Customer statements stay customer statements until there is evidence.',
  'Titel, Dokument und Belegstelle sind Pflicht.': 'Title, document and evidence passage are required.',
  'Werte ohne Beleg werden nicht übernommen. Bitte Nachweis (Dokument/Seite) angeben oder Felder leer lassen.': 'Values without evidence are not accepted. Please give evidence (document/page) or leave the fields empty.',
  'Feld ist mit der aktuellen Auswahl nicht ableitbar.': 'This field cannot be derived from the current selection.',
  'Maximal zwei Suchfelder pro Demo-Sprint. Erst eines abwählen.': 'At most two search fields per demo sprint. Deselect one first.',
  'Titel und mindestens eine Fähigkeit sind Pflicht.': 'Title and at least one capability are required.',
  'Plan bestätigt. Externe Abfragen sind jetzt freigegeben.': 'Plan confirmed. External queries are now enabled.',
  'Ungültige URL.': 'Invalid URL.', 'Nur https-Links.': 'https links only.',
  'Zuerst in Schritt 5 die Recherche starten.': 'Start the research in step 5 first.',
  'H-01 zurückgestellt: gibt es schon. Weiter mit H-02.': 'H-01 deferred: already exists. Continue with H-02.',
  'Titel ist Pflicht.': 'Title is required.',
  'Demo auf Ausgangszustand zurückgesetzt.': 'Demo reset to its starting state.',
  'manuell angelegt': 'created manually', 'Q-03: keine belegten Werte – offen': 'Q-03: no evidenced values – open',
  'Felder bearbeitet': 'Fields edited', 'bearbeitet': 'edited', 'Gegenbeleg geprüft': 'Counterevidence checked',
  'Synthetischer Gegenbeleg-Test: Alternative deckt Anforderungen': 'Synthetic counterevidence test: alternative covers the requirements',
  'Synthetischer Gegenbeleg-Test zurückgenommen': 'Synthetic counterevidence test withdrawn',
  'Die Idee steht schon in einem Patent (PAT-01) und wird bereits verkauft (ALT-01). Deshalb zurückgestellt. Weiter mit der engeren Idee H-02.': 'The idea is already in a patent (PAT-01) and is already being sold (ALT-01), so it is deferred. Continue with the narrower idea H-02.',
  'Prüfmittelverantwortliche / Prüfstellenleitung (Annahme)': 'Test equipment managers / test lab heads (assumption)',
  'Mechanische Wechselaufnahme als Komponente (kein komplettes Prüfsystem)': 'Mechanical changeover fixture as a component (not a complete test system)',
  'Modulare Serienaufnahmen (z. B. ALT-01) – Abdeckung der Sondergeometrie offen': 'Modular series fixtures (e.g. ALT-01) – coverage of the special geometry open',
  'Welche Last/Genauigkeit wird belegt gefordert?': 'Which load/accuracy is required, with evidence?',
  'Wer kauft heute und zu welchem Preis?': 'Who buys today, and at what price?',
  'Bedarf beim Käufer bestätigen': 'Confirm demand with the buyer', 'Technische Machbarkeit nachweisen': 'Prove technical feasibility',
  'Q-01: Integration bestätigt – keine eigene Motorenentwicklung ableiten.': 'Q-01: integration confirmed – do not infer in-house motor development.',
  'Q-01: Kundenaussage Eigenentwicklung → separater Eintrag CAP-Q01, Nachweis offen.': 'Q-01: customer says in-house development → separate entry CAP-Q01, evidence open.',
  'Musterextraktion / regelbasiert': 'Sample extraction / rule-based',
  'Textextraktion (pdf.js), keine Fallmetadaten': 'Text extraction (pdf.js), no case metadata',
  'manuell mit Belegstelle': 'manual with evidence passage',
  'Belegstelle im Text gefunden': 'Evidence passage found in the text', 'Zitat verifiziert': 'Quote verified',
  'KI-Vorschlag: Zitat verifiziert, fachlich prüfen': 'AI suggestion: quote verified, review the content',
  'EU (TED), weltweit (EPO DOCDB, Crossref)': 'EU (TED), worldwide (EPO DOCDB, Crossref)',
  'Beispiel Kaltplasma': 'Cold plasma example',

  // ---------------------------------------------------------- research.js / server
  'Gehostete Demo ohne Recherche-Server: Suche im vorbereiteten Datenbestand.': 'Hosted demo without research server: searching the prepared data set.',
  'EPO nicht konfiguriert – Suche im vorbereiteten Patentbestand': 'EPO not configured – searching the prepared patent set',
  'Zeitüberschreitung': 'Timeout',
  'Anbieter nicht freigegeben.': 'Provider not allowed.', 'Ungültige Parameter.': 'Invalid parameters.',
  'Ungültige Anfragegröße.': 'Invalid request size.', 'Unbekannter Endpunkt.': 'Unknown endpoint.',
  'Abfragelimit erreicht.': 'Query limit reached.',
  'Live-Patentsuche nicht konfiguriert (EPO_CONSUMER_KEY/SECRET fehlen).': 'Live patent search not configured (EPO_CONSUMER_KEY/SECRET missing).',
  'Kein Laufzeit-API-Key (ANTHROPIC_API_KEY) konfiguriert.': 'No runtime API key (ANTHROPIC_API_KEY) configured.',
  'Nur freigegebene synthetische Dokumente mit ausdrücklicher Zustimmung.': 'Only approved synthetic documents with explicit consent.',
  'Seitentexte fehlen.': 'Page texts missing.',
};

const PATTERNS = [
  // rules.js
  [/^Zitat steht auf Seite (\d+), nicht auf Seite (\d+)$/, (a, b) => `Quote is on page ${a}, not on page ${b}`],
  [/^Eintrag (\d+): Schema verletzt$/, a => `Entry ${a}: schema violated`],
  [/^Eintrag (\d+): Seite (\d+) existiert nicht$/, (a, b) => `Entry ${a}: page ${b} does not exist`],
  [/^Suchbegriff zu lang \(max\. (\d+) Zeichen\)\.$/, a => `Search term too long (max. ${a} characters).`],
  [/^Interne Kennungen nicht erlaubt: (.+)$/, a => `Internal identifiers not allowed: ${a}`],
  [/^Interne Kennungen dürfen nicht an externe Dienste gehen: (.+)$/, a => `Internal identifiers must not go to external services: ${a}`],
  [/^(\d+) aktuelle\(s\) Signal\(e\), (\d+) unabhängige Herkunft\(en\)\.$/, (a, b) => `${a} recent signal(s), ${b} independent origin(s).`],
  [/^Ähnliches gibt es schon: (.+)$/, a => `Something similar already exists: ${a}`],
  [/^weniger als (\d+) unabhängige Quellen$/, a => `fewer than ${a} independent sources`],
  [/^Last (\S+) kg > Referenz (\S+) kg$/, (a, b) => `Load ${a} kg > reference ${b} kg`],
  [/^Genauigkeit (\S+) mm strenger als Referenz (\S+) mm$/, (a, b) => `Accuracy ${a} mm stricter than reference ${b} mm`],
  // store.js
  [/^(\S+) ist bereits importiert – nichts doppelt angelegt\.$/, a => `${a} is already imported – nothing duplicated.`],
  [/^(\S+) gelesen \((\d+) Seiten\)\. (\d+) Fähigkeiten gefunden, Textstellen geprüft(?:; (\d+) Textstelle\(n\) nicht gefunden)?\.$/,
    (id, p, n, f) => `${id} read (${p} ${p === '1' ? 'page' : 'pages'}). ${n} capabilities found, passages verified${f ? `; ${f} passage(s) not found` : ''}.`],
  [/^(.+) gelesen \((\d+) Seiten\)\. Fähigkeiten bitte von Hand mit Textstelle ergänzen\.( Hinweis: kein lesbarer Text \(evtl\. Scan\)\.)?$/,
    (name, p, scan) => `${name} read (${p} ${p === '1' ? 'page' : 'pages'}). Please add capabilities by hand with an evidence passage.${scan ? ' Note: no readable text (possibly a scan).' : ''}`],
  [/^(\S+) angelegt – Belegstelle verifiziert\.$/, a => `${a} created – evidence passage verified.`],
  [/^Belegstelle nicht verifiziert \((.+)\)\. Eintrag in Prüfliste, nicht im Profil\.$/, a => `Evidence passage not verified (${toEn(a)}). Entry added to the review list, not the profile.`],
  [/^KI-Extraktion: (\d+) Zitate verifiziert, (\d+) nicht verifizierbar\. Alle Vorschläge liegen in der Prüfliste\.$/, (a, b) => `AI extraction: ${a} quotes verified, ${b} not verifiable. All suggestions are in the review list.`],
  [/^(\S+) angelegt \(Status: Forschungshypothese\)\.$/, a => `${a} created (status: research hypothesis).`],
  [/^(\S+) als manuelle Quelle \(Analystennotiz\) erfasst – nicht abgerufen, nicht geprüft\.$/, a => `${a} recorded as a manual source (analyst note) – not fetched, not checked.`],
  [/^(\S+) angelegt\.$/, a => `${a} created.`],
  [/^Plan nicht bestätigt: (.+)$/, a => `Plan not confirmed: ${toEn(a)}`],
  [/^(patent|procurement|research): (.+)$/, (k, e) => `${k}: ${toEn(e)}`],
  [/^(\S+) importiert \((\d+) Vorschläge(?:, (\d+) zur Prüfung)?\)$/, (id, n, f) => `${id} imported (${n} suggestions${f ? `, ${f} for review` : ''})`],
  [/^Q-03: (\d+) belegte Werte$/, a => `Q-03: ${a} evidenced values`],
  [/^(Q-0\d): (.+)$/, (q, v) => `${q}: ${toEn(v)}`],
  [/^(CAP-\S+) (.+)$/, (id, v) => `${id} ${toEn(v)}`],
  [/^Quelle (\S+) verknüpft$/, a => `Source ${a} linked`],
  [/^KI-Extraktion \((.+)\) – Review nötig$/, a => `AI extraction (${a}) – review needed`],
  [/^KI-Vorschlag: (.+)$/, a => `AI suggestion: ${toEn(a)}`],
  [/^Zitat auf Seite (\d+) gefunden$/, a => `Quote found on page ${a}`],
  // research.js / server
  [/^Netzwerkfehler: (.+)$/, a => `Network error: ${a}`],
  [/^Abfragelimit erreicht \((\d+)\/min\)\. Bitte kurz warten\.$/, a => `Query limit reached (${a}/min). Please wait a moment.`],
];
