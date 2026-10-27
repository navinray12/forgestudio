# ForgeStudio staging deployment

This bundle defines one concrete topology: one Linux host, Caddy terminating HTTPS, the Node API listening only on loopback port 5000, a static Vite build, isolated PostgreSQL, and `/var/lib/forgestudio/uploads` on durable storage. Caddy is the only application proxy, so `TRUST_PROXY=loopback` is topology-specific. Re-evaluate it before adding a load balancer, CDN, container network, or another proxy.

## Host prerequisites

- Linux with Node.js matching the lockfile-supported runtime, npm, Git, rsync, curl and PostgreSQL client tools.
- Caddy installed from its supported package repository and ports 80/443 reachable.
- DNS for `STAGING_HOST` pointing to this host.
- An isolated PostgreSQL database and a durable mounted filesystem at `/var/lib/forgestudio/uploads`.
- An authorized external SMTP account and test mailbox.

Run `install-host.sh` from this directory as root after installing Caddy. It adds the Caddy service account to the read-only application group while only the ForgeStudio account can write uploads. Copy `staging.env.example` to `/etc/forgestudio/staging.env`, replace every placeholder, then set owner `root:forgestudio` and mode `0640`. Configure Caddy's service environment from `caddy.env.example`, install this `Caddyfile`, and run `caddy validate --config <path>/Caddyfile` before reload.

## Deploy and rollback

Run `deploy.sh <verified-checkout>` as an authorized administrator. It creates an immutable release, installs from lockfiles, generates Prisma, builds both applications, runs `prisma migrate deploy`, atomically switches `current`, restarts the non-root service and waits for database readiness. It never reads repository `.env` files into the release.

Run `rollback.sh previous` or `rollback.sh <release-id>` to switch application code. Database migrations are deliberately not reversed; Phase 1 migrations are additive. Restore data only through the isolated recovery procedure and explicit authorization.

After Caddy reload, run `npm run test:staging:smoke` using ephemeral environment variables. Create the disposable user, OTP session, blank site and nested page through the real UI; derive IDs and cookies in browser automation memory and redact `Cookie`, `Set-Cookie`, OTP and credentials from retained logs.

Run `npm run diagnose:staging:smtp` from `backend` for bounded DNS, TCP, TLS and authentication diagnostics. It sends no message and prints no credentials. A passing handshake is not delivery evidence; send an OTP only to the owner-authorized test mailbox through the real signup/login workflow.

## Backup and isolated recovery

`backup.sh` briefly stops the API to produce a coordinated custom-format `pg_dump` plus upload archive and checksums. Copy the result to a separately protected backup destination according to the owner's retention policy.

For recovery, the owner provisions a new empty database named `forgestudio_restore_<suffix>` and an empty media directory. Set `RESTORE_DATABASE_URL` and `ALLOW_ISOLATED_RESTORE_REHEARSAL=true`, then run `restore-rehearsal.sh <backup> <media-dir>`. The script validates checksums, never drops a database, and refuses non-rehearsal database names. Start a separate recovery instance against those targets, verify `/api/v1/ready`, row counts, representative asset hashes and nested anonymous pages, then destroy it only with owner authorization.

## Host-only verification

Caddy certificate issuance, systemd sandbox compatibility, filesystem mount durability, actual proxy address, external SMTP delivery, deployment replacement, and restored database/media behavior must be verified on the authorized host. Local syntax checks do not prove these properties.
