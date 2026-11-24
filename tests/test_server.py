"""Offline server tests: query guard, parsers, static allowlist.

Fixtures *_live_capture.json are real responses captured from the public APIs on
2026-11-20 (see README). ops_shape_sample.json is a hand-written minimal example of
the documented OPS JSON structure, used only to test the parser – not a real result.
Live calls are covered by tests/live_smoke.py (network required).
"""
import json
import sys
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "server"))
import providers  # noqa: E402
import server  # noqa: E402

FIX = ROOT / "tests" / "fixtures"


class QueryGuard(unittest.TestCase):
    def test_blocks_internal_ids(self):
        for q in ["UL-01 fixture", "BeispielMed", "Hubantrieb MH-A", "ergo-tec test", "PB-17"]:
            self.assertIsNotNone(providers.check_query(q)[1], q)

    def test_blocks_app_record_ids(self):
        for q in ["test fixture CAP-01", "SF-01 fixture", "H-02", "CAP-Q01", "SF-M01", "H-U01", "Q-03",
                  "RUN-001", "PAT-FAM-01", "ALT-01", "MARKET-01", "MAN-02", "PUB-ET-MED", "UPL-1a2b3c4d", "LLM-IDEE-01-1"]:
            self.assertIsNotNone(providers.check_query(q)[1], q)

    def test_keeps_ordinary_terms(self):
        for q in ["ISO 10993-1 test fixture", "H-Profil Aufnahme", "Q-Switch laser", "run-in test bench", "quick-change"]:
            self.assertIsNone(providers.check_query(q)[1], q)

    def test_accepts_generic(self):
        self.assertEqual(providers.check_query("  modular   test fixture ")[0], "modular test fixture")

    def test_length(self):
        self.assertIsNotNone(providers.check_query("a" * 201)[1])

    def test_clean_text_strips_markup(self):
        self.assertEqual(providers.clean_text("<b>Hi</b>\x07 <script>x</script>"), "Hi x")


class Parsers(unittest.TestCase):
    def test_ted(self):
        payload = json.loads((FIX / "ted_live_capture.json").read_text())
        total, items = providers.parse_ted(payload, "q", "t")
        self.assertEqual(total, payload["totalNoticeCount"])
        self.assertTrue(items)
        for it in items:
            self.assertTrue(it["url"].startswith("https://ted.europa.eu/"))
            self.assertRegex(it["identifier"], r"^TED \d+-\d{4}$")
            self.assertEqual(it["kind"], "procurement")

    def test_ted_query(self):
        self.assertEqual(providers.ted_expert_query('test fixture, "Prüfvorrichtung"'),
                         '((FT~"test fixture") OR (FT~"Prüfvorrichtung")) SORT BY publication-date DESC')

    def test_crossref(self):
        payload = json.loads((FIX / "crossref_live_capture.json").read_text())
        total, items = providers.parse_crossref(payload, "q", "t")
        self.assertGreater(total, 0)
        self.assertTrue(all(i["url"].startswith("https://doi.org/") for i in items))

    def test_ops_shape(self):
        payload = json.loads((FIX / "ops_shape_sample.json").read_text())
        total, items = providers.parse_ops(payload, "q", "t")
        self.assertEqual(total, 1)
        self.assertEqual(items[0]["identifier"], "WO2021055483A1")
        self.assertIn("espacenet", items[0]["url"])
        self.assertIsNone(items[0]["legal_status"])

    def test_epo_number_validates(self):
        self.assertEqual(providers.search_epo_number("WO 2021; x", "k", "s")["status"], "failed")
        self.assertEqual(providers.search_epo_number("WO2021055483A1", None, None)["status"], "not_configured")

    def test_epo_not_configured(self):
        r = providers.search_epo("test fixture", 10, None, None)
        self.assertEqual(r["status"], "not_configured")
        self.assertEqual(r["results"], [])


class StaticAllowlist(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def get(self, path):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{self.port}{path}") as r:
                return r.status
        except urllib.error.HTTPError as e:
            return e.code

    def test_public(self):
        self.assertEqual(self.get("/app/index.html"), 200)
        self.assertEqual(self.get("/documents/IDEE-01_Projektakte_UL-01.pdf"), 200)

    def test_private(self):
        for p in ["/.env.example", "/references/IDEE_Kompetenzaufnahme_Feldkatalog.json",
                  "/server/server.py", "/app/../server/server.py", "/data/../.env.example"]:
            self.assertEqual(self.get(p), 404, p)

    def test_search_rejects_unknown_provider_and_ids(self):
        def post(body):
            req = urllib.request.Request(f"http://127.0.0.1:{self.port}/api/search", data=json.dumps(body).encode(),
                                         headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req) as r:
                    return r.status, json.loads(r.read())
            except urllib.error.HTTPError as e:
                return e.code, json.loads(e.read())
        self.assertEqual(post({"provider": "google", "query": "x"})[0], 400)
        self.assertEqual(post({"provider": "ted", "query": "UL-01"})[0], 400)


if __name__ == "__main__":
    unittest.main()
