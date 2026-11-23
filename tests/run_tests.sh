#!/bin/sh
# Runs all automated tests: JS rule tests (JavaScriptCore) + Python server tests.
set -e
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
for T in rules i18n; do
  echo "== JS tests (tests/$T.test.js)"
  if [ -x "$JSC" ]; then
    OUT=$("$JSC" -m tests/$T.test.js); echo "$OUT"
    echo "$OUT" | grep -q " 0 failed" || exit 1
  elif command -v node >/dev/null; then
    node --input-type=module -e "import('./tests/$T.test.js').then(m=>process.exit(m.summary.fail?1:0))"
  else
    echo "No JS engine found - open /app/tests.html in the browser instead."; exit 1
  fi
done
echo "== Server tests (offline)"
python3 -m unittest discover -s tests -p "test_*.py" -v
