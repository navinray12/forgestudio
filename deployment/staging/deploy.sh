#!/usr/bin/env bash
set -euo pipefail

source_root=${1:?Usage: deploy.sh <checked-out-source-root>}
install_root=${FORGESTUDIO_ROOT:-/opt/forgestudio}
env_file=${FORGESTUDIO_ENV_FILE:-/etc/forgestudio/staging.env}
[[ -f "$env_file" ]] || { echo "Missing $env_file" >&2; exit 1; }
set -a; source "$env_file"; set +a
[[ ${NODE_ENV:-} == production ]] || { echo "NODE_ENV must be production" >&2; exit 1; }
[[ ${UPLOAD_DIR:-} == /var/lib/forgestudio/uploads ]] || { echo "Unexpected UPLOAD_DIR" >&2; exit 1; }
[[ ${TRUST_PROXY:-} == loopback ]] || { echo "TRUST_PROXY must match this bundle's single local Caddy topology" >&2; exit 1; }
[[ ${FRONTEND_URL:-} == https://* ]] || { echo "FRONTEND_URL must be HTTPS" >&2; exit 1; }

release_id=$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "$source_root" rev-parse --short HEAD)
release="$install_root/releases/$release_id"
install -d -o forgestudio -g forgestudio -m 0750 "$release"
rsync -a --delete --exclude=.git --exclude=.env --exclude=node_modules --exclude=dist "$source_root/backend/" "$release/backend/"
rsync -a --delete --exclude=.git --exclude=.env --exclude=node_modules --exclude=dist "$source_root/frontend/" "$release/frontend/"
chown -R forgestudio:forgestudio "$release"

sudo -u forgestudio npm --prefix "$release/backend" ci
sudo -u forgestudio npm --prefix "$release/backend" run db:generate
sudo -u forgestudio npm --prefix "$release/backend" run build
sudo -u forgestudio env VITE_API_URL="$FRONTEND_URL" npm --prefix "$release/frontend" ci
sudo -u forgestudio env VITE_API_URL="$FRONTEND_URL" npm --prefix "$release/frontend" run build
(cd "$release/backend" && sudo -u forgestudio env DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy)

if [[ -L "$install_root/current" ]]; then ln -sfn "$(readlink -f "$install_root/current")" "$install_root/previous"; fi
ln -sfn "$release" "$install_root/current"
systemctl restart forgestudio
"$(dirname "$0")/healthcheck.sh"
echo "deployed_release=$release_id"
