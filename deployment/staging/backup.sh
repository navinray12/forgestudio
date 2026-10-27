#!/usr/bin/env bash
set -euo pipefail
env_file=${FORGESTUDIO_ENV_FILE:-/etc/forgestudio/staging.env}
backup_root=${FORGESTUDIO_BACKUP_ROOT:-/var/backups/forgestudio}
[[ -f "$env_file" ]] || { echo "Missing environment file" >&2; exit 1; }
set -a; source "$env_file"; set +a
[[ ${NODE_ENV:-} == production && -n ${DATABASE_URL:-} && -d ${UPLOAD_DIR:-} ]] || { echo "Invalid staging configuration" >&2; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_root/$stamp"
install -d -m 0700 "$target"

# Stop application writes so database and media represent one recovery point.
systemctl stop forgestudio
trap 'systemctl start forgestudio' EXIT
pg_dump --format=custom --no-owner --no-acl --file="$target/database.dump" "$DATABASE_URL"
tar --create --gzip --file="$target/uploads.tar.gz" --directory="$UPLOAD_DIR" .
sha256sum "$target/database.dump" "$target/uploads.tar.gz" > "$target/SHA256SUMS"
chmod 0600 "$target"/*
systemctl start forgestudio
trap - EXIT
"$(dirname "$0")/healthcheck.sh"
echo "backup_id=$stamp"
