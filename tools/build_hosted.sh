#!/bin/sh
# Builds a flat, server-less copy of the demo (page + js/ vendor/ data/ documents/)
# for static hosting, e.g. a claude.ai artifact. Research then runs against the
# prepared data set only (no proxy, no API keys).
#   tools/build_hosted.sh <output-dir>
set -e
OUT="${1:?usage: tools/build_hosted.sh <output-dir>}"
cd "$(dirname "$0")/.."
rm -rf "$OUT"; mkdir -p "$OUT/data" "$OUT/documents"
cp -R app/js app/vendor app/styles.css "$OUT/"
cp data/seed.json data/public_sources.json "$OUT/data/"
cp documents/*.pdf "$OUT/documents/"
# The artifact host adds the html/head/body skeleton itself.
cat > "$OUT/index.html" <<'HTML'
<title>Devoreo IDEE Prototyp</title>
<meta name="devoreo-base" content=".">
<link rel="stylesheet" href="styles.css">
<script src="vendor/pdf.min.js"></script>
<div id="header"></div>
<div class="layout">
  <aside id="nav"></aside>
  <main id="main-wrap">
    <div id="flash"></div>
    <div id="main"><p class="muted">Daten werden geladen …</p></div>
  </main>
  <aside id="viewer" class="viewer" aria-label="Quelldokument"></aside>
</div>
<script type="module" src="js/main.js"></script>
HTML
echo "Built $OUT"
