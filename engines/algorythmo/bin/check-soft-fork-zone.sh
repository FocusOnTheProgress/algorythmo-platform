#!/usr/bin/env bash
# algorythmo: soft-fork-ci-check
#
# Validates that every file listed in the "Soft-fork zone" table of
# engines/algorythmo/README.md:
#   1. Exists in the working tree.
#   2. Contains at least one line tagged with `algorythmo: rebrand-m0`
#      OR `algorythmo: soft-fork` OR `algorythmo: widget-i18n-overlay`
#      OR `algorythmo: survey-i18n-overlay`.
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more files missing or untagged
#
# Usage:
#   bash engines/algorythmo/bin/check-soft-fork-zone.sh
#   (run from repo root)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
FAILURES=0

check_file() {
  local path="$1"
  local expected_tag="$2"
  local full_path="${REPO_ROOT}/${path}"

  if [[ ! -f "${full_path}" ]]; then
    echo "[FAIL] Missing: ${path}" >&2
    FAILURES=$(( FAILURES + 1 ))
    return
  fi

  if ! grep -qE "algorythmo: (rebrand-m0|soft-fork|widget-i18n-overlay|survey-i18n-overlay)" "${full_path}"; then
    echo "[FAIL] No algorythmo tag in: ${path}" >&2
    echo "       Expected tag matching: algorythmo: (rebrand-m0|soft-fork|widget-i18n-overlay|survey-i18n-overlay)" >&2
    FAILURES=$(( FAILURES + 1 ))
    return
  fi

  echo "[OK]   ${path}"
}

echo "=== Algorythmo soft-fork zone check ==="
echo ""

# Each entry: <relative-path-from-repo-root> <expected-tag>
# Update this list whenever a new file enters the soft-fork zone.
# Corresponding table lives in engines/algorythmo/README.md § Soft-fork zone.
check_file "app/javascript/v3/views/auth/signup/Index.vue" "rebrand-m0"
check_file "app/javascript/widget/i18n/index.js" "widget-i18n-overlay"
check_file "app/javascript/survey/i18n/index.js" "survey-i18n-overlay"
check_file "app/javascript/survey/views/Response.vue" "rebrand-m0"

echo ""
if [[ "${FAILURES}" -gt 0 ]]; then
  echo "=== FAILED: ${FAILURES} soft-fork zone violation(s) found ==="
  echo "    Each file in the soft-fork zone must exist AND contain an algorythmo tag."
  echo "    See engines/algorythmo/README.md § Soft-fork zone for guidance."
  exit 1
fi

echo "=== PASSED: all soft-fork zone entries are tagged ==="
exit 0
