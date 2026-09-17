# Revisions

Read and store document revision history.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [revision.controller.ts](revision.controller.ts) | Revisions: HTTP handlers that translate requests into module operations and responses. File responsibility: revision controller. |
| [revision.service.ts](revision.service.ts) | Revisions: business operations and coordination with persistence or external services. File responsibility: revision service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
