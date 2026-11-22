#!/usr/bin/env bash
# Runs every lint and test. `scripts/check.sh <section>` runs one: pipeline, app, e2e.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
section="${1:-all}"

pipeline() {
  (cd "$root/pipeline" && uv run ruff check . && uv run ruff format --check . && uv run pytest -q)
}
app() {
  (cd "$root/app" && npm run lint && npm test)
}
e2e() {
  (cd "$root/app" && npx playwright test)
}

case "$section" in
  pipeline) pipeline ;;
  app) app ;;
  e2e) e2e ;;
  all) pipeline && app && e2e ;;
  *) echo "unknown section: $section" >&2; exit 2 ;;
esac
