"""Live smoke test against the real public APIs (network required).

    python3 tests/live_smoke.py

Prints PASS/FAIL/BLOCKED per provider. EPO is reported BLOCKED (never PASS)
when credentials are missing from the environment/.env.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "server"))
import providers  # noqa: E402
import server  # noqa: E402

server.load_env()
KNOWN_PUB = "WO2021055483A1"
known_family = None
rc = 0
for name, fn in [
    ("TED", lambda: providers.search_ted("test fixture, Prüfvorrichtung", 5)),
    ("Crossref", lambda: providers.search_crossref("modular test fixture changeover", 5, os.environ.get("RESEARCH_CONTACT_EMAIL"))),
    ("EPO OPS", lambda: providers.search_epo("modular test fixture", 5, os.environ.get("EPO_CONSUMER_KEY"), os.environ.get("EPO_CONSUMER_SECRET"))),
    ("EPO OPS by number", lambda: providers.search_epo_number(KNOWN_PUB, os.environ.get("EPO_CONSUMER_KEY"), os.environ.get("EPO_CONSUMER_SECRET"))),
    ("EPO OPS known pub", lambda: providers.search_epo("universal modular test fixture", 25, os.environ.get("EPO_CONSUMER_KEY"), os.environ.get("EPO_CONSUMER_SECRET"))),
]:
    r = fn()
    if r["status"] == "not_configured":
        print(f"BLOCKED  {name}: {r['error']}")
        continue
    ok = r["status"] in ("succeeded",) and r["results"] and all(x["url"].startswith("https://") for x in r["results"])
    if name == "EPO OPS by number":
        hit = next((x for x in r["results"] if x["identifier"] == KNOWN_PUB), None)
        ok = ok and hit is not None and hit["url"] == f"https://worldwide.espacenet.com/patent/search?q=pn%3D{KNOWN_PUB}"
        known_family = hit and hit["family"]
    if name == "EPO OPS known pub":
        # OPS lists one publication per family (here e.g. CA3149717A1); the WO is in that family.
        ok = ok and bool(known_family) and any(x["family"] == known_family for x in r["results"])
        print(f"           expected family of {KNOWN_PUB}: {known_family}")
    print(f"{'PASS' if ok else 'FAIL'}     {name}: status={r['status']} count={r['count']} total={r['total']} {r['error'] or ''}")
    for x in r["results"][:2]:
        print(f"           {x['identifier']} | {x['title'][:70]} | {x['url']}")
    rc |= 0 if ok else 1
sys.exit(rc)
