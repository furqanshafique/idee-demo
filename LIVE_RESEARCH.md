# Live research — developer integration notes

The client-facing requirement from Michael's email is functioning trend/market and patent research with a result opened to its original source. The attached briefing (pp. 21–25, 32–36) makes source coverage and real vs partial runs explicit. The following is a **recommended small implementation**, not a commitment that the providers have been tested from this development environment.

## Patent — EPO Open Patent Services
- Official portal: https://developers.epo.org/
- Official overview, OpenAPI specification, documentation and coverage: https://www.epo.org/en/searching-for-patents/data/web-services/ops
- Register an application and supply credentials via server env. Verify the current API version, OAuth/token endpoint, publication search syntax and authorization in the official docs and test with a known publication (WO2021055483A1). Use title/abstract terms, publication search and available description retrieval; return bibliographic fields and actual provider reference. Link to the corresponding publication in Espacenet or a verified public publication page. No hardcoded legal status. Do not claim complete search coverage.
- Restrict page size and calls, handle non-200s and rate limits, cache only as permitted. For the client meeting a controlled query with one traceable result is sufficient, but it must be an actual search. A second patent corpus is for later pilot; not necessary for this demo. PATENTSCOPE automatic access and reuse rights must be clarified before integration.
- No key? Offer "Vorbereitete Recherche" with PAT-01 / PAT-02. This is a usable internal demo but NOT a successful live patent test. Get credentials and test before the external meeting, or explicitly agree changed scope.

## Market/procurement — TED Search API
- Official: https://docs.ted.europa.eu/api/latest/search.html
- Request/response and pagination: https://docs.ted.europa.eu/ODS/latest/reuse/search-api.html
- Swagger: https://ted.europa.eu/api/documentation/index.html
- The read-only search can be accessed anonymously; check current version and endpoint in the official Swagger. The documented request exposes query, fields, page, limit and paginationMode. Use verified expert query syntax, CPV categories or title terms, with limits. Parse actual notice identifier, title, publication date, original notice URL and notice type, preserving language and response fields. Don't fabricate results if a search is too specific; allow user to broaden it.
- Real example included for learning (not a new order): historic TU Dublin procurement notice in public_sources.json. A general mechanical testing purchase is not evidence for a specific unfilled niche.

## Research signals — Crossref (simple extra live connector)
- Official REST API: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- `GET https://api.crossref.org/works?query.bibliographic=modular%20test%20fixture&rows=10` is an example query pattern. Confirm with a live request. Follow official polite-pool/contact policy. Parse DOI, title, dates and original URL. Metadata does not prove technical claims; show as research signal only. Optional filter by time range; count retrieved publications explicitly as sample counts, not market growth.
- This is a practical way to show changing research queries without a search-engine subscription. It does not replace patent search or direct market evidence.

## Existing products / counterevidence
Use the checked public reference links in data/public_sources.json. Manual addition of a source URL plus an analyst's note is fine. Do not scrape Google Patents or competitor pages at scale. If integrating a web-search API, use approved terms/licensed provider, server-side credentials and explicit data permissions. No blind arbitrary website fetches.

## State and test contract
A result has provider, query, retrieval mode (live/curated/manual), time, original identifier and URL, source type, optional passage and anchor, evidence status, and origin/family where known. A provider has its own status: idle/running/succeeded/partial/failed/not_configured. No fake live result or silent fallback. Treat an empty successful response as distinct from a failure. A successful original-link opening is part of manual smoke test. Verify licenses and allowed retention before real use. The kit does not include keys or a running API integration.
