#!/usr/bin/env bash
set -euo pipefail
url=${1:-http://127.0.0.1:5000/api/v1/ready}
for _ in {1..30}; do
  if body=$(curl --fail --silent --show-error --max-time 3 "$url" 2>/dev/null) && grep -q '"status":"ready"' <<<"$body"; then
    echo "readiness=pass"
    exit 0
  fi
  sleep 2
done
echo "readiness=fail" >&2
exit 1
