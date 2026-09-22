# Api Keys

Issue, list and revoke API credentials for integrations.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [api-key.service.ts](api-key.service.ts) | Api keys: business operations and coordination with persistence or external services. File responsibility: api key service. |
| [api-keys.controller.ts](api-keys.controller.ts) | Api keys: HTTP handlers that translate requests into module operations and responses. File responsibility: api keys controller. |
| [api-keys.routes.ts](api-keys.routes.ts) | Api keys: HTTP route registration and middleware order. File responsibility: api keys routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
