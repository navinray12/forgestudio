# Portable document implementation status

The latest attachment matches the existing v4 specification after paragraph
normalization; [import provenance](blueprint-import.json) records the received DOCX
digest. FS-016, FS-017 and FS-080 are now in progress with executable shared runtime
contracts. This is not completion of the full blueprint or native WordPress product.

## Implemented

- One closed JSON Schema and a drift check, with nine core widget settings contracts,
  typed styles, normalized node IDs/children, breakpoints and an explicit unsupported
  preservation representation.
- Independent TypeScript/Ajv and PHP/Opis validation of the same schema, followed by
  graph, reference, URL and resource-bound checks.
- Strict UTF-8, duplicate-key/depth checks, bounded canonical output, UTF-16 key
  sorting and matching domain-separated hashes under a documented integer-only
  numeric profile. Decimal style lengths remain strings with units.
- A deterministic legacy preservation migration with exact original source recovery,
  tamper checks and explicit refusal to invent migrations for future schemas.
- The existing browser save adapter and cloud draft validator share legacy-tree
  validation. Old document fields and the existing draft receipt/hash contract stay
  intact; no database migration or automatic format cutover is introduced here.
- Locked PHP dependencies, pinned test images, a network-disabled PHP fixture runner,
  and a CI job comparing actual runtime outcomes rather than reference-only schemas.
- Applied the blueprint's default separation of design and publication permissions:
  a designer now needs an explicit stored publication grant. Owner/admin defaults and
  existing explicit grants remain available. Full workspace capability/authority
  consolidation is still part of FS-040.

Read [the package guide](../../packages/document-contract/README.md) for file ownership,
limits, commands, canonicalization references and the migration contract.

## Executed verification

- `npm run check`: schema drift, module boundaries, source documentation, workspace
  type checks, production builds and initial browser bundle limits passed.
- `npm test`: 109 tests passed after the final source-recovery and Unicode changes.
- `npm run test:integration`: 28 tests passed against disposable PostgreSQL, including
  clean migrations, upgrade preservation and explicit designer publication grants.
- `npm run test:journeys`: three Chromium journeys passed using controlled API
  responses, covering ambiguous save retry, stale-draft recovery and editor navigation.
- The PHP pipeline installed and audited the locked dependencies. Its final fixture
  run passed 49 TypeScript/PHP cases on PHP 8.3.33, including escaped lone surrogates.
- `npm audit --audit-level=high`: no reported vulnerabilities.

These are local results; a remote CI run and production load, recovery and WordPress
installation tests have not been executed. [Recorded evidence](../evidence/v4-document-contract.json)
includes source digests and the shared runtime fixture report.

## Remaining before a portable page cutover

The host must implement authoritative account/workspace/site/page ownership,
transactional asset/resource checks, immutable page revisions and the page-save API.
Returning referenced asset IDs from a pure validator does not establish ownership.
Full core widget renderer/interaction parity, a native WordPress plugin, connected
authority, release dependency fingerprints, general migration chains and the full
legacy feature migration matrix remain outstanding. Preserved widgets cannot be
advertised as editable, renderable or interactive merely because they round-trip.

The supplied DOCX refers to a companion engineering pack that is still absent.
The schema here is an implemented repository contract derived from the blueprint,
not a claim to have validated or copied that unavailable pack.
