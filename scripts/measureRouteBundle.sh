#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-/tmp/teachlink.bundle.js}"
ENTRY="${ROOT}/node_modules/expo-router/entry.js"

cd "$ROOT"

if [[ ! -f "$ENTRY" ]]; then
  echo "Run npm install first (missing expo-router entry)."
  exit 1
fi

npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file "$ENTRY" \
  --bundle-output "$OUT" \
  --assets-dest /tmp/teachlink-bundle-assets

BYTES=$(wc -c <"$OUT" | tr -d ' ')
echo "Bundle: $OUT"
echo "Size: $BYTES bytes ($(echo "scale=2; $BYTES/1024/1024" | bc) MiB)"
