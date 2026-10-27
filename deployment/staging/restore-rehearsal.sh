#!/usr/bin/env bash
set -euo pipefail
backup_dir=${1:?Usage: restore-rehearsal.sh <backup-directory> <empty-media-directory>}
media_dir=${2:?Usage: restore-rehearsal.sh <backup-directory> <empty-media-directory>}
[[ ${ALLOW_ISOLATED_RESTORE_REHEARSAL:-} == true ]] || { echo "Set ALLOW_ISOLATED_RESTORE_REHEARSAL=true" >&2; exit 1; }
[[ -n ${RESTORE_DATABASE_URL:-} ]] || { echo "RESTORE_DATABASE_URL is required" >&2; exit 1; }
db_name=$(node -e 'console.log(new URL(process.env.RESTORE_DATABASE_URL).pathname.slice(1))')
[[ "$db_name" == forgestudio_restore_* ]] || { echo "Recovery database name must start with forgestudio_restore_" >&2; exit 1; }
[[ -f "$backup_dir/database.dump" && -f "$backup_dir/uploads.tar.gz" && -f "$backup_dir/SHA256SUMS" ]] || { echo "Incomplete backup" >&2; exit 1; }
(cd "$backup_dir" && sha256sum --check SHA256SUMS)
[[ -d "$media_dir" && -z $(find "$media_dir" -mindepth 1 -print -quit) ]] || { echo "Media target must be an existing empty directory" >&2; exit 1; }

# The owner must provision the isolated empty database; this script never drops databases.
pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" "$backup_dir/database.dump"
tar --extract --gzip --file="$backup_dir/uploads.tar.gz" --directory="$media_dir"
echo "restore_rehearsal=complete"
echo "Next: start the candidate with DATABASE_URL=RESTORE_DATABASE_URL and UPLOAD_DIR=$media_dir, then run readiness and hosted smoke checks."
