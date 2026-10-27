#!/usr/bin/env bash
set -euo pipefail
install_root=${FORGESTUDIO_ROOT:-/opt/forgestudio}
target=${1:-previous}
if [[ "$target" == previous ]]; then candidate=$(readlink -f "$install_root/previous"); else candidate=$(readlink -f "$install_root/releases/$target"); fi
[[ -n ${candidate:-} && "$candidate" == "$install_root/releases/"* && -f "$candidate/backend/dist/server.js" ]] || { echo "Invalid release target" >&2; exit 1; }
current=$(readlink -f "$install_root/current")
ln -sfn "$candidate" "$install_root/current"
ln -sfn "$current" "$install_root/previous"
systemctl restart forgestudio
"$(dirname "$0")/healthcheck.sh"
echo "application_rollback=$(basename "$candidate")"
echo "Database migrations are additive and were not reversed."
