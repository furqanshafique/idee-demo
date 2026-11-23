"""IDEE demo server: static files + a small allowlisted research proxy.

Python 3.9+ standard library only. Credentials are read from the server
environment / a local .env and are never sent to the browser.

    python3 server/server.py            # http://127.0.0.1:8770/app/
"""
import json
import os
import sys
import threading
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import providers  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIRS = ("app", "data", "documents", "tests")
SYNTHETIC_DOC_IDS = {"IDEE-01", "IDEE-02", "IDEE-03", "PB-17"}
MAX_BODY = 200_000
RATE_LIMIT = 40  # external calls per minute, whole server


def load_env():
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def cfg(name):
    return (os.environ.get(name) or "").strip() or None


_calls = []
_calls_lock = threading.Lock()


def take_call_slot():
    with _calls_lock:
        now = time.time()
        while _calls and _calls[0] < now - 60:
            _calls.pop(0)
        if len(_calls) >= RATE_LIMIT:
            return False
        _calls.append(now)
        return True


def provider_status():
    return {
        "crossref": {"status": "ready", "label": "Crossref REST API", "auth": "keine (öffentlich)",
                     "contact": bool(cfg("RESEARCH_CONTACT_EMAIL"))},
        "ted": {"status": "ready", "label": "TED Search API v3", "auth": "keine (öffentlich, anonym)"},
        "epo": {"status": "ready" if cfg("EPO_CONSUMER_KEY") and cfg("EPO_CONSUMER_SECRET") else "not_configured",
                "label": "EPO Open Patent Services 3.2", "auth": "OAuth Client Credentials (Server-.env)"},
        "anthropic": {"status": "ready" if cfg("ANTHROPIC_API_KEY") else "not_configured",
                      "label": "Claude API (optionale Extraktion)", "auth": "API-Key (Server-.env)"},
    }


class Handler(SimpleHTTPRequestHandler):
    server_version = "IDEE-Demo"
    # Python 3.9 does not know these; with nosniff they must be typed correctly.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".woff2": "font/woff2", ".svg": "image/svg+xml", ".mjs": "text/javascript"}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        # Never log request bodies; paths only.
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def _json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _allowed_static(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path in ("/", ""):
            return "redirect"
        parts = [p for p in path.split("/") if p]
        if not parts or parts[0] not in PUBLIC_DIRS or any(p.startswith(".") or p == ".." for p in parts):
            return False
        return True

    def do_HEAD(self):
        if self._allowed_static() is True:
            return super().do_HEAD()
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_GET(self):
        if self.path.startswith("/api/status"):
            return self._json(200, {"providers": provider_status(), "server_time": providers.now_iso()})
        allowed = self._allowed_static()
        if allowed == "redirect":
            self.send_response(302)
            self.send_header("Location", "/app/")
            return self.end_headers()
        if not allowed:
            return self.send_error(HTTPStatus.NOT_FOUND)
        return super().do_GET()

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            raise ValueError("Ungültige Anfragegröße.")
        return json.loads(self.rfile.read(n))

    def do_POST(self):
        try:
            body = self._body()
        except Exception as e:  # noqa: BLE001
            return self._json(400, {"error": str(e)})
        if self.path == "/api/search":
            return self._search(body)
        if self.path == "/api/extract":
            return self._extract(body)
        return self._json(404, {"error": "Unbekannter Endpunkt."})

    def _search(self, body):
        provider = body.get("provider")
        if provider not in ("crossref", "ted", "epo"):
            return self._json(400, {"error": "Anbieter nicht freigegeben."})
        query, err = providers.check_query(body.get("query"))
        if err:
            return self._json(400, {"error": err})
        try:
            limit = max(1, min(int(body.get("limit") or 25), providers.MAX_LIMIT))
            timeout = max(3, min(int(body.get("timeout") or providers.DEFAULT_TIMEOUT), 30))
        except (TypeError, ValueError):
            return self._json(400, {"error": "Ungültige Parameter."})
        if provider == "epo" and provider_status()["epo"]["status"] == "not_configured":
            return self._json(200, providers.search_epo(query, limit, None, None))
        if not take_call_slot():
            return self._json(429, {"error": f"Abfragelimit erreicht ({RATE_LIMIT}/min). Bitte kurz warten."})
        if provider == "crossref":
            res = providers.search_crossref(query, limit, cfg("RESEARCH_CONTACT_EMAIL"), timeout)
        elif provider == "ted":
            res = providers.search_ted(query, limit, timeout)
        else:
            res = providers.search_epo(query, limit, cfg("EPO_CONSUMER_KEY"), cfg("EPO_CONSUMER_SECRET"), timeout)
        return self._json(200, res)

    def _extract(self, body):
        key = cfg("ANTHROPIC_API_KEY")
        if not key:
            return self._json(200, {"status": "not_configured", "error": "Kein Laufzeit-API-Key (ANTHROPIC_API_KEY) konfiguriert."})
        if body.get("doc_id") not in SYNTHETIC_DOC_IDS or body.get("approved") is not True:
            return self._json(400, {"error": "Nur freigegebene synthetische Dokumente mit ausdrücklicher Zustimmung."})
        pages = body.get("pages")
        if not isinstance(pages, list) or not all(isinstance(p, str) for p in pages):
            return self._json(400, {"error": "Seitentexte fehlen."})
        if not take_call_slot():
            return self._json(429, {"error": "Abfragelimit erreicht."})
        try:
            data = providers.extract_with_claude(key, body["doc_id"], pages)
            return self._json(200, {"status": "succeeded", "data": data, "model": "claude-opus-5-5"})
        except Exception as e:  # noqa: BLE001
            return self._json(200, {"status": "failed", "error": providers._http_error_text(e)})


class Server(ThreadingHTTPServer):
    # The default listen backlog (5) is smaller than the 6 parallel connections a
    # browser opens for the JS modules; on macOS the overflow is reset and the app
    # intermittently never boots.
    request_queue_size = 64
    daemon_threads = True


def main():
    load_env()
    port = int(os.environ.get("IDEE_PORT") or os.environ.get("PORT") or "8770")
    httpd = Server(("127.0.0.1", port), Handler)
    st = provider_status()
    print(f"IDEE demo: http://127.0.0.1:{port}/app/")
    print("Provider: " + ", ".join(f"{k}={v['status']}" for k, v in st.items()))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
