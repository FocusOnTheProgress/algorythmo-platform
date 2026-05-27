#!/usr/bin/env bash
set -euo pipefail
PASS="${ADMIN_PASS:-}"
if [ -z "$PASS" ]; then
  echo "ADMIN_PASS env var required"
  exit 1
fi
CID=$(docker ps --filter name=os-empresarial_app -q | head -1)
if [ -z "$CID" ]; then
  echo "no os-empresarial_app container"
  exit 1
fi
SCRIPT_URL="https://raw.githubusercontent.com/FocusOnTheProgress/algorythmo-platform/chore/dockerfile-lowmem-build/bin/seed_founder_admin.rb"
TMP=$(mktemp)
curl -sf "$SCRIPT_URL" -o "$TMP"
docker cp "$TMP" "$CID:/tmp/sfa.rb"
docker exec -e ADMIN_PASS="$PASS" "$CID" bundle exec rails runner -e production /tmp/sfa.rb
rm -f "$TMP"
