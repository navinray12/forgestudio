# Multisite

Manage the existing multisite operations.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [multisite.controller.ts](multisite.controller.ts) | Multisite: HTTP handlers that translate requests into module operations and responses. File responsibility: multisite controller. |
| [multisite.routes.ts](multisite.routes.ts) | Multisite: HTTP route registration and middleware order. File responsibility: multisite routes. |
| [multisite.service.ts](multisite.service.ts) | Multisite: business operations and coordination with persistence or external services. File responsibility: multisite service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
