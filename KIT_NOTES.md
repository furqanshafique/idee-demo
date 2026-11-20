# Devoreo — IDEE demo development kit
**Client meeting: 27 November 2026 | Internal prototype only**

This folder is a build input for Claude Code, not an implemented application. It shares the fictional UL-01 examination-table scenario with the existing Digital Product Dossier kit. The focus is the Friday demo: capability intake plus traceable real research; not the full 38-page product specification.

## Get started
1. Unzip into a new working folder (or copy into a separate folder of the existing IDEE repository). Open it in Claude Code.
2. Ask Claude Code: “Read CLAUDE_BUILD_PROMPT.md, LIVE_RESEARCH.md, seed data and provided PDFs. Inspect any existing IDEE code. Implement the core German-language interactive prototype and test all acceptance scenarios. Keep prepared-source mode explicitly distinct from live research. Report blockers and setup instructions.”
3. Run the generated application following its README. Add EPO API credentials to a local .env when available, never commit them. The `.env.example` has placeholders only. Test real patent and market/trend search before the customer meeting.
4. If credentials are unavailable, the supplied curated references still make the internal walkthrough possible. Clearly disclose any live-search blocker to the team; this is not full satisfaction of Michael's live demo expectation.

## Inputs
- `documents/IDEE-01_Projektakte_UL-01.pdf`: main 3-page German fictional reference file; separates assembly from own motor development.
- `documents/PB-17_R1-A_Endfassung.pdf`: same synthetic test report as in the previous Zulassungsakte kit; optional supporting evidence.
- `documents/IDEE-02_Faehigkeitsnachweis.pdf`: optional synthetic measured reference (numeric matching test, NOT client facts).
- `documents/IDEE-03_Bedarfstest.pdf`: synthetic buyer interview and counterevidence test, NEVER real demand.
- `data/BOM_R1.csv`: same synthetic BOM from prior kit.
- `data/seed.json`: canonical demo IDs, document hashes, expected extracts, questions, fields and hypotheses.
- `data/public_sources.json`: checked real public sources (patent publications, historic procurement notice, company and competitor pages). These are curated references, not API responses. No actual patent legal status or market gap has been established.
- `references/`: original internal Michael Reble briefing V2, original 118-question/628-field catalog and questionnaire; keep for the later product, do not ingest as client evidence or publish on web. Original files remain German; the build brief is English.

## Meeting walkthrough (6–8 min)
1. Show public client context and the fictional UL-01 reference project. Import the actual PDF and open evidence passages. Confirm capabilities and clarify own motor development vs integration.
2. Generate possible application fields from confirmed capabilities. Choose a narrow test-fixture application and edit the generic search terms. Ergo-Tec already produces test systems, so ask whether the specific buyer/use case is new.
3. Execute real patent and market/research queries. Open result source and distinguish patent problem from invention and demand. Demonstrate a curated reference only if clearly labeled offline.
4. If ready, show broad hypothesis contradicted by existing products, then a narrower unvalidated hypothesis (or no opportunity). Explain that full business opportunity validation follows after confirmed company profile and independent demand evidence.

## Scope decisions
The fictional capabilities, proposed search field and optional numerical case are illustrative design additions based on Michael's functional logic. They are not verified facts about Ergo-Tec. The original briefing pp. 19–26 specifies abstraction, two search directions, source checks and counterevidence; pp. 27–36 describes detailed scoring, architecture, effort and acceptance. This prototype intentionally excludes the full catalog UI, full multi-region agent engine, claims/legal status assessment, financial model, multi-tenant security and final decision support. Those remain pilot/production concerns. The first real research connectors are proposed based on current documentation; no credentials or live integration are supplied in this kit. No fake external source, fake IP clearance or simulated client data may be represented as actual.
