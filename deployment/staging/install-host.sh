#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then echo "Run as root" >&2; exit 1; fi
id forgestudio >/dev/null 2>&1 || useradd --system --home /var/lib/forgestudio --shell /usr/sbin/nologin forgestudio
id caddy >/dev/null 2>&1 || { echo "Install Caddy before running this script" >&2; exit 1; }
usermod --append --groups forgestudio caddy
install -d -o root -g forgestudio -m 0750 /opt/forgestudio /opt/forgestudio/releases
install -d -o forgestudio -g forgestudio -m 0750 /var/lib/forgestudio/uploads
install -d -o root -g forgestudio -m 0750 /etc/forgestudio
install -o root -g root -m 0644 forgestudio.service /etc/systemd/system/forgestudio.service
systemctl daemon-reload
echo "Host directories and service installed. Populate /etc/forgestudio/staging.env before enabling."
