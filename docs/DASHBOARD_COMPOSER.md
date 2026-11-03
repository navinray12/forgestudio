# Dashboard Composer

The composer.pdf is the visual reference for `/dashboard/tools?tab=composer-installation`. It uses the current Developer Tools shell and matches the diagnostics, environment alert, Manual Path Setup and Lockfile & Dependencies panels. Buttons run real diagnostics and persist runtime selections. The configured state exposes composer.json validation/save, dependency installation, installed package list and autoload information. No runtime versions or packages are invented.

## Server setup

Runtime binaries belong to the backend host, not the browser computer. System PATH discovery remains the default. Operators can set:

```
COMPOSER_PHP_PATH=/absolute/path/to/php
COMPOSER_BINARY_PATH=/absolute/path/to/composer
COMPOSER_INSTALL_ENABLED=false
```

For Windows use an absolute php.exe and composer.phar path; PHAR execution uses the selected PHP executable. Shell batch wrappers are unsupported. Restart the backend after environment changes. Configure Paths selects the operator-trusted paths or system PATH; the UI cannot submit arbitrary server executables. This restriction prevents ordinary account settings from becoming a command execution API. PHP 8.0+ and Composer 2.2+ are required. Set COMPOSER_INSTALL_ENABLED=true only when the server is prepared for account dependency builds. The local installation currently has neither runtime, and installation remains disabled; the page reports this directly.

## Persistence and isolation

Targeted additive SQL: prisma/migrations/20261029220000_dashboard_composer/migration.sql. Run `cd backend; npm run db:composer-dashboard`. The installer verifies existing rows and migration history remain unchanged; no reset or blanket migration deployment is used.

`dashboard_composer_settings` stores each user's runtime choice, validated configuration, version and active release ID. `dashboard_composer_runs` stores bounded result output, package/lock data, statuses and a five-minute installation lease. Reading status uses defaults without creating rows. Validation hashes canonicalize nested JSON keys so PostgreSQL JSONB ordering cannot invalidate a saved configuration.

The old shared integrations/php/composer.json is never overwritten. Validation/install work in unique account/run directories under backend/integrations/php/accounts, outside websites/editor content. A failed install preserves the active release and previous artifacts. Reinstalling an unchanged configuration reuses the account's previous lockfile; changed configurations resolve into a new directory. A conditional database pointer activates a successful release only if the selected config/version still matches. Expired/cancelled run leases cannot activate a release. One RUNNING row per account prevents concurrent installs; crashed/expired leases are recovered on the next install. Existing artifacts are retained; no permanent cleanup/deletion workflow is introduced.

## API

Both /api/composer and /api/v1/composer use existing session authentication and ACTIVE account checks:

- GET /status: actual runtime detection plus account-scoped settings, packages, latest run and capabilities.
- PATCH /settings: phpSource/composerSource (AUTO or CONFIGURED) and version.
- POST /validate: config JSON string and version. Parses supported fields, invokes Composer validation, and saves only on success.
- POST /install: version. Requires enabled server, verified runtimes and exact validated config; returns result after the bounded install.

Writes check frontend Origin when present and require JSON. Settings/validation have an account rate limit of 20/minute; installs 2/minute. Optimistic version conflicts return 409. Error responses preserve draft input. Diagnostics can be retried, and path dialog saves/retries retain selections. Legacy internal shared-directory mutation helpers now explicitly require the authenticated account API, rather than silently performing unsafe shared writes.

## Execution constraints

Commands use execFile with shell=false, fixed argv, hidden Windows process windows, timeouts and bounded output. No command text comes from the browser. Composer runs with --no-interaction, --no-plugins, --no-scripts and --no-ansi; installation also uses --no-dev, --prefer-dist and --optimize-autoloader. Package scripts, repositories, credential/config overrides, absolute/traversing autoload paths and arbitrary composer.json extensions are rejected. Only package details/requirements and relative PSR-4 autoload paths are accepted. Child environments do not inherit application credentials such as COMPOSER_AUTH. No PHP autoloader or installed package is executed by the dashboard backend. These managed dependencies do not alter or deploy any published site automatically.

Flag reference: https://getcomposer.org/doc/03-cli.md ; plugin configuration: https://getcomposer.org/doc/06-config.md#allow-plugins .

## Verification

- Backend/frontend `npm run build`.
- Backend `npm run test:composer-dashboard`: configuration constraints; canonical hashes; injected native argv/runtime tests with temporary files; real database/API tests for defaults, persistence, isolation, authentication, conflicts, validation, installation failure retention, concurrency and lease/pointer behavior. Existing website/content/settings/run/ledger snapshots are checked for preservation.
- Frontend `npm run test:composer`: path choice payloads and JSON/version handling.
- Backend `npm run test:composer-browser`: local Vite/API plus disposable Chrome CDP on 9227. Desktop/mobile screenshots, actual missing-runtime state, persisted path choices, failed diagnostic/save retries, stale setting conflicts and reload behavior. Screenshots/report live in ignored .integration-review/composer-e2e.

No external package downloads or actual PHP/Composer installation ran. The ready/install pipeline is verified using injected command adapters; live package installation still requires the operator-installed runtimes and enabled flag. Tests use disposable example.invalid accounts and clean their database rows. No existing website or legacy PHP directory is edited/deleted during verification.
