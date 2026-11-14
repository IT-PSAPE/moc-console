#!/usr/bin/env bash
# The production build must exist. All API calls use isolated browser fixtures.
set -euo pipefail
mkdir -p output/playwright output/quality
browser_session="console-ci-$$"
preview_pid=""
browser_port="${MOC_BROWSER_PORT:-5188}"
browser_origin="http://127.0.0.1:$browser_port"
cleanup() {
  npx --no-install playwright-cli -s="$browser_session" close >/dev/null 2>&1 || true
  if [[ -n "$preview_pid" ]]; then
    kill "$preview_pid" 2>/dev/null || true
    wait "$preview_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT
if curl --fail --silent "$browser_origin/equipment" >/dev/null; then
  echo 'The requested port is already serving a preview; stop it before running isolated browser checks.' >&2
  exit 1
fi
node test/scripts/serve-console-preview.mjs >output/quality/browser-preview.log 2>&1 &
preview_pid=$!
for attempt in {1..50}; do
  if curl --fail --silent "$browser_origin/equipment" >/dev/null; then break; fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then cat output/quality/browser-preview.log; exit 1; fi
  sleep 0.2
done
curl --fail --silent "$browser_origin/equipment" >/dev/null
npx --no-install playwright-cli -s="$browser_session" open "$browser_origin/equipment" --browser chrome
npx --no-install playwright-cli -s="$browser_session" run-code --filename test/scripts/console-quality.browser-test.js
