# Audit

Record activity used for review and operational investigation.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [audit.service.ts](audit.service.ts) | Audit: business operations and coordination with persistence or external services. File responsibility: audit service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
