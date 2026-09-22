# Integrations

Manage configured external service connections.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [integration.controller.ts](integration.controller.ts) | Integrations: HTTP handlers that translate requests into module operations and responses. File responsibility: integration controller. |
| [integration.routes.ts](integration.routes.ts) | Integrations: HTTP route registration and middleware order. File responsibility: integration routes. |
| [integration.service.ts](integration.service.ts) | Integrations: business operations and coordination with persistence or external services. File responsibility: integration service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
